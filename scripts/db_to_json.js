const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.postsDB);

try {
    const db = new Database(dbPath, { readonly: true });

    const tableName = 'posts';
    const columns = ['url', 'text', 'createdAt',];

    const query = `SELECT ${columns.join(', ')} FROM ${tableName}`;

    const stmt = db.prepare(query);
    const rows = stmt.all();
    const jsonData = JSON.stringify(rows, null, 2);

    fs.writeFileSync('./data/output_urls.json', jsonData, 'utf-8');
    console.log('JSONファイルを書き出しました。');

    db.close();
} catch (err) {
    console.error('エラー:', err.message);
}