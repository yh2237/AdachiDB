const { postsDb: pool } = require('./database');
const { snowflakeToDate } = require('./snowflakeToDate');

async function processBatch() {
    const { rows } = await pool.query(
        `SELECT url FROM posts WHERE "createdAt" IS NULL AND url ~ 'status/[0-9]+' LIMIT 50`
    );

    if (rows.length === 0) return false;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const row of rows) {
            const url = row.url;
            const match = url.match(/status\/(\d+)/);
            if (!match) {
                continue;
            }
            const tweetId = match[1];
            const createdAtUTC = snowflakeToDate(tweetId);
            const createdAtJST = new Date(createdAtUTC.getTime() + 9 * 60 * 60 * 1000);
            const formattedDate = createdAtJST.toISOString().slice(0, 19).replace('T', ' ');

            await client.query(
                'UPDATE posts SET "createdAt" = $1 WHERE url = $2',
                [formattedDate, url]
            );
        }
        await client.query('COMMIT');
        console.log(`[INFO] [CreatedAtWorker] ${rows.length}件の createdAt を更新しました`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    return true;
}

async function main() {
    console.log('[INFO] [CreatedAtWorker] createdAtWorker 起動');
    while (true) {
        try {
            const processed = await processBatch();
            if (!processed) {
                await new Promise(res => setTimeout(res, 5000));
            } else {
                await new Promise(res => setTimeout(res, 500));
            }
        } catch (err) {
            console.error('[ERROR] [CreatedAtWorker]', err.message);
            await new Promise(res => setTimeout(res, 5000));
        }
    }
}

main();
