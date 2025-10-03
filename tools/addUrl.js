const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const configPath = path.join(__dirname, '..', 'db', 'config',);
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.dbName);
const db = new Database(dbPath);

function addUrls(urls) {
  const insert = db.prepare('INSERT OR IGNORE INTO posts (url) VALUES (?)');

  let count = 0;

  if (!Array.isArray(urls)) urls = [urls];

  for (const url of urls) {
    try {
      const info = insert.run(url);
      if (info.changes > 0) count++;
    } catch (err) {
      console.error('DB insert error:', err.message);
    }
  }

  console.log(`✅ ${count} 件のURLを追加しました`);
}

addUrls([
  'https://x.com/adachirei0/status/1835995869566599489'
]);

db.close();
