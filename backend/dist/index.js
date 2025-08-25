"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const chat_1 = __importDefault(require("./routes/chat"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
// Security headers
app.use((0, helmet_1.default)());
// CORS with env-based origin
app.use((0, cors_1.default)({
    origin: ORIGIN,
    credentials: true
}));
app.use(express_1.default.json());
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect('https://' + req.headers.host + req.url);
        }
        next();
    });
}
// Error logging middleware
app.use((err, req, res, next) => {
    fs_1.default.appendFileSync('error.log', `${new Date().toISOString()} - ${err.stack}\n`);
    res.status(500).json({ error: 'Internal server error' });
});
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use('/api/chat', chat_1.default);
// HTTPS server for local development (optional)
if (process.env.LOCAL_HTTPS === 'true') {
    const options = {
        key: fs_1.default.readFileSync('server.key'),
        cert: fs_1.default.readFileSync('server.cert')
    };
    https_1.default.createServer(options, app).listen(PORT, () => {
        console.log('HTTPS server running on port ' + PORT);
    });
}
else {
    app.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT}`);
    });
}
(0, db_1.initDb)();
