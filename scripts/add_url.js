require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

const TWEET_URL_RE = /^https:\/\/(x\.com|twitter\.com)\/[^/]+\/status\/\d+$/;

function normalizeUrl(url) {
    const modified = url.replace('twitter.com', 'x.com');
    const u = new URL(modified);
    return `${u.origin}${u.pathname}`;
}

async function addUrls(urls) {
    if (!Array.isArray(urls)) urls = [urls];

    let count = 0;
    for (const url of urls) {
        try {
            const normalizedUrl = normalizeUrl(url);
            if (!TWEET_URL_RE.test(normalizedUrl)) {
                console.warn(`[WARN] ツイートURLではないためスキップ: ${url}`);
                continue;
            }
            const result = await pool.query(
                'INSERT INTO posts (url) VALUES ($1) ON CONFLICT (url) DO NOTHING',
                [normalizedUrl]
            );
            if (result.rowCount > 0) count++;
        } catch (err) {
            console.error('DB insert error:', err.message);
        }
    }

    console.log(`${count} 件のURLを追加しました`);
}

const urlToAdd = process.argv[2];
if (!urlToAdd) {
    console.error('追加するURLを引数で指定してください。');
    process.exit(1);
}

addUrls([urlToAdd]).finally(() => pool.end());
