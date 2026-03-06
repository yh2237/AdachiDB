require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

async function main() {
    const { rows } = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'posts'
        ORDER BY ordinal_position
    `);

    console.log('=== posts テーブル スキーマ ===');
    rows.forEach(row => {
        const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
        console.log(`  ${row.column_name.padEnd(12)} ${row.data_type.padEnd(20)} ${nullable}${def}`);
    });
}

main()
    .catch(err => {
        console.error('[ERROR] [get_db_schema]', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
