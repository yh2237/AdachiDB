const express = require('express');
const yaml = require('js-yaml');
const chalk = require('chalk');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');
const frontRoutes = require('./routes/front');
const devRoutes = require('./routes/dev');
const { backup_db } = require('./scripts/backup_db');
const { trackAccess } = require('./utils/statsTracker');

const configPath = path.join(__dirname, 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const app = express();
const port = config.server.port || 3000;

// ============================================================
// ============================================================

app.use(express.json());

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    trackAccess(req.path);
  } else if (!path.extname(req.path)) {
    trackAccess('site_access');
  }
  next();
});

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

app.use('/', frontRoutes);

app.use('/dev', devRoutes);

// ============================================================
// ============================================================

app.use('/api', apiRoutes);

// ============================================================
// ============================================================

app.use((req, res, next) => {
    res.status(404);
    return res.json({ error: `404 Not Found (´・ω・｀). Please see ${config.server.url}/docs for API specifications etc.` });
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