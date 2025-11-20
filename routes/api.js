const Database = require('better-sqlite3');
const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.dbName);
const db = new Database(dbPath);

const { getRandomPost, fetchEmbed } = require('../utils/functions');

router.get('/pending-count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE status = \'pending\'').get();
    res.json({ pending: row.count });
  } catch (err) {
    console.error('[ERROR] pending-count:', err.message);
    res.status(500).json({ error: 'DB query failed' });
  }
});

router.get('/posts/random', async (req, res) => {
  const post = getRandomPost();
  if (!post) return res.status(404).json({ error: 'No posts available (´・ω・｀)' });

  try {
    if (post.embed) {
      return res.json({ id: post.id, url: post.url, embed: post.embed, text: post.text });
    }

    const result = await fetchEmbed(post);
    return res.json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/posts/random10', async (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, url, embed, text
      FROM posts 
      ORDER BY RANDOM() 
      LIMIT 10
    `).all();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No posts available (´・ω・｀)' });
    }

    const results = [];

    for (const row of rows) {
      if (row.embed) {
        results.push(row);
      } else {
        try {
          const result = await fetchEmbed(row);
          results.push(result);
        } catch (err) {
          console.error(`[ERROR] fetchEmbed failed for ${row.url}:`, err.message);
          results.push({
            id: row.id,
            url: row.url,
            embed: null,
            error: 'oEmbed取得失敗'
          });
        }
      }
    }
    res.json(results);
  } catch (err) {
    console.error('[ERROR] random10:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/posts/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  let limit = parseInt(req.query.limit, 10) || 100;
  if (limit > 35630) {
    limit = 35630;
  }

  try {
    const rows = db.prepare(`SELECT id, url, embed, text FROM posts WHERE text LIKE ? ORDER BY id DESC LIMIT ?`).all(`%${query}%`, limit);
    res.json(rows);
  } catch (err) {
    console.error('[ERROR] search:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/posts/all', (req, res) => {
  let limit = parseInt(req.query.limit, 10) || 200;
  if (limit > 35630) {
    limit = 35630;
  }

  try {
    const rows = db.prepare('SELECT id, url, embed, text, status FROM posts ORDER BY id DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (err) {
    console.error('[ERROR] all:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/posts/id', (req, res) => {
  const id = req.query.id;
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
if (row) {
  res.json(row);
} else {
  console.error('[ERROR] id:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
}

})

router.get('/pending-text-count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE status = \'pending\'').get();
    res.json({ pending: row.count });
  } catch (err) {
    console.error('[ERROR] pending-text-count:', err.message);
    res.status(500).json({ error: 'DB query failed' });
  }
});

module.exports = router;