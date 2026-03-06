require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');

const pool = new Pool();

async function main() {
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM posts');
    const count = parseInt(rows[0].count, 10);

    console.log(`[WARN] postsテーブルの全レコード (${count}件) を削除しようとしています。`);

    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message: '本当に全件削除しますか？この操作は取り消せません。',
            default: false,
        },
    ]);

    if (!confirmed) {
        console.log('[INFO] [clear_db] キャンセルしました。');
        return;
    }

    const result = await pool.query('DELETE FROM posts');
    console.log(`[INFO] [clear_db] リンクデータをクリアしました。削除件数: ${result.rowCount}`);
}

main()
    .catch(err => {
        console.error('[ERROR] [clear_db]', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
