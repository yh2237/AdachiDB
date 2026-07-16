const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '..', 'config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));


const frontendDir = path.join(__dirname, '..', 'frontend');
const rootDir = path.join(frontendDir, 'root');

if (config.server.frontend) {
    router.use(express.static(frontendDir));

    router.get('/index', (req, res) => {
        res.redirect(301, '/');
    });

    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    });

    router.get('/10cont', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', '10cont.html'));
    });

    router.get('/search', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'search.html'));
    });

    router.get('/about', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'about.html'));
    });

    router.get('/docs', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'docs.html'));
    });

    router.get('/db', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'db.html'));
    });

    router.get('*', (req, res, next) => {
        if (!fs.existsSync(rootDir)) return next();
        const filePath = path.join(rootDir, req.path);
        if (filePath.startsWith(rootDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return res.sendFile(filePath);
        }
        next();
    });

    console.log("[INFO] フロントエンド配信: 有効");
} else {
    console.log("[INFO] フロントエンド配信: 無効");
}

module.exports = router;