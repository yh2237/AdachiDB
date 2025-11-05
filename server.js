const Database = require('better-sqlite3');
const express = require('express');
const yaml = require('js-yaml');
const axios = require('axios');
const chalk = require('chalk');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { backup_db } = require('./scripts/backup_db');

const configPath = path.join(__dirname, 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const dbPath = path.join(__dirname, 'db', config.database.dbName);
const db = new Database(dbPath);

const app = express();
const port = config.server.port || 3000;

const processingMap = new Map();

function getRandomPost() {
  return db.prepare('SELECT id, url, embed, text FROM posts ORDER BY RANDOM() LIMIT 1').get();
}

async function fetchEmbed(post) {
  if (processingMap.has(post.id)) {
    return processingMap.get(post.id);
  }
  const promise = (async () => {
    try {
      const { data } = await axios.get('https://publish.twitter.com/oembed', {
        params: { url: post.url, lang: 'ja' },
        timeout: 5000
      });

      const textMatch = data.html.match(/<p lang="ja" dir="ltr">(.*?)<\/p>/s);
      const text = textMatch ? textMatch[1].replace(/<br>/g, '\n') : '';

      db.prepare('UPDATE posts SET embed = ?, text = ? WHERE id = ?').run(data.html, text, post.id);

      return { id: post.id, url: post.url, embed: data.html, text };
    } catch (err) {
      console.error(`[ERROR] oEmbed failed for ${post.url}:`, err.message);
      throw new Error('Failed to fetch oEmbed');
    } finally {
      processingMap.delete(post.id);
    }
  })();

  processingMap.set(post.id, promise);
  return promise;
}

// ============================================================
// ============================================================

app.use(express.json());

const banner = fs.readFileSync(path.join(__dirname, 'config', 'banner'), 'utf8');

if (config.server.banner) {
  console.log(`${chalk.hex('#FFA500')(banner)}\n`);
}

if (config.server.openAPI) {
  app.use(cors());
  console.log("[INFO] API公開: 有効（全オリジン許可）");
} else {
  const allowedOrigin = config.server.url.replace(/\/$/, "");
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
      }
      else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    }
  }));
  console.log(`[INFO] API公開: 無効（${allowedOrigin} のみ許可）`);
}


if (config.server.frontend) {
  app.use(express.static(path.join(__dirname, 'frontend')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  });

  console.log("[INFO] フロントエンド配信: 有効");
} else {
  console.log("[INFO] フロントエンド配信: 無効");
}

// ============================================================
// ============================================================

app.get('/api/pending-count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE status = \'pending\'').get();
    res.json({ pending: row.count });
  } catch (err) {
    console.error('[ERROR] pending-count:', err.message);
    res.status(500).json({ error: 'DB query failed' });
  }
});

app.get('/api/posts/random', async (req, res) => {
  const post = getRandomPost();
  if (!post) return res.status(404).json({ error: 'No posts available (´・ω・｀)' });

  try {
    if (post.embed) {
      return res.json({ id: post.id, url: post.url, embed: post.embed, text: post.text });
    }

    const result = await fetchEmbed(post);
    return res.json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/posts/random10', async (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, url, embed, text
      FROM posts 
      ORDER BY RANDOM() 
      LIMIT 10
    `).all();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No posts available (´・ω・｀)' });
    }

    const results = [];

    for (const row of rows) {
      if (row.embed) {
        results.push(row);
      } else {
        try {
          const result = await fetchEmbed(row);
          results.push(result);
        } catch (err) {
          console.error(`[ERROR] fetchEmbed failed for ${row.url}:`, err.message);
          results.push({
            id: row.id,
            url: row.url,
            embed: null,
            error: 'oEmbed取得失敗'
          });
        }
      }
    }
    res.json(results);
  } catch (err) {
    console.error('[ERROR] random10:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/posts/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  let limit = parseInt(req.query.limit, 10) || 100;
  if (limit > 2000) {
    limit = 2000;
  }

  try {
    const rows = db.prepare(`SELECT id, url, embed, text FROM posts WHERE text LIKE ? ORDER BY id DESC LIMIT ?`).all(`%${query}%`, limit);
    res.json(rows);
  } catch (err) {
    console.error('[ERROR] search:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/posts/all', (req, res) => {
  let limit = parseInt(req.query.limit, 10) || 200;
  if (limit > 20000) {
    limit = 20000;
  }

  try {
    const rows = db.prepare('SELECT id, url, embed, text, status FROM posts ORDER BY id DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (err) {
    console.error('[ERROR] all:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/posts/id', (req, res) => {
  const id = req.query.id;
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
if (row) {
  res.json(row);
} else {
  console.error('[ERROR] id:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
}

})

app.get('/api/pending-text-count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE status = \'pending\'').get();
    res.json({ pending: row.count });
  } catch (err) {
    console.error('[ERROR] pending-text-count:', err.message);
    res.status(500).json({ error: 'DB query failed' });
  }
});

// ============================================================
// ============================================================

app.use((req, res, next) => { 
    res.status(404);
    return res.json({ error: `404 Not Found (´・ω・｀). Please see ${config.server.url}/docs.html for API specifications etc.` });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500);
    return res.json({ error: 'Internal Server Error (´・ω・｀)' });
});

app.listen(port, () => {
  console.log(`[INFO] http://localhost:${port} WEBサーバーを起動`);

  if (config.backup.enable) {
    backup_db();

    const intervalMs = config.backup.interval * 60 * 1000;
    setInterval(() => {
      backup_db();
    },intervalMs);
}});