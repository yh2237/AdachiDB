require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool();

async function main() {
    const { rows } = await pool.query(
        `SELECT url, text, "createdAt" FROM posts ORDER BY id ASC`
    );

    const jsonData = JSON.stringify(rows, null, 2);
    const outputPath = path.join(__dirname, '..', 'data', 'output_posts.json');
    fs.writeFileSync(outputPath, jsonData, 'utf-8');
    console.log(`[INFO] [db_to_json] JSONファイルを書き出しました: ${outputPath} (${rows.length}件)`);
}

main()
    .catch(err => {
        console.error('[ERROR] [db_to_json]', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
