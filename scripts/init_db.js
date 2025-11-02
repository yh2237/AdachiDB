const Database = require('better-sqlite3');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dataDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, config.database.dbName);

const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE,
    embed TEXT,
    text TEXT,
    status TEXT DEFAULT 'pending'
  )
`).run();

console.log(`[INFO] [init_db] DBを初期化しました: ${dbPath}`);
db.close();