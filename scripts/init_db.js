require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

async function main() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS posts (
            id        SERIAL PRIMARY KEY,
            url       TEXT UNIQUE NOT NULL,
            embed     TEXT,
            text      TEXT,
            status    TEXT NOT NULL DEFAULT 'pending',
            "createdAt" TEXT)
        `);
        console.log('[INFO] [init_db] postsテーブルを初期化しました');

        await client.query(`
            CREATE TABLE IF NOT EXISTS access_counts (
            endpoint  TEXT PRIMARY KEY,
            count     INTEGER NOT NULL DEFAULT 0)
        `);
        console.log('[INFO] [init_db] access_countsテーブルを初期化しました');
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(err => {
    console.error('[ERROR] [init_db]', err.message);
    process.exit(1);
});
