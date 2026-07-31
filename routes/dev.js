const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
const frontendDir = path.join(__dirname, '..', 'frontend');

if (config.server.dev_frontend) {
    router.use(express.static(frontendDir));

    router.get('/index', (req, res) => {
        res.redirect(301, '/');
    });

    router.get('/', (req, res) => {
        res.sendFile(path.join(frontendDir, 'index.html'));
    });

    router.get('/10cont', (req, res) => {
        res.sendFile(path.join(frontendDir, '10cont.html'));
    });

    router.get('/search', (req, res) => {
        res.sendFile(path.join(frontendDir, 'search.html'));
    });

    router.get('/about', (req, res) => {
        res.redirect(301, '/articles/about');
    });

    router.get('/docs', (req, res) => {
        res.redirect(301, '/articles/api');
    });

    router.get('/articles/about', (req, res) => {
        res.sendFile(path.join(frontendDir, 'articles', 'about.html'));
    });

    router.get('/articles/api', (req, res) => {
        res.sendFile(path.join(frontendDir, 'articles', 'api.html'));
    });

    router.get('/db', (req, res) => {
        res.sendFile(path.join(frontendDir, 'db.html'));
    });

    console.log("[INFO] 開発用フロントエンド配信: 有効");
} else {
    console.log("[INFO] 開発用フロントエンド配信: 無効");
}

module.exports = router;
