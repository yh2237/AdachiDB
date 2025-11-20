const { scrapeLinks } = require('../utils/scrapeLinks');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'db', config.database.dbName);
const db = new Database(dbPath);
let linkCount = 0;

const blockedPath = path.join(__dirname, '..', 'config', '404urls.yml');
let blockedUrls = [];
if (fs.existsSync(blockedPath)) {
  const blockedConfig = yaml.load(fs.readFileSync(blockedPath, 'utf8'));
  blockedUrls = blockedConfig.urls || [];
}
console.log(`[INFO] [collectPosts] 404除外リスト ${blockedUrls.length} 件をロード`);

function saveLinksToDB(links) {
  if (links.length === 0) return;

  const processedLinks = links.map(url => {
    try {
      let modifiedUrl = url.replace('twitter.com', 'x.com');
      const urlObject = new URL(modifiedUrl);
      return `${urlObject.origin}${urlObject.pathname}`;
    } catch (e) {
      console.error(`[collectPosts] Invalid URL skipped: ${url}`);
      return null;
    }
  }).filter(Boolean);

  const filtered = processedLinks.filter(url => !blockedUrls.includes(url));
  if (filtered.length === 0) {
    console.log(`[INFO] [collectPosts] 今回はすべて404除外リストに該当したため保存なし`);
    return;
  }

  const existsStmt = db.prepare('SELECT url FROM posts WHERE url = ?');
  let newLinks = filtered.filter(url => !existsStmt.get(url));

  if (newLinks.length === 0) {
    console.log(`[INFO] [collectPosts] 既存URLのみだったため保存なし`);
    return;
  }

  newLinks = [...new Set(newLinks)];

  const insertMany = db.transaction((urls) => {
    const stmt = db.prepare(`INSERT INTO posts (url) VALUES (?)`);
    for (const url of urls) {
      stmt.run(url);
    }
  });

  insertMany(newLinks);

  linkCount += newLinks.length;
  console.log(`[INFO] [collectPosts] ${newLinks.length} 件を保存 (除外 ${links.length - newLinks.length} 件)`);
}



async function main() {
  const configPath = path.join(__dirname, '..', 'config', 'config.yml');
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

  const summaryLinks = await scrapeLinks(
    config.scraping.summaryPage.url,
    config.scraping.summaryPage.includeKeywords,
    config.scraping.summaryPage.excludeKeywords,
    config.scraping.summaryPage.htmlTag,
  );
  console.log("[INFO] [collectPosts] 対象ページ:", summaryLinks);

  for (let i = 0; i < summaryLinks.length; i++) {
    const monthlyLinks = await scrapeLinks(
      summaryLinks[i],
      config.scraping.monthlyPage.includeKeywords,
      config.scraping.monthlyPage.excludeKeywords,
      config.scraping.monthlyPage.htmlTag,
    );

    console.log(`[INFO] [collectPosts] ${summaryLinks[i]} → ${monthlyLinks.length} 件取得`);
    saveLinksToDB(monthlyLinks);

    await new Promise(res => setTimeout(res, config.scraping.interval || 1000));
  }
}

main().then(() => {
  console.log(`[INFO] [collectPosts] 終了。 合計 ${linkCount} 件のリンクを保存しました`);
  db.close();
});
