require('dotenv').config();
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const sqlitePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, '..', 'db', 'adachiPosts.db');

if (!fs.existsSync(sqlitePath)) {
    console.error(`[ERROR] SQLite ファイルが見つかりません: ${sqlitePath}`);
    process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const pool = new Pool();

const BATCH_SIZE = 500;

async function migrate() {
    console.log(`[INFO] [migrate] SQLite: ${sqlitePath}`);
    console.log(`[INFO] [migrate] 移行先: ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);

    const rows = sqlite.prepare('SELECT url, embed, text, status, createdAt FROM posts').all();
    console.log(`[INFO] [migrate] SQLite から ${rows.length} 件を読み込みました`);

    if (rows.length === 0) {
        console.log('[INFO] [migrate] 移行するデータがありません');
        return;
    }

    const client = await pool.connect();
    try {
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            await client.query('BEGIN');
            try {
                for (const row of batch) {
                    const result = await client.query(
                        `INSERT INTO posts (url, embed, text, status, "createdAt")
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (url) DO NOTHING`,
                        [row.url, row.embed ?? null, row.text ?? null, row.status ?? 'pending', row.createdAt ?? null]
                    );
                    if (result.rowCount > 0) {
                        successCount++;
                    } else {
                        skipCount++;
                    }
                }
                await client.query('COMMIT');
                console.log(`[INFO] [migrate] ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} 件処理済み`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        console.log(`\n[INFO] [migrate] 完了: ${successCount} 件挿入, ${skipCount} 件スキップ（重複）`);
    } finally {
        client.release();
        await pool.end();
        sqlite.close();
    }
}

migrate().catch(err => {
    console.error('[ERROR] [migrate]', err.message);
    process.exit(1);
});
