require('dotenv').config();
const express = require('express');
const yaml = require('js-yaml');
const chalk = require('chalk');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
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

const rateLimitConfig = config.rateLimit || {};
const windowSeconds = typeof rateLimitConfig.windowSeconds === 'number' ? rateLimitConfig.windowSeconds : 60;
const windowMs = windowSeconds * 1000;
const defaultLimits = {
    api: {
        status: 120,
        'pending-count': 60,
        'pending-text-count': 60,
        'uncreated-count': 60,
        posts: {
            random: 3000,
            random10: 200,
            search: 60,
            all: 30,
            export: 10,
            exportAll: 2,
            add: 200
        }
    }
};
const limits = {
    ...defaultLimits,
    ...(rateLimitConfig.limits || {})
};

function buildLimiter(max) {
    if (!Number.isFinite(max) || max <= 0) {
        return null;
    }

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false
    });
}

const apiLimits = limits.api || {};
const postLimits = apiLimits.posts || {};

const limiterRandom = buildLimiter(postLimits.random);
const limiterRandom10 = buildLimiter(postLimits.random10);
const limiterSearch = buildLimiter(postLimits.search);
const limiterAll = buildLimiter(postLimits.all);
const limiterExport = buildLimiter(postLimits.export);
const limiterExportAll = buildLimiter(postLimits.exportAll);
const limiterAdd = buildLimiter(postLimits.add);

if (limiterRandom) app.use('/api/posts/random', limiterRandom);
if (limiterRandom10) app.use('/api/posts/random10', limiterRandom10);
if (limiterSearch) app.use('/api/posts/search', limiterSearch);
if (limiterAll) app.use('/api/posts/all', limiterAll);
if (limiterAdd) app.use('/api/posts/add', limiterAdd);
app.use('/api/posts/export', (req, res, next) => {
    const allValue = typeof req.query.all === 'string' ? req.query.all.trim().toLowerCase() : '';
    const limiter = ['1', 'true', 'yes', 'on'].includes(allValue) ? limiterExportAll : limiterExport;
    if (!limiter) {
        return next();
    }
    return limiter(req, res, next);
});

const apiEndpointMap = {
    status: '/api/status',
    'pending-count': '/api/pending-count',
    'pending-text-count': '/api/pending-text-count',
    'uncreated-count': '/api/uncreated-count'
};

Object.entries(apiEndpointMap).forEach(([key, route]) => {
    if (key === 'posts') {
        return;
    }

    const limiter = buildLimiter(apiLimits[key]);
    if (!limiter) {
        return;
    }

    app.use(route, limiter);
});

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
        }, intervalMs);
    }
});
