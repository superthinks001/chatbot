"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllPDFs = findAllPDFs;
exports.extractTextFromPDF = extractTextFromPDF;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const transformers_1 = require("@xenova/transformers");
const chromadb_1 = require("chromadb");
// Use the workspace root (two levels up from backend/src)
const workspaceRoot = path_1.default.resolve(__dirname, '../../../');
const laCountyDir = path_1.default.join(workspaceRoot, "chatbot/frontend/public/LA County");
const pasadenaCountyDir = path_1.default.join(workspaceRoot, "chatbot/frontend/public/Pasadena County");
function findAllPDFs(dir) {
    let results = [];
    const list = fs_1.default.readdirSync(dir);
    for (const file of list) {
        const filePath = path_1.default.join(dir, file);
        const stat = fs_1.default.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findAllPDFs(filePath));
        }
        else if (file.toLowerCase().endsWith('.pdf')) {
            results.push(filePath);
        }
    }
    return results;
}
function extractTextFromPDF(pdfPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const dataBuffer = fs_1.default.readFileSync(pdfPath);
        const data = yield (0, pdf_parse_1.default)(dataBuffer);
        return data.text;
    });
}
function chunkByParagraph(text) {
    // Split on two or more newlines, trim, and filter out empty chunks
    return text.split(/\n{2,}/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    // Initialize MiniLM embedding pipeline
    const embedder = yield (0, transformers_1.pipeline)('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    // Initialize ChromaDB client and collection
    const chromaClient = new chromadb_1.ChromaClient();
    const collection = yield chromaClient.getOrCreateCollection({
        name: 'fire_recovery_chunks',
        metadata: { description: 'Paragraph chunks from LA/Pasadena County fire recovery PDFs' },
        embeddingFunction: {
            generate: (_docs) => __awaiter(void 0, void 0, void 0, function* () { throw new Error('embeddingFunction should not be called'); })
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
            const text = yield extractTextFromPDF(file);
            const chunks = chunkByParagraph(text);
            console.log(`\n--- ${path_1.default.basename(file)}: ${chunks.length} chunks ---`);
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                // Generate embedding
                const embeddingTensor = yield embedder(chunk, { pooling: 'mean', normalize: true });
                const embedding = Array.from(embeddingTensor.data); // Convert Float32Array to number[]
                // Store in ChromaDB
                yield collection.add({
                    ids: [`${path_1.default.basename(file)}_${i}`],
                    embeddings: [embedding],
                    documents: [chunk],
                    metadatas: [{ source: path_1.default.basename(file), chunk_index: i }]
                });
                // Save a sample for review
                if (sampleData.length < 5) {
                    sampleData.push({
                        source: path_1.default.basename(file),
                        chunk_index: i,
                        text: chunk.slice(0, 300),
                        embedding: embedding.slice(0, 5) // Only show first 5 dims for brevity
                    });
                }
            }
        }
        catch (err) {
            console.error(`Failed to extract ${file}:`, err);
        }
    }
    // Save sample data to disk
    fs_1.default.writeFileSync(path_1.default.join(workspaceRoot, 'embedding_sample.json'), JSON.stringify(sampleData, null, 2));
    console.log('Sample embedding data saved to embedding_sample.json');
}))();
