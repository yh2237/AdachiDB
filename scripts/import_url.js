const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const yaml = require('js-yaml');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.postsDB);
const db = new Database(dbPath);

const jsonPath = path.join(__dirname, '..', "data", "saved_urls.json");
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

const insert = db.prepare('INSERT OR IGNORE INTO posts (url) VALUES (?)');

const insertMany = db.transaction((urlList) => {
    let successCount = 0;
    let failCount = 0;
    for (const url of urlList) {
        try {

            let modifiedUrl = url.replace('twitter.com', 'x.com');
            const urlObject = new URL(modifiedUrl);
            modifiedUrl = `${urlObject.origin}${urlObject.pathname}`;

            const info = insert.run(modifiedUrl);
            if (info.changes > 0) {
                successCount++;
            }
        } catch (e) {
            console.error(`[ERROR] 処理失敗: ${url} - ${e.message}`);
            failCount++;
        }
    }
    return { successCount, failCount };
});

const result = insertMany(urls);

console.log(`\n完了: ${result.successCount} 件成功, ${result.failCount} 件失敗`);

db.close();
