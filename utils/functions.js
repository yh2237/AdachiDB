const axios = require('axios');
const { postsDb: pool } = require('./database');
const { extractTextFromEmbed } = require('./textExtractor');

const processingMap = new Map();

async function getPostBounds() {
    const { rows } = await pool.query(
        'SELECT COUNT(*)::int AS count, MIN(id) AS min, MAX(id) AS max FROM posts'
    );
    const stats = rows[0] || {};
    const count = Number(stats.count) || 0;
    const minId = stats.min ? Number(stats.min) : null;
    const maxId = stats.max ? Number(stats.max) : null;
    return { count, minId, maxId };
}

async function getRandomPostByBounds(minId, maxId) {
    if (!Number.isFinite(minId) || !Number.isFinite(maxId) || minId > maxId) {
        return null;
    }

    const randomId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
    const { rows } = await pool.query(
        'SELECT id, url, embed, text FROM posts WHERE id >= $1 ORDER BY id LIMIT 1',
        [randomId]
    );

    if (rows[0]) {
        return rows[0];
    }

    const { rows: fallback } = await pool.query(
        'SELECT id, url, embed, text FROM posts ORDER BY id LIMIT 1'
    );
    return fallback[0] ?? null;
}

async function getPostByIdOrNext(startId) {
    if (!Number.isFinite(startId)) {
        return null;
    }

    const { rows } = await pool.query(
        'SELECT id, url, embed, text FROM posts WHERE id >= $1 ORDER BY id LIMIT 1',
        [startId]
    );

    if (rows[0]) {
        return rows[0];
    }

    const { rows: fallback } = await pool.query(
        'SELECT id, url, embed, text FROM posts ORDER BY id LIMIT 1'
    );
    return fallback[0] ?? null;
}

async function getRandomPost() {
    const { count, minId, maxId } = await getPostBounds();
    if (count === 0) {
        return null;
    }

    return getRandomPostByBounds(minId, maxId);
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

            await pool.query(
                `UPDATE posts SET embed = $1, text = $2, status = 'ok' WHERE id = $3`,
                [data.html, text, post.id]
            );

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

module.exports = { getPostBounds, getRandomPostByBounds, getPostByIdOrNext, getRandomPost, fetchEmbed };
