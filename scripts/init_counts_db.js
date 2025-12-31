const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'counts.db');
const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS access_counts (
    endpoint TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  )
`).run();

console.log(`[INFO] [init_counts_db] 統計DBを初期化しました: ${dbPath}`);
db.close();
