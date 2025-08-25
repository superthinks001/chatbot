import sqlite3 from 'sqlite3';
import type { RunResult } from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../aldeia.db');
const db = new sqlite3.Database(dbPath);

export function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      county TEXT,
      email TEXT,
      language TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      conversation_id TEXT,
      event_type TEXT,
      message TEXT,
      meta TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

export function addOrUpdateUser(profile: { name?: string; county?: string; email?: string; language?: string }, cb: (err: Error | null, userId?: number) => void) {
  if (!profile.email) return cb(new Error('Email required for user record'));
  db.get('SELECT id FROM users WHERE email = ?', [profile.email], (err: Error | null, row: any) => {
    if (err) return cb(err);
    if (row) {
      db.run('UPDATE users SET name=?, county=?, language=? WHERE id=?', [profile.name, profile.county, profile.language, row.id], (err2: Error | null) => {
        cb(err2, row.id);
      });
    } else {
      db.run('INSERT INTO users (name, county, email, language) VALUES (?, ?, ?, ?)', [profile.name, profile.county, profile.email, profile.language], function (this: RunResult, err2: Error | null) {
        // @ts-ignore
        cb(err2, this?.lastID);
      });
    }
  });
}

export function logAnalytics(event: { user_id?: number; conversation_id?: string; event_type: string; message?: string; meta?: any }, cb?: (err: Error | null) => void) {
  db.run('INSERT INTO analytics (user_id, conversation_id, event_type, message, meta) VALUES (?, ?, ?, ?, ?)', [event.user_id || null, event.conversation_id || null, event.event_type, event.message || null, event.meta ? JSON.stringify(event.meta) : null], cb || (() => {}));
}

export function getAnalyticsSummary(cb: (err: Error | null, summary?: any) => void) {
  db.all('SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type', [], (err: Error | null, rows: any[]) => {
    if (err) return cb(err);
    cb(null, rows);
  });
}

export function getUsers(cb: (err: Error | null, users?: any[]) => void) {
  db.all('SELECT * FROM users ORDER BY created_at DESC', [], cb);
} 