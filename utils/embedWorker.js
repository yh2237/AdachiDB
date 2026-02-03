const axios = require('axios');
const { postsDb: db } = require('./database');
const { extractTextFromEmbed } = require('./textExtractor');

async function processBatch() {
  const rows = db.prepare(
    "SELECT id, url FROM posts WHERE status = 'pending' LIMIT 10"
  ).all();

  if (rows.length === 0) return false;

  await Promise.all(rows.map(async (row) => {
    try {
      const { data } = await axios.get('https://publish.twitter.com/oembed', {
        params: { url: row.url, lang: 'ja' },
        timeout: 5000
      });

      const text = extractTextFromEmbed(data.html);

      db.prepare(
        'UPDATE posts SET embed = ?, text = ?, status = ? WHERE id = ?'
      ).run(data.html, text, 'ok', row.id);

      console.log(`[INFO] [EmbedWorker] ${row.url} の埋め込みデータを保存しました`);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log(`[INFO] [EmbedWorker] ${row.url} not found (404). Marking as not_found.`);
        db.prepare('UPDATE posts SET status = ? WHERE id = ?').run('not_found', row.id);
      } else {
        console.error(`[ERROR] [EmbedWorker] ${row.url}:`, err.message);
      }
    }
  }));

  return true;
}

async function main() {
  console.log('[INFO] [EmbedWorker] embedWorker 起動');
  while (true) {
    const processed = await processBatch();
    if (!processed) {
      console.log('[INFO] [EmbedWorker] 処理するデータがありません。');
      await new Promise(res => setTimeout(res, 10000));
    } else {
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

main();
