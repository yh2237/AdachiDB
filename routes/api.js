const express = require('express');
const yaml = require('js-yaml');
const router = express.Router();
const { postsDb: pool } = require('../utils/database');
const { getPostBounds, getRandomPost, getPostByIdOrNext, fetchEmbed } = require('../utils/functions');
const { getStats } = require('../utils/statsTracker');

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

const MAX_LIMIT = 50000;
const DEFAULT_LIMIT_SEARCH = 100;
const DEFAULT_LIMIT_ALL = 200;
const DEFAULT_LIMIT_EXPORT = 50000;
const MAX_QUERY_LENGTH = 200;

function parseDateParam(value, label) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Query parameter "${label}" must be a valid date`);
    }

    return value;
}

function parseLimitParam(value, fallback) {
    if (value === undefined) {
        return fallback;
    }

    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        throw new Error('Query parameter "limit" must be a valid integer');
    }
    if (parsed <= 0) {
        throw new Error('Query parameter "limit" must be greater than 0');
    }

    return Math.min(parsed, MAX_LIMIT);
}

const EXPORT_FORMATS = new Set(['json', 'csv', 'yml', 'yaml']);
const EXPORT_FIELD_MAP = {
    id: 'id',
    url: 'url',
    embed: 'embed',
    text: 'text',
    status: 'status',
    createdAt: '"createdAt"'
};
const EXPORT_TYPE_FIELDS = {
    full: ['id', 'url', 'embed', 'text', 'status', 'createdAt'],
    text: ['id', 'text', 'createdAt'],
    url: ['id', 'url', 'createdAt'],
    embed: ['id', 'url', 'embed', 'createdAt'],
    meta: ['id', 'status', 'createdAt']
};

function parseExportFields(type, fields) {
    if (fields) {
        const parsedFields = fields
            .split(',')
            .map((field) => field.trim())
            .filter(Boolean);

        if (parsedFields.length === 0) {
            throw new Error('Query parameter "fields" must include at least one field');
        }

        const invalidFields = parsedFields.filter((field) => !EXPORT_FIELD_MAP[field]);
        if (invalidFields.length > 0) {
            throw new Error(`Unknown field(s): ${invalidFields.join(', ')}`);
        }

        return Array.from(new Set(parsedFields));
    }

    const selectedType = type || 'full';
    const fieldsByType = EXPORT_TYPE_FIELDS[selectedType];
    if (!fieldsByType) {
        throw new Error(`Unknown type: ${selectedType}`);
    }

    return fieldsByType;
}

function normalizeExportRows(rows, selectedFields) {
    return rows.map((row) => {
        const normalized = {};

        for (const field of selectedFields) {
            let value = row[field];
            if (value instanceof Date) {
                value = value.toISOString();
            }
            normalized[field] = value;
        }

        return normalized;
    });
}

function csvEscape(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

function toCsv(rows, selectedFields) {
    const header = selectedFields.join(',');
    const body = rows.map((row) => selectedFields.map((field) => csvEscape(row[field])).join(',')).join('\n');
    return body ? `${header}\n${body}` : `${header}\n`;
}

function isTruthyQuery(value) {
    if (typeof value !== 'string') {
        return false;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

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
        const { count, minId, maxId } = await getPostBounds();
        if (!count || !minId || !maxId) {
            return errorResponse(res, 404, 'No posts available');
        }

        const sampledIds = new Set();
        const targetSize = Math.min(10, count);
        const attempts = Math.min(count, 100);
        while (sampledIds.size < targetSize && sampledIds.size < attempts) {
            const randomId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
            sampledIds.add(randomId);
        }

        const sampledRows = [];
        const sampledRowIds = new Set();
        for (const randomId of sampledIds) {
            const row = await getPostByIdOrNext(randomId);
            if (row && !sampledRowIds.has(row.id)) {
                sampledRowIds.add(row.id);
                sampledRows.push(row);
            }
            if (sampledRows.length >= 10) {
                break;
            }
        }

        if (sampledRows.length === 0) {
            return errorResponse(res, 404, 'No posts available');
        }

        const results = [];
        for (const row of sampledRows) {
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
    if (query.length > MAX_QUERY_LENGTH) {
        return errorResponse(res, 400, `Query parameter "q" must be ${MAX_QUERY_LENGTH} characters or less`);
    }

    let limit;
    let from;
    let to;
    try {
        limit = parseLimitParam(req.query.limit, DEFAULT_LIMIT_SEARCH);
        from = parseDateParam(req.query.from, 'from');
        to = parseDateParam(req.query.to, 'to');
    } catch (err) {
        return errorResponse(res, 400, err.message);
    }

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
    let limit;
    try {
        limit = parseLimitParam(req.query.limit, DEFAULT_LIMIT_ALL);
    } catch (err) {
        return errorResponse(res, 400, err.message);
    }

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

router.get('/posts/export', async (req, res) => {
    const format = String(req.query.format || 'json').toLowerCase();
    if (!EXPORT_FORMATS.has(format)) {
        return errorResponse(res, 400, 'Query parameter "format" must be one of: json, csv, yml, yaml');
    }

    let from;
    let to;
    try {
        from = parseDateParam(req.query.from, 'from');
        to = parseDateParam(req.query.to, 'to');
    } catch (err) {
        return errorResponse(res, 400, err.message);
    }
    const downloadAll = isTruthyQuery(req.query.all);

    let limit;
    try {
        limit = parseLimitParam(req.query.limit, DEFAULT_LIMIT_EXPORT);
    } catch (err) {
        return errorResponse(res, 400, err.message);
    }

    let selectedFields;
    try {
        selectedFields = parseExportFields(req.query.type, req.query.fields);
    } catch (err) {
        return errorResponse(res, 400, err.message);
    }

    try {
        const sqlFields = selectedFields.map((field) => EXPORT_FIELD_MAP[field]).join(', ');
        const params = [];
        let sql = `SELECT ${sqlFields} FROM posts`;

        if (from) {
            params.push(from);
            sql += ` WHERE "createdAt" >= $${params.length}`;
        }
        if (to) {
            params.push(to);
            sql += from
                ? ` AND "createdAt" <= $${params.length}`
                : ` WHERE "createdAt" <= $${params.length}`;
        }

        sql += ' ORDER BY id DESC';
        if (!downloadAll) {
            params.push(limit);
            sql += ` LIMIT $${params.length}`;
        }

        const { rows } = await pool.query(sql, params);
        const normalizedRows = normalizeExportRows(rows, selectedFields);

        let payload;
        let ext;
        let contentType;

        if (format === 'json') {
            payload = JSON.stringify(normalizedRows, null, 2);
            ext = 'json';
            contentType = 'application/json';
        } else if (format === 'csv') {
            payload = toCsv(normalizedRows, selectedFields);
            ext = 'csv';
            contentType = 'text/csv';
        } else {
            payload = yaml.dump(normalizedRows, { noRefs: true, lineWidth: -1 });
            ext = 'yml';
            contentType = 'application/x-yaml';
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `posts-export-${timestamp}.${ext}`;

        res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(payload);
    } catch (err) {
        return errorResponse(res, 500, 'Internal Server Error', `posts/export: ${err.message}`);
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
        const { rows: inserted } = await pool.query(
            `INSERT INTO posts (url, embed, text, status, "createdAt")
            VALUES ($1, NULL, NULL, 'pending', NULL)
            RETURNING id, url, embed, text, status, "createdAt"`,
            [normalizedUrl]
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
