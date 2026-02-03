const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');

const dbDir = path.join(__dirname, '..', 'db');

const postsDbPath = path.join(dbDir, config.database.postsDB);
const postsDb = new Database(postsDbPath);

const countsDbPath = path.join(dbDir, config.database.countsDB);
const countsDb = new Database(countsDbPath);

module.exports = {
  postsDb,
  countsDb,
  dbDir
};
