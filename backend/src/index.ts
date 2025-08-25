import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import https from 'https';
import chatRouter from './routes/chat';
import type { Request, Response, NextFunction } from 'express';
import { initDb } from './db';

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// Security headers
app.use(helmet());

// CORS with env-based origin
app.use(cors({
  origin: ORIGIN,
  credentials: true
}));

app.use(express.json());

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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  fs.appendFileSync('error.log', `${new Date().toISOString()} - ${err.stack}\n`);
  res.status(500).json({ error: 'Internal server error' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/chat', chatRouter);

// HTTPS server for local development (optional)
if (process.env.LOCAL_HTTPS === 'true') {
  const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  };
  https.createServer(options, app).listen(PORT, () => {
    console.log('HTTPS server running on port ' + PORT);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

initDb();
