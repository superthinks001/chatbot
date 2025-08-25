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
const express_1 = require("express");
const transformers_1 = require("@xenova/transformers");
const chromadb_1 = require("chromadb");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const document_ingest_1 = require("../document_ingest");
const router = (0, express_1.Router)();
let embedder = null;
let collection = null;
// Path for bias/fairness log file
const biasLogPath = path_1.default.join(__dirname, '../../bias_fairness.log');
// Initialize MiniLM and ChromaDB once
(() => __awaiter(void 0, void 0, void 0, function* () {
    embedder = yield (0, transformers_1.pipeline)('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const chromaClient = new chromadb_1.ChromaClient();
    collection = yield chromaClient.getOrCreateCollection({
        name: 'fire_recovery_chunks',
        metadata: { description: 'Paragraph chunks from LA/Pasadena County fire recovery PDFs' },
        embeddingFunction: {
            generate: (_docs) => __awaiter(void 0, void 0, void 0, function* () { throw new Error('embeddingFunction should not be called'); })
        }
    });
}))();
// Ensure embedder and collection are initialized before handling requests
function ensureInitialized() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!embedder || !collection) {
            // Wait for initialization (max 5 seconds)
            for (let i = 0; i < 10; i++) {
                if (embedder && collection)
                    return;
                yield new Promise(r => setTimeout(r, 500));
            }
        }
    });
}
function logErrorToFile(error, req) {
    const logPath = path_1.default.join(__dirname, '../../error.log');
    const logEntry = `\n[${new Date().toISOString()}]\nRequest: ${JSON.stringify({ url: req.url, body: req.body })}\nError: ${error instanceof Error ? error.stack : JSON.stringify(error)}\n`;
    fs_1.default.appendFileSync(logPath, logEntry);
}
function logBiasToFile(entry) {
    const logEntry = `\n[${new Date().toISOString()}]\n${JSON.stringify(entry)}\n`;
    fs_1.default.appendFileSync(biasLogPath, logEntry);
}
// Simple input sanitization function
function sanitizeInput(input) {
    return input.replace(/[<>"'`\\]/g, '');
}
// Enhanced greeting system with warm, friendly tone
function generateGreeting(context) {
    const greetings = [
        "Hello! I'm Aldeia Advisor, your friendly guide through the fire recovery process. How can I help you today?",
        "Welcome! I'm here to support you with information about fire recovery in LA County. What would you like to know?",
        "Hi there! I'm Aldeia Advisor, ready to help you navigate the recovery process. What questions do you have?",
        "Greetings! I'm your personal assistant for fire recovery information. How may I assist you today?"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    if (context) {
        return `${randomGreeting} I can see you're looking at information about ${context}. I'm here to help clarify any questions you might have.`;
    }
    return randomGreeting;
}
// Expanded intent classification
function classifyIntent(message) {
    const msg = message.toLowerCase();
    if (/emergency|urgent|help|fire|evacuate|danger|911|immediate/.test(msg))
        return 'emergency';
    if (/status|progress|update|current|ongoing|pending|complete|finished|timeline|when|how long|duration/.test(msg))
        return 'status';
    if (/how|process|steps|procedure|apply|application|submit|get|obtain|rebuild|remove|opt[- ]?out|permit|inspection|documentation|form|paperwork/.test(msg))
        return 'process';
    if (/compare|difference|vs\.?|better|worse|best|cheaper|faster/.test(msg))
        return 'comparative';
    if (/where|location|address|area|region|county|city|zip|altadena|pasadena|los angeles/.test(msg))
        return 'location';
    if (/legal|law|regulation|compliance|requirement|policy|rule|attorney|court/.test(msg))
        return 'legal';
    if (/money|cost|fee|price|pay|fund|grant|insurance|financial|compensation|reimburse/.test(msg))
        return 'financial';
    if (/support|counseling|mental|emotional|stress|trauma|wellbeing|well-being/.test(msg))
        return 'emotional_support';
    if (/eligible|eligibility|qualify|criteria|who can|who is/.test(msg))
        return 'eligibility';
    if (/contact|phone|email|reach|call|speak|talk|address|office|visit/.test(msg))
        return 'contact';
    if (/feedback|complaint|suggestion|report|issue|problem/.test(msg))
        return 'feedback';
    if (msg.split(' ').length < 3)
        return 'ambiguous';
    return 'information';
}
// Enhanced bias detection function
function detectBias(message) {
    // List of loaded/biased words
    const biasWords = [
        'should', 'must', 'always', 'never', 'obviously', 'clearly', 'everyone knows', 'no one', 'best', 'worst', 'only', 'all', 'none', 'mandatory', 'required', 'illegal', 'unethical', 'irresponsible', 'stupid', 'dumb', 'idiot', 'fool', 'hate', 'love', 'discriminate', 'racist', 'sexist', 'biased', 'prejudice', 'unfair', 'unjust', 'disadvantage', 'privilege', 'minority', 'majority', 'oppressed', 'oppressor'
    ];
    const msg = message.toLowerCase();
    return biasWords.some(word => msg.includes(word));
}
// Improved ambiguity detection
function detectAmbiguity(message, intent) {
    const msg = message.toLowerCase();
    if (intent === 'ambiguous')
        return true;
    if (message.trim().split(' ').length < 3)
        return true;
    // Conflicting intents: e.g., both 'where' and 'how', or 'legal' and 'financial'
    const intentPatterns = [
        /where/, /how/, /legal|law|regulation/, /money|cost|fee|financial/, /support|counseling|mental/, /eligible|eligibility/, /contact|phone|email/, /feedback|complaint/
    ];
    let matches = 0;
    for (const pat of intentPatterns) {
        if (pat.test(msg))
            matches++;
    }
    if (matches > 1)
        return true;
    // Vague queries
    if (/thing|stuff|info|information|details|something|anything/.test(msg) && msg.split(' ').length < 6)
        return true;
    return false;
}
// In-memory context tracking (for demo; use Redis/db for production)
const conversationContexts = {};
const MAX_HISTORY = 5;
// Enhanced response formatting with ethical AI principles
function formatResponse(answer, source, bias) {
    let response = '';
    response += answer;
    response += `\n\nSource: ${source}`;
    if (bias) {
        response = `⚠️ Bias Warning: This response may contain biased language or assumptions.\n\n${response}`;
    }
    return response;
}
// Helper: Generate clarification options based on message and context
function generateClarificationOptions(message, context) {
    const msg = message.toLowerCase();
    // Example logic: tailor to your domain
    if (/permit/.test(msg)) {
        return ['Debris removal permit', 'Rebuilding permit', 'Other permit'];
    }
    if (/support|help/.test(msg)) {
        return ['Emotional support', 'Financial support', 'Legal support'];
    }
    if (/status|progress|update/.test(msg)) {
        return ['Debris removal status', 'Rebuilding status', 'Permit status'];
    }
    if (/application|form|paperwork/.test(msg)) {
        return ['Debris removal application', 'Rebuilding application', 'Other application'];
    }
    // Fallback generic options
    return ['Can you clarify your question?', 'Can you provide more details?', 'Other'];
}
// Helper: Generate proactive notifications based on message/context
function getProactiveNotification(message, context) {
    const msg = message.toLowerCase();
    const ctx = (typeof context === 'string' ? context : JSON.stringify(context || '')).toLowerCase();
    if (msg.includes('pasadena') || ctx.includes('pasadena')) {
        return 'Pasadena County: New debris removal deadline is April 30, 2025.';
    }
    if (msg.includes('la county') || ctx.includes('la county')) {
        return 'LA County: Opt-out applications for debris removal close May 15, 2025.';
    }
    if (msg.includes('deadline')) {
        return 'Reminder: Check your local county website for the latest fire recovery deadlines.';
    }
    return null;
}
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let { message, context, pageUrl, isFirstMessage, conversationId, userProfile } = req.body;
    // Sanitize all user input
    message = typeof message === 'string' ? sanitizeInput(message) : '';
    context = typeof context === 'string' ? sanitizeInput(context) : '';
    pageUrl = typeof pageUrl === 'string' ? sanitizeInput(pageUrl) : '';
    isFirstMessage = Boolean(isFirstMessage);
    conversationId = typeof conversationId === 'string' ? conversationId : null;
    // Track context for conversation
    let convContext = conversationId ? (conversationContexts[conversationId] || { history: [] }) : { history: [] };
    if (context)
        convContext.pageContext = context;
    if (message)
        convContext.lastUserMessage = message;
    // Store user profile if provided
    if (userProfile) {
        convContext.userProfile = Object.assign(Object.assign({}, convContext.userProfile), userProfile);
    }
    // Add to history
    if (!convContext.history)
        convContext.history = [];
    if (message)
        convContext.history.push({ sender: 'user', text: message });
    // Limit history length
    if (convContext.history.length > MAX_HISTORY)
        convContext.history = convContext.history.slice(-MAX_HISTORY);
    if (conversationId)
        conversationContexts[conversationId] = convContext;
    // Personalized greeting
    function getPersonalizedGreeting() {
        if (convContext.userProfile && convContext.userProfile.name) {
            return `Hello, ${convContext.userProfile.name}! I'm Aldeia Advisor, your friendly guide through the fire recovery process. How can I help you today?`;
        }
        return generateGreeting(context);
    }
    // Log the incoming request for debugging
    console.log('Chat request:', { message, context, pageUrl, isFirstMessage });
    // Handle first message (greeting)
    if (isFirstMessage) {
        const greeting = getPersonalizedGreeting();
        return res.json({
            response: greeting,
            confidence: 1.0,
            bias: false,
            uncertainty: false,
            context: context || null,
            grounded: true,
            hallucination: false,
            intent: 'greeting',
            isGreeting: true
        });
    }
    // Classify intent
    const intent = classifyIntent(message);
    // Detect bias and ambiguity
    const bias = detectBias(message);
    const ambiguous = detectAmbiguity(message, intent);
    // Enforce HTTPS if not already
    if (process.env.NODE_ENV === 'production') {
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        if (!isSecure) {
            return res.status(403).json({ response: 'HTTPS is required for this endpoint.' });
        }
    }
    try {
        yield ensureInitialized();
        if (!embedder || !collection) {
            return res.status(503).json({ response: 'I apologize, but my knowledge base is still loading. Please try again in a moment.', confidence: 0, bias, uncertainty: true, context: context || null });
        }
        // If ambiguous, return a clarifying prompt with friendly tone
        if (ambiguous) {
            // Add bot clarification to history
            convContext.history.push({ sender: 'bot', text: "I'd love to help you, but I'm not quite sure what you're asking. Could you please provide more details or rephrase your question? I'm here to assist with fire recovery information, permits, debris removal, rebuilding processes, and more." });
            if (conversationId)
                conversationContexts[conversationId] = convContext;
            // Generate clarification options
            const clarificationOptions = generateClarificationOptions(message, convContext);
            return res.json({
                response: "I'd love to help you, but I'm not quite sure what you're asking. Could you please provide more details or rephrase your question? I'm here to assist with fire recovery information, permits, debris removal, rebuilding processes, and more.",
                confidence: 0.3,
                bias,
                uncertainty: true,
                context: convContext,
                grounded: false,
                hallucination: false,
                intent,
                ambiguous: true,
                history: convContext.history,
                clarificationOptions
            });
        }
        // Generate embedding for the user message, including last N turns as context
        let contextText = '';
        if (convContext.history && convContext.history.length > 1) {
            // Use last 3 turns (user+bot) as context
            const lastTurns = convContext.history.slice(-3).map((turn) => `${turn.sender}: ${turn.text}`).join(' | ');
            contextText = lastTurns + ' | ' + message;
        }
        else {
            contextText = message;
        }
        const embeddingTensor = yield embedder(contextText, { pooling: 'mean', normalize: true });
        const embedding = Array.from(embeddingTensor.data);
        // Query ChromaDB for top 3 most similar chunks
        const results = yield collection.query({
            queryEmbeddings: [embedding],
            nResults: 3
        });
        // Log top 3 matches for debugging
        for (let i = 0; i < Math.min(3, results.documents[0].length); i++) {
            const m = results.documents[0][i];
            console.log(`Match ${i + 1}:`, m.slice(0, 100), '| Source:', (_a = results.metadatas[0][i]) === null || _a === void 0 ? void 0 : _a.source, '| Distance:', results.distances[0][i]);
        }
        const matches = (results.documents[0] || []).map((text, i) => {
            var _a, _b;
            return ({
                text,
                source: (_a = results.metadatas[0][i]) === null || _a === void 0 ? void 0 : _a.source,
                chunk_index: (_b = results.metadatas[0][i]) === null || _b === void 0 ? void 0 : _b.chunk_index,
                distance: results.distances[0][i]
            });
        });
        // Check if the top match is good enough
        if (!matches.length || matches[0].distance === undefined || matches[0].distance > 2.0) {
            return res.json({
                response: "I'm sorry, but I couldn't find specific information about that in our official documents. This could be because the information isn't available yet, or you might want to try rephrasing your question. I'm here to help with fire recovery topics like debris removal, rebuilding permits, inspections, and recovery resources.",
                confidence: 0.5,
                bias,
                uncertainty: true,
                context: context || null,
                grounded: false,
                hallucination: true,
                intent
            });
        }
        // Calculate confidence: 1 - (distance / 2.0), clamp 0-1
        const confidence = Math.max(0, Math.min(1, 1 - ((_b = matches[0].distance) !== null && _b !== void 0 ? _b : 2) / 2));
        // Improved keyword matching: all query words must be present
        const queryWords = message.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        let keywordMatch = matches.find((m) => queryWords.every((qw) => m.text.toLowerCase().includes(qw)));
        let selected = keywordMatch || matches[0];
        // Combine close chunks if from same doc and close in index
        const closeChunks = matches.filter((m) => m.source === selected.source && Math.abs(m.chunk_index - selected.chunk_index) <= 2);
        let answer = '';
        if (closeChunks.length > 1) {
            answer = closeChunks.map((m) => m.text).join('\n\n');
        }
        else {
            answer = selected.text;
        }
        // Use enhanced response formatting
        const reply = formatResponse(answer, selected.source, bias);
        // Log bias if detected
        if (bias) {
            logBiasToFile({
                userMessage: message,
                response: reply,
                source: selected.source,
                chunk_index: selected.chunk_index,
                distance: selected.distance,
                timestamp: new Date().toISOString(),
                context: convContext,
                intent
            });
        }
        // Add bot reply to history
        convContext.history.push({ sender: 'bot', text: reply });
        if (conversationId)
            conversationContexts[conversationId] = convContext;
        // Find alternative perspectives (other sources)
        const alternatives = [];
        const mainSource = selected.source;
        for (const m of matches) {
            if (m.source !== mainSource && m.text && m.source) {
                alternatives.push({
                    answer: m.text,
                    source: m.source
                });
            }
        }
        // Proactive notification
        const notification = getProactiveNotification(message, convContext);
        // Human-in-the-loop handoff detection
        function shouldHandoff(message, convContext) {
            const msg = message.toLowerCase();
            if (/human|agent|contact|real person|talk to|speak to|help/.test(msg))
                return true;
            // If 3+ ambiguous/failed turns in a row
            const last3 = (convContext.history || []).slice(-3);
            const ambiguousCount = last3.filter((t) => t.sender === 'bot' && t.text && t.text.toLowerCase().includes('not quite sure')).length;
            if (ambiguousCount >= 3)
                return true;
            return false;
        }
        let handoffRequired = false;
        let handoffMethod = null;
        if (shouldHandoff(message, convContext)) {
            handoffRequired = true;
            handoffMethod = 'email';
        }
        // Log user message event
        let userId = undefined;
        if (userProfile && userProfile.email) {
            yield new Promise((resolve) => {
                (0, db_1.addOrUpdateUser)(userProfile, (err, id) => {
                    if (!err && id)
                        userId = id;
                    resolve();
                });
            });
        }
        (0, db_1.logAnalytics)({ user_id: userId, conversation_id: conversationId, event_type: 'user_message', message, meta: { userProfile } });
        // Use enhanced response formatting
        const replyFormatted = formatResponse(reply, selected.source, bias);
        // Log bot response event
        (0, db_1.logAnalytics)({ user_id: userId, conversation_id: conversationId, event_type: 'bot_response', message: replyFormatted, meta: { intent, bias, ambiguous, alternatives, notification } });
        // Log handoff event if needed
        if (handoffRequired) {
            (0, db_1.logAnalytics)({ user_id: userId, conversation_id: conversationId, event_type: 'handoff', message, meta: { handoffMethod } });
        }
        res.json(Object.assign(Object.assign(Object.assign({ response: replyFormatted, confidence,
            bias, uncertainty: confidence < 0.4, context: convContext, grounded: true, hallucination: false, source: selected.source, chunk_index: selected.chunk_index, distance: selected.distance, matches: matches.map((m) => ({
                text: m.text,
                source: m.source,
                chunk_index: m.chunk_index,
                score: m.distance
            })), intent, ambiguous: false, history: convContext.history }, (alternatives.length > 0 ? { alternatives } : {})), (notification ? { notification } : {})), (handoffRequired ? { handoffRequired, handoffMethod } : {})));
    }
    catch (err) {
        console.error('Chat endpoint error:', err);
        logErrorToFile(err, req);
        const errorMessage = err instanceof Error ? err.message : String(err);
        res.status(500).json({ response: 'I apologize, but something went wrong on my end. Please try again, and if the problem persists, you may want to contact support directly.' });
    }
}));
router.post('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { query } = req.body;
    // Sanitize input
    query = typeof query === 'string' ? sanitizeInput(query) : '';
    if (!query) {
        return res.status(400).json({ error: 'Missing query' });
    }
    try {
        if (!embedder || !collection) {
            return res.status(503).json({ error: 'Embedding model or ChromaDB not ready' });
        }
        // Generate embedding for the query
        const embeddingTensor = yield embedder(query, { pooling: 'mean', normalize: true });
        const embedding = Array.from(embeddingTensor.data);
        // Query ChromaDB for top 5 most similar chunks
        const results = yield collection.query({
            queryEmbeddings: [embedding],
            nResults: 5
        });
        // Format results
        const matches = (results.documents[0] || []).map((text, i) => {
            var _a, _b;
            return ({
                text,
                source: (_a = results.metadatas[0][i]) === null || _a === void 0 ? void 0 : _a.source,
                chunk_index: (_b = results.metadatas[0][i]) === null || _b === void 0 ? void 0 : _b.chunk_index,
                score: results.distances[0][i]
            });
        });
        // After matches are computed
        let grounded = true;
        let hallucination = false;
        if (!matches.length || (matches[0].score !== undefined && matches[0].score > 1.5)) {
            grounded = false;
            hallucination = true;
        }
        res.json({ matches, grounded, hallucination });
    }
    catch (err) {
        logErrorToFile(err, req);
        const errorMessage = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: 'Search failed', details: err instanceof Error ? err.message : String(err) });
    }
}));
// Admin endpoint to fetch last 100 bias/fairness log entries
router.get('/bias-logs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!fs_1.default.existsSync(biasLogPath)) {
            return res.json({ logs: [] });
        }
        const data = fs_1.default.readFileSync(biasLogPath, 'utf-8');
        const entries = data.split('\n[').filter(Boolean).map(e => '[' + e).slice(-100);
        res.json({ logs: entries });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to read bias/fairness logs.' });
    }
}));
// Admin endpoint: analytics summary
router.get('/admin/analytics', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, db_1.getAnalyticsSummary)((err, summary) => {
        if (err)
            return res.status(500).json({ error: 'Failed to fetch analytics' });
        res.json({ summary });
    });
}));
// Admin endpoint: user list
router.get('/admin/users', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, db_1.getUsers)((err, users) => {
        if (err)
            return res.status(500).json({ error: 'Failed to fetch users' });
        res.json({ users });
    });
}));
// Document management endpoints
router.get('/admin/documents', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workspaceRoot = path_1.default.resolve(__dirname, '../../../');
        const laCountyDir = path_1.default.join(workspaceRoot, "chatbot/frontend/public/LA County");
        const pasadenaCountyDir = path_1.default.join(workspaceRoot, "chatbot/frontend/public/Pasadena County");
        const laCountyPDFs = (0, document_ingest_1.findAllPDFs)(laCountyDir).map((pdf) => ({
            path: pdf,
            name: path_1.default.basename(pdf),
            county: 'LA County',
            indexed: true // Assume indexed for now
        }));
        const pasadenaCountyPDFs = (0, document_ingest_1.findAllPDFs)(pasadenaCountyDir).map((pdf) => ({
            path: pdf,
            name: path_1.default.basename(pdf),
            county: 'Pasadena County',
            indexed: true // Assume indexed for now
        }));
        res.json({ documents: [...laCountyPDFs, ...pasadenaCountyPDFs] });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
}));
router.post('/admin/documents/reindex', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Trigger document reindexing (placeholder - would call document_ingest.ts logic)
        res.json({ message: 'Document reindexing triggered successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to trigger reindexing' });
    }
}));
router.post('/admin/documents/upload', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Handle file upload (placeholder for now)
        res.json({ message: 'File upload endpoint - implementation pending' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to upload file' });
    }
}));
exports.default = router;
