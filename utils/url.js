function normalizeUrl(url) {
    const modified = url.replace('twitter.com', 'x.com');
    const u = new URL(modified);
    return `${u.origin}${u.pathname}`;
}

function isTruthyQuery(value) {
    if (typeof value !== 'string') {
        return false;
    }
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

module.exports = { normalizeUrl, isTruthyQuery };
