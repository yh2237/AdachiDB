const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.dbName);
const db = new Database(dbPath);

function deleteUrl(url) {
  const stmt = db.prepare('DELETE FROM posts WHERE url = ?');
  const info = stmt.run(url);
  console.log(`Deleted ${info.changes} row(s) for URL: ${url}`);
}

const urlToDelete = process.argv[2];
if (!urlToDelete) {
  console.error('削除するURLを引数で指定してください。');
  process.exit(1);
}

deleteUrl(urlToDelete);

db.close();
