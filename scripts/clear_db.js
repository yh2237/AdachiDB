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

const dbPath = path.join(__dirname, '..', 'db', config.database.dbName);

const db = new Database(dbPath);

const result = db.prepare('DELETE FROM posts').run();

console.log(`[INFO] [clear_db] リンクデータをクリアしました。削除件数: ${result.changes}`);
db.close();
