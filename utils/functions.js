const axios = require('axios');
const { postsDb: db } = require('./database');
const { extractTextFromEmbed } = require('./textExtractor');

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

      const text = extractTextFromEmbed(data.html);

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
