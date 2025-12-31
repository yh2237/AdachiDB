const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'counts.db');
const db = new Database(dbPath);

const upsertStmt = db.prepare(
  `INSERT INTO access_counts (endpoint, count) VALUES (?, 1)
  ON CONFLICT(endpoint) DO UPDATE SET count = count + 1`
);

function trackAccess(endpoint) {
  try {
    upsertStmt.run(endpoint);
  } catch (err) {
    console.error(`[ERROR] [statsTracker] Failed to track access for ${endpoint}:`, err.message);
  }
}

function getStats() {
    try {
        return db.prepare('SELECT * FROM access_counts ORDER BY count DESC').all();
    } catch (err) {
        console.error(`[ERROR] [statsTracker] Failed to get stats:`, err.message);
        return [];
    }
}

module.exports = { trackAccess, getStats };
