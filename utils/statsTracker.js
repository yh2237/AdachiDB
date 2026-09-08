const { postsDb: pool } = require('./database');

async function trackAccess(endpoint) {
    try {
        await pool.query(
            `INSERT INTO access_counts (endpoint, count) VALUES ($1, 1)
            ON CONFLICT (endpoint) DO UPDATE SET count = access_counts.count + 1`,
            [endpoint]
        );
    } catch (err) {
        console.error(`[ERROR] [statsTracker] Failed to track access for ${endpoint}:`, err.message);
    }
}

async function getStats() {
    const { rows } = await pool.query('SELECT * FROM access_counts ORDER BY count DESC');
    return rows;
}

module.exports = { trackAccess, getStats };
