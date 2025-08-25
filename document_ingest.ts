import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';

// Use the workspace root (two levels up from backend/src)
const workspaceRoot = path.resolve(__dirname, '../../../');
const laCountyDir = path.join(workspaceRoot, "Chatbot FAQ's/LA County");
const pasadenaCountyDir = path.join(workspaceRoot, "Chatbot FAQ's/Pasadena County");

function findAllPDFs(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findAllPDFs(filePath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(filePath);
    }
  }
  return results;
}

async function extractTextFromPDF(pdfPath: string) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

function chunkByParagraph(text: string): string[] {
  // Split on two or more newlines, trim, and filter out empty chunks
  return text.split(/\n{2,}/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
}

(async () => {
  // Initialize MiniLM embedding pipeline
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Initialize ChromaDB client and collection
  const chromaClient = new ChromaClient();
  const collection = await chromaClient.getOrCreateCollection({
    name: 'fire_recovery_chunks',
    metadata: { description: 'Paragraph chunks from LA/Pasadena County fire recovery PDFs' },
    embeddingFunction: {
      generate: async (_docs: string[]) => { throw new Error('embeddingFunction should not be called'); }
    }
  });

  const allPDFs = [
    ...findAllPDFs(laCountyDir),
    ...findAllPDFs(pasadenaCountyDir)
  ];
  console.log(`Found ${allPDFs.length} PDF files.`);
  let sampleData = [];
  for (const file of allPDFs) {
    try {
      const text = await extractTextFromPDF(file);
      const chunks = chunkByParagraph(text);
      console.log(`\n--- ${path.basename(file)}: ${chunks.length} chunks ---`);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        // Generate embedding
        const embeddingTensor = await embedder(chunk, { pooling: 'mean', normalize: true });
        const embedding = Array.from(embeddingTensor.data); // Convert Float32Array to number[]
        // Store in ChromaDB
        await collection.add({
          ids: [`${path.basename(file)}_${i}`],
          embeddings: [embedding],
          documents: [chunk],
          metadatas: [{ source: path.basename(file), chunk_index: i }]
        });
        // Save a sample for review
        if (sampleData.length < 5) {
          sampleData.push({
            source: path.basename(file),
            chunk_index: i,
            text: chunk.slice(0, 300),
            embedding: embedding.slice(0, 5) // Only show first 5 dims for brevity
          });
        }
      }
    } catch (err) {
      console.error(`Failed to extract ${file}:`, err);
    }
  }
  // Save sample data to disk
  fs.writeFileSync(path.join(workspaceRoot, 'embedding_sample.json'), JSON.stringify(sampleData, null, 2));
  console.log('Sample embedding data saved to embedding_sample.json');
})(); 