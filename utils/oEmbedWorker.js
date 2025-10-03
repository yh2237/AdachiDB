const axios = require('axios');
const Database = require('better-sqlite3');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.dbName);
const db = new Database(dbPath);

const updateEmbedTx = db.transaction((id, html) => {
  db.prepare('UPDATE posts SET embed = ? WHERE id = ?').run(html, id);
});

async function processOne() {
  const row = db.prepare(
    'SELECT id, url FROM posts WHERE embed IS NULL LIMIT 1'
  ).get();

  if (!row) return false;

  try {
    const { data } = await axios.get('https://publish.twitter.com/oembed', {
      params: { url: row.url },
      timeout: 5000
    });

    updateEmbedTx(row.id, data.html);

    console.log(`[INFO] [oEmbedWorker] ${row.url} の埋め込みデータを保存しました`);
  } catch (err) {
    console.error(`[ERROR] [oEmbedWorker] ${row.url}:`, err.message);
  }

  return true;
}

async function main() {
  console.log('[INFO] [oEmbedWorker] oEmbedWorker 起動');

  while (true) {
    const processed = await processOne();

    if (!processed) {
      console.log('[INFO] [oEmbedWorker] 処理するデータがありません。');
      await new Promise(res => setTimeout(res, 10 * 1000));
    } else {
      await new Promise(res => setTimeout(res, 100));
    }
  }
}

main();