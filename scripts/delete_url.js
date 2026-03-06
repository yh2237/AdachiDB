require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

function normalizeUrl(url) {
    const modified = url.replace('twitter.com', 'x.com');
    const u = new URL(modified);
    return `${u.origin}${u.pathname}`;
}

async function deleteUrl(url) {
    let normalizedUrl;
    try {
        normalizedUrl = normalizeUrl(url);
    } catch {
        console.error('無効なURLです:', url);
        process.exit(1);
    }

    const result = await pool.query('DELETE FROM posts WHERE url = $1', [normalizedUrl]);
    if (result.rowCount > 0) {
        console.log(`[INFO] 削除しました: ${normalizedUrl}`);
    } else {
        console.log(`[WARN] 該当URLが見つかりませんでした: ${normalizedUrl}`);
    }
}

const urlToDelete = process.argv[2];
if (!urlToDelete) {
    console.error('削除するURLを引数で指定してください。');
    process.exit(1);
}

deleteUrl(urlToDelete)
    .catch(err => {
        console.error('[ERROR]', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
