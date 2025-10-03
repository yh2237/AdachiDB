const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeLinks(url, includeKeywords = [], excludeKeywords = [], htmlTag) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const links = [];

    $(htmlTag).each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const includeOK = includeKeywords.length === 0 || includeKeywords.some(k => href.includes(k));
      const excludeOK = excludeKeywords.length === 0 || excludeKeywords.every(k => !href.includes(k));

      if (includeOK && excludeOK) {
        const absoluteUrl = new URL(href, url).href;
        links.push(absoluteUrl);
      }
    });

    console.log(`[INFO] [scrapeLinks] ${url} から ${links.length} 件のリンクを取得しました`);
    return links;

  } catch (err) {
    console.error('[ERROR] [scrapeLinks]', err.message);
    return [];
  }
}

module.exports = { scrapeLinks };