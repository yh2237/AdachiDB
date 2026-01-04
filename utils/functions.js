const Database = require('better-sqlite3');
const yaml = require('js-yaml');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.postsDB);
const db = new Database(dbPath);

const processingMap = new Map();

function getRandomPost() {
  return db.prepare('SELECT id, url, embed, text FROM posts ORDER BY RANDOM() LIMIT 1').get();
}

async function fetchEmbed(post) {
  if (processingMap.has(post.id)) {
    return processingMap.get(post.id);
  }
  const promise = (async () => {
    try {
      const { data } = await axios.get('https://publish.twitter.com/oembed', {
        params: { url: post.url, lang: 'ja' },
        timeout: 5000
      });

      const textMatch = data.html.match(/<p lang="ja" dir="ltr">(.*?)<\/p>/s);
      const text = textMatch ? textMatch[1].replace(/<br>/g, '\n') : '';

      db.prepare('UPDATE posts SET embed = ?, text = ? WHERE id = ?').run(data.html, text, post.id);

      return { id: post.id, url: post.url, embed: data.html, text };
    } catch (err) {
      console.error(`[ERROR] oEmbed failed for ${post.url}:`, err.message);
      throw new Error('Failed to fetch oEmbed');
    } finally {
      processingMap.delete(post.id);
    }
  })();

  processingMap.set(post.id, promise);
  return promise;
}

module.exports = { getRandomPost, fetchEmbed };