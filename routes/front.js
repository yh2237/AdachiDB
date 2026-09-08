const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../utils/config');

const frontendDir = path.join(__dirname, '..', 'frontend');
const rootDir = path.join(frontendDir, 'root');

if (config.server.frontend) {
    const noindexPaths = ['/db', '/db.html'];
    const noindexPrefixes = ['/md/', '/data/'];

    router.use((req, res, next) => {
        if (
            noindexPaths.includes(req.path) ||
            noindexPrefixes.some((prefix) => req.path.startsWith(prefix))
        ) {
            res.set('X-Robots-Tag', 'noindex, nofollow');
        }
        next();
    });

    const canonicalRedirects = {
        '/index': '/',
        '/index.html': '/',
        '/10cont.html': '/10cont',
        '/search.html': '/search',
        '/about.html': '/about',
        '/docs.html': '/docs',
        '/db.html': '/db'
    };

    Object.entries(canonicalRedirects).forEach(([source, destination]) => {
        router.get(source, (req, res) => {
            res.redirect(301, destination);
        });
    });

    router.get('/robots.txt', (req, res) => {
        res.sendFile(path.join(rootDir, 'robots.txt'));
    });

    router.get('/sitemap.xml', (req, res) => {
        res.sendFile(path.join(rootDir, 'sitemap.xml'));
    });

    router.get('/about', (req, res) => {
        res.sendFile(path.join(frontendDir, 'about.html'));
    });

    router.get('/docs', (req, res) => {
        res.sendFile(path.join(frontendDir, 'docs.html'));
    });

    router.use(express.static(frontendDir, { index: false }));

    router.get('/', (req, res) => {
        res.sendFile(path.join(frontendDir, 'index.html'));
    });

    router.get('/10cont', (req, res) => {
        res.sendFile(path.join(frontendDir, '10cont.html'));
    });

    router.get('/search', (req, res) => {
        res.sendFile(path.join(frontendDir, 'search.html'));
    });

    router.get('/db', (req, res) => {
        res.sendFile(path.join(frontendDir, 'db.html'));
    });

    console.log("[INFO] フロントエンド配信: 有効");
} else {
    console.log("[INFO] フロントエンド配信: 無効");
}

module.exports = router;
