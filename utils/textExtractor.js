/**
 * @param {string} text
 * @returns {string}
 */
function decodeHtmlEntities(text) {
  if (!text) return '';

  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&nbsp;': ' ',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (match, code) => String.fromCharCode(parseInt(code, 10)));
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, code) => String.fromCharCode(parseInt(code, 16)));

  return decoded;
}

/**
 * @param {string} html
 * @returns {string}
 */
function extractTextFromEmbed(html) {
  if (!html) return '';
  const patterns = [
    /<p\s+lang="[^"]*"\s+dir="ltr">([\s\S]*?)<\/p>/i,
    /<p\s+dir="ltr">([\s\S]*?)<\/p>/i,
    /<blockquote[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i,
  ];

  let rawText = '';

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      rawText = match[1];
      break;
    }
  }

  if (!rawText) return '';

  let text = rawText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();

  text = decodeHtmlEntities(text);
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

module.exports = {
  extractTextFromEmbed,
  decodeHtmlEntities
};
