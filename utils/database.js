require('dotenv').config();
const { Pool } = require('pg');

const postsDb = new Pool();

postsDb.on('error', (err) => {
    console.error('[ERROR] [database] PostgreSQL Pool error:', err.message);
});

module.exports = {
    postsDb
};
