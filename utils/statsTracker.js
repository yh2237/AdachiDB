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
    try {
        const { rows } = await pool.query('SELECT * FROM access_counts ORDER BY count DESC');
        return rows;
    } catch (err) {
        console.error(`[ERROR] [statsTracker] Failed to get stats:`, err.message);
        return [];
    }
}

module.exports = { trackAccess, getStats };
