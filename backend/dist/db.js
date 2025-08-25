"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.addOrUpdateUser = addOrUpdateUser;
exports.logAnalytics = logAnalytics;
exports.getAnalyticsSummary = getAnalyticsSummary;
exports.getUsers = getUsers;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.join(__dirname, '../../aldeia.db');
const db = new sqlite3_1.default.Database(dbPath);
function initDb() {
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
function addOrUpdateUser(profile, cb) {
    if (!profile.email)
        return cb(new Error('Email required for user record'));
    db.get('SELECT id FROM users WHERE email = ?', [profile.email], (err, row) => {
        if (err)
            return cb(err);
        if (row) {
            db.run('UPDATE users SET name=?, county=?, language=? WHERE id=?', [profile.name, profile.county, profile.language, row.id], (err2) => {
                cb(err2, row.id);
            });
        }
        else {
            db.run('INSERT INTO users (name, county, email, language) VALUES (?, ?, ?, ?)', [profile.name, profile.county, profile.email, profile.language], function (err2) {
                // @ts-ignore
                cb(err2, this === null || this === void 0 ? void 0 : this.lastID);
            });
        }
    });
}
function logAnalytics(event, cb) {
    db.run('INSERT INTO analytics (user_id, conversation_id, event_type, message, meta) VALUES (?, ?, ?, ?, ?)', [event.user_id || null, event.conversation_id || null, event.event_type, event.message || null, event.meta ? JSON.stringify(event.meta) : null], cb || (() => { }));
}
function getAnalyticsSummary(cb) {
    db.all('SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type', [], (err, rows) => {
        if (err)
            return cb(err);
        cb(null, rows);
    });
}
function getUsers(cb) {
    db.all('SELECT * FROM users ORDER BY created_at DESC', [], cb);
}
