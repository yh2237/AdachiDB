const express = require('express');
const axios = require('axios');
const router = express.Router();
const { postsDb: pool } = require('../utils/database');
const { getRandomPost, fetchEmbed } = require('../utils/functions');
const { getStats } = require('../utils/statsTracker');
const { extractTextFromEmbed } = require('../utils/textExtractor');
const { snowflakeToDate } = require('../utils/snowflakeToDate');

const TWEET_URL_RE = /^https:\/\/(x\.com|twitter\.com)\/[^/]+\/status\/\d+$/;

function normalizeUrl(url) {
    const modified = url.replace('twitter.com', 'x.com');
    const u = new URL(modified);
    return `${u.origin}${u.pathname}`;
}

const errorResponse = (res, status, message, logMessage = null) => {
    if (logMessage) {
        console.error(`[ERROR] ${logMessage}`);
    }
    return res.status(status).json({ error: message });
};

router.get('/posts/random', async (req, res) => {
    try {
        const post = await getRandomPost();
        if (!post) {
            return errorResponse(res, 404, 'No posts available');
        }

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
        const { rows } = await pool.query(`
            SELECT id, url, embed, text
            FROM posts
            ORDER BY RANDOM()
            LIMIT 10
            `);

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
                    results.push({ id: row.id, url: row.url, embed: null, text: null, error: 'oEmbed取得失敗' });
                }
            }
        }
        res.json(results);
    } catch (err) {
        return errorResponse(res, 500, 'Internal Server Error', `random10: ${err.message}`);
    }
});

router.get('/posts/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return errorResponse(res, 400, 'Query parameter "q" is required');
    }

    let limit = parseInt(req.query.limit, 10) || 100;
    if (limit > 50000) limit = 50000;

    const from = req.query.from;
    const to = req.query.to;

    try {
        const params = [`%${query}%`];
        let sql = `
        SELECT id, url, embed, text, "createdAt"
        FROM posts
        WHERE text ILIKE $1
        `;

        if (from) {
            params.push(from);
            sql += ` AND "createdAt" >= $${params.length}`;
        }
        if (to) {
            params.push(to);
            sql += ` AND "createdAt" <= $${params.length}`;
        }

        params.push(limit);
        sql += ` ORDER BY id DESC LIMIT $${params.length}`;

        const { rows } = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        return errorResponse(res, 500, 'Internal Server Error', `search: ${err.message}`);
    }
});

router.get('/posts/id', async (req, res) => {
    const id = parseInt(req.query.id, 10);
    if (!req.query.id || isNaN(id)) {
        return errorResponse(res, 400, 'Query parameter "id" must be a valid integer');
    }

    try {
        const { rows } = await pool.query(
            'SELECT id, url, embed, text, status, "createdAt" FROM posts WHERE id = $1',
            [id]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            return errorResponse(res, 404, 'Post not found');
        }
    } catch (err) {
        return errorResponse(res, 500, 'Internal Server Error', `id: ${err.message}`);
    }
});

router.get('/posts/all', async (req, res) => {
    let limit = parseInt(req.query.limit, 10) || 200;
    if (limit > 50000) limit = 50000;

    try {
        const { rows } = await pool.query(
            'SELECT id, url, embed, text, status, "createdAt" FROM posts ORDER BY id DESC LIMIT $1',
            [limit]
        );
        res.json(rows);
    } catch (err) {
        return errorResponse(res, 500, 'Internal Server Error', `all: ${err.message}`);
    }
});

router.post('/posts/add', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
        return errorResponse(res, 400, 'Request body must include "url"');
    }

    let normalizedUrl;
    try {
        normalizedUrl = normalizeUrl(url.trim());
    } catch {
        return errorResponse(res, 400, 'Invalid URL format');
    }

    if (!TWEET_URL_RE.test(normalizedUrl)) {
        return errorResponse(res, 400, 'URL must be a valid tweet URL (x.com or twitter.com)');
    }

    try {
        const { rows: existing } = await pool.query(
            'SELECT id FROM posts WHERE url = $1',
            [normalizedUrl]
        );
        if (existing.length > 0) {
            return errorResponse(res, 409, 'URL already exists in database');
        }

        let embedHtml, text, createdAt;
        try {
            const { data } = await axios.get('https://publish.twitter.com/oembed', {
                params: { url: normalizedUrl, lang: 'ja' },
                timeout: 5000
            });
            embedHtml = data.html;
            text = extractTextFromEmbed(data.html);
        } catch (err) {
            if (err.response && err.response.status === 404) {
                return errorResponse(res, 404, 'Tweet not found or has been deleted');
            }
            return errorResponse(res, 502, 'Failed to verify tweet via oEmbed', `posts/add oEmbed: ${err.message}`);
        }

        const match = normalizedUrl.match(/status\/(\d+)/);
        if (match) {
            const createdAtUTC = snowflakeToDate(match[1]);
            const createdAtJST = new Date(createdAtUTC.getTime() + 9 * 60 * 60 * 1000);
            createdAt = createdAtJST.toISOString().slice(0, 19).replace('T', ' ');
        }

        const { rows: inserted } = await pool.query(
            `INSERT INTO posts (url, embed, text, status, "createdAt")
            VALUES ($1, $2, $3, 'ok', $4)
            RETURNING id, url, embed, text, status, "createdAt"`,
            [normalizedUrl, embedHtml, text ?? null, createdAt ?? null]
        );

        console.log(`[INFO] [posts/add] 追加: ${normalizedUrl}`);
        return res.status(201).json(inserted[0]);
    } catch (err) {
        return errorResponse(res, 500, 'Internal Server Error', `posts/add: ${err.message}`);
    }
});

router.get('/posts/count', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT COUNT(*) AS count FROM posts');
        res.json({ count: parseInt(rows[0].count, 10) });
    } catch (err) {
        return errorResponse(res, 500, 'DB query failed', `posts/count: ${err.message}`);
    }
});

router.get('/posts/date-range', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT MIN("createdAt") AS oldest, MAX("createdAt") AS newest FROM posts WHERE "createdAt" IS NOT NULL`
        );
        res.json({ oldest: rows[0].oldest ?? null, newest: rows[0].newest ?? null });
    } catch (err) {
        return errorResponse(res, 500, 'DB query failed', `posts/date-range: ${err.message}`);
    }
});

router.get('/pending-count', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT COUNT(*) AS count FROM posts WHERE status = 'pending'");
        res.json({ pending: parseInt(rows[0].count, 10) });
    } catch (err) {
        return errorResponse(res, 500, 'DB query failed', `pending-count: ${err.message}`);
    }
});

router.get('/pending-text-count', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT COUNT(*) AS count FROM posts WHERE text IS NULL OR text = ''");
        res.json({ pendingText: parseInt(rows[0].count, 10) });
    } catch (err) {
        return errorResponse(res, 500, 'DB query failed', `pending-text-count: ${err.message}`);
    }
});

router.get('/uncreated-count', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT COUNT(*) AS count FROM posts WHERE "createdAt" IS NULL');
        res.json({ uncreated: parseInt(rows[0].count, 10) });
    } catch (err) {
        return errorResponse(res, 500, 'DB query failed', `uncreated-count: ${err.message}`);
    }
});

router.get('/status', async (req, res) => {
    try {
        const stats = getStats();
        res.json(stats);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to get stats', `status: ${err.message}`);
    }
});

module.exports = router;
