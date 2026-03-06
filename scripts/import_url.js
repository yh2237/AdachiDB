require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool();

const TWEET_URL_RE = /^https:\/\/(x\.com|twitter\.com)\/[^/]+\/status\/\d+$/;

const jsonPath = path.join(__dirname, '..', 'data', 'saved_urls.json');
let data;
try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (err) {
    console.error('JSON の読み込みに失敗:', err.message);
    process.exit(1);
}

if (!Array.isArray(data.urls)) {
    console.error('JSON 内に "urls": [] が存在しません');
    process.exit(1);
}

const urls = data.urls;
console.log(`読み込みURL数: ${urls.length} 件`);
console.log('DB への挿入を開始します…');

async function importUrls() {
    let successCount = 0;
    let failCount = 0;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const url of urls) {
            try {
                let modifiedUrl = url.replace('twitter.com', 'x.com');
                const urlObject = new URL(modifiedUrl);
                modifiedUrl = `${urlObject.origin}${urlObject.pathname}`;

                if (!TWEET_URL_RE.test(modifiedUrl)) {
                    console.warn(`[WARN] ツイートURLではないためスキップ: ${url}`);
                    failCount++;
                    continue;
                }

                const result = await client.query(
                    'INSERT INTO posts (url) VALUES ($1) ON CONFLICT (url) DO NOTHING',
                    [modifiedUrl]
                );
                if (result.rowCount > 0) {
                    successCount++;
                }
            } catch (e) {
                console.error(`[ERROR] 処理失敗: ${url} - ${e.message}`);
                failCount++;
            }
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    console.log(`\n完了: ${successCount} 件成功, ${failCount} 件失敗`);
}

importUrls()
    .catch(err => {
        console.error('[ERROR]', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
