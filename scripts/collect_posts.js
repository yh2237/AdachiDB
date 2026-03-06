require('dotenv').config();
const { Pool } = require('pg');
const { scrapeLinks } = require('../utils/scrapeLinks');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const pool = new Pool();

let linkCount = 0;

const blockedPath = path.join(__dirname, '..', 'config', '404urls.yml');
let blockedUrls = [];
if (fs.existsSync(blockedPath)) {
    const blockedConfig = yaml.load(fs.readFileSync(blockedPath, 'utf8'));
    blockedUrls = blockedConfig.urls || [];
}
console.log(`[INFO] [collectPosts] 404除外リスト ${blockedUrls.length} 件をロード`);

async function saveLinksToDB(links) {
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
        console.log('[INFO] [collectPosts] 今回はすべて404除外リストに該当したため保存なし');
        return;
    }

    const client = await pool.connect();
    try {
        const { rows: existingRows } = await client.query(
            'SELECT url FROM posts WHERE url = ANY($1::text[])',
            [filtered]
        );
        const existingSet = new Set(existingRows.map(r => r.url));
        let newLinks = [...new Set(filtered)].filter(url => !existingSet.has(url));

        if (newLinks.length === 0) {
            console.log('[INFO] [collectPosts] 既存URLのみだったため保存なし');
            return;
        }

        await client.query('BEGIN');
        for (const url of newLinks) {
            await client.query(
                'INSERT INTO posts (url) VALUES ($1) ON CONFLICT (url) DO NOTHING',
                [url]
            );
        }
        await client.query('COMMIT');

        linkCount += newLinks.length;
        console.log(`[INFO] [collectPosts] ${newLinks.length} 件を保存 (除外 ${links.length - newLinks.length} 件)`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function main() {
    const summaryLinks = await scrapeLinks(
        config.scraping.summaryPage.url,
        config.scraping.summaryPage.includeKeywords,
        config.scraping.summaryPage.excludeKeywords,
        config.scraping.summaryPage.htmlTag,
    );
    console.log('[INFO] [collectPosts] 対象ページ:', summaryLinks);

    for (let i = 0; i < summaryLinks.length; i++) {
        const monthlyLinks = await scrapeLinks(
            summaryLinks[i],
            config.scraping.monthlyPage.includeKeywords,
            config.scraping.monthlyPage.excludeKeywords,
            config.scraping.monthlyPage.htmlTag,
        );

        console.log(`[INFO] [collectPosts] ${summaryLinks[i]} → ${monthlyLinks.length} 件取得`);
        await saveLinksToDB(monthlyLinks);

        await new Promise(res => setTimeout(res, config.scraping.interval || 1000));
    }
}

main()
    .then(() => {
        console.log(`[INFO] [collectPosts] 終了。 合計 ${linkCount} 件のリンクを保存しました`);
    })
    .catch(err => {
        console.error('[ERROR] [collectPosts]', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
