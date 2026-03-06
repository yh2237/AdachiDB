require('dotenv').config();
const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');

const postsDb = new Pool();

postsDb.on('error', (err) => {
    console.error('[ERROR] [database] PostgreSQL Pool error:', err.message);
});

const dbDir = path.join(__dirname, '..', 'db');
const countsDbPath = path.join(dbDir, config.database.countsDB);
const countsDb = new Database(countsDbPath);

module.exports = {
    postsDb,
    countsDb,
    dbDir
};
