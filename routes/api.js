const express = require('express');
const router = express.Router();
const { postsDb: db } = require('../utils/database');
const { getRandomPost, fetchEmbed } = require('../utils/functions');
const { getStats } = require('../utils/statsTracker');

const errorResponse = (res, status, message, logMessage = null) => {
  if (logMessage) {
    console.error(`[ERROR] ${logMessage}`);
  }
  return res.status(status).json({ error: message });
};

router.get('/posts/random', async (req, res) => {
  const post = getRandomPost();
  if (!post) {
    return errorResponse(res, 404, 'No posts available');
  }

  try {
    if (post.embed) {
      return res.json({ id: post.id, url: post.url, embed: post.embed, text: post.text });
    }

    const result = await fetchEmbed(post);
    return res.json(result);
  } catch (err) {
    return errorResponse(res, 500, 'Failed to fetch embed', `random: ${err.message}`);
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
      return errorResponse(res, 404, 'No posts available');
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
            text: null,
            error: 'oEmbed取得失敗'
          });
        }
      }
    }
    res.json(results);
  } catch (err) {
    return errorResponse(res, 500, 'Internal Server Error', `random10: ${err.message}`);
  }
});

router.get('/posts/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    return errorResponse(res, 400, 'Query parameter "q" is required');
  }

  let limit = parseInt(req.query.limit, 10) || 100;
  if (limit > 40000) {
    limit = 40000;
  }

  const from = req.query.from;
  const to = req.query.to;

  try {
    let sql = `
      SELECT id, url, embed, text, createdAt
      FROM posts
      WHERE text LIKE ?
    `;
    const params = [`%${query}%`];

    if (from) {
      sql += ` AND createdAt >= ?`;
      params.push(from);
    }

    if (to) {
      sql += ` AND createdAt <= ?`;
      params.push(to);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    return errorResponse(res, 500, 'Internal Server Error', `search: ${err.message}`);
  }
});

router.get('/posts/id', (req, res) => {
  const id = req.query.id;
  if (!id) {
    return errorResponse(res, 400, 'Query parameter "id" is required');
  }

  try {
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (row) {
      res.json(row);
    } else {
      return errorResponse(res, 404, 'Post not found');
    }
  } catch (err) {
    return errorResponse(res, 500, 'Internal Server Error', `id: ${err.message}`);
  }
});

router.get('/posts/all', (req, res) => {
  let limit = parseInt(req.query.limit, 10) || 200;
  if (limit > 40000) {
    limit = 40000;
  }

  try {
    const rows = db.prepare('SELECT id, url, embed, text, status, createdAt FROM posts ORDER BY id DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (err) {
    return errorResponse(res, 500, 'Internal Server Error', `all: ${err.message}`);
  }
});

router.get('/pending-count', (req, res) => {
  try {
    const row = db.prepare("SELECT COUNT(*) AS count FROM posts WHERE status = 'pending'").get();
    res.json({ pending: row.count });
  } catch (err) {
    return errorResponse(res, 500, 'DB query failed', `pending-count: ${err.message}`);
  }
});

router.get('/pending-text-count', (req, res) => {
  try {
    const row = db.prepare("SELECT COUNT(*) AS count FROM posts WHERE text IS NULL OR text = ''").get();
    res.json({ pendingText: row.count });
  } catch (err) {
    return errorResponse(res, 500, 'DB query failed', `pending-text-count: ${err.message}`);
  }
});

router.get('/uncreated-count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE createdAt IS NULL').get();
    res.json({ uncreated: row.count });
  } catch (err) {
    return errorResponse(res, 500, 'DB query failed', `uncreated-count: ${err.message}`);
  }
});

router.get('/status', (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (err) {
    return errorResponse(res, 500, 'Failed to get stats', `status: ${err.message}`);
  }
});

module.exports = router;
