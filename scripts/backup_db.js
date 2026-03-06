const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

function backup_single_db(dbPath, backupDir, maxBackups) {
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
    console.log(`[INFO] [backup_db] バックアップを作成します: ${backupPath}`);
    try {
        const db = new Database(dbPath);
        db.pragma(`journal_mode = WAL`);
        db.prepare(`VACUUM INTO ?`).run(backupPath);
        db.close();
        console.log(`[INFO] [backup_db] バックアップ完了: ${backupPath}`);
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.db'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => a.time - b.time);
        while (files.length > maxBackups) {
            const fileToDelete = files.shift();
            fs.unlinkSync(path.join(backupDir, fileToDelete.name));
            console.log(`[INFO] [backup_db] 古いバックアップを削除: ${fileToDelete.name}`);
        }
    } catch (err) {
        console.error(`[ERROR] [backup_db] バックアップに失敗: ${err.message}`);
    }
}

function backup_pg(backupDir, maxBackups) {
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.sql`);
    console.log(`[INFO] [backup_db] PostgreSQLバックアップを作成します: ${backupPath}`);
    try {
        execSync(`pg_dump -F p -f "${backupPath}"`, {
            env: process.env,
            stdio: ['ignore', 'ignore', 'pipe'],
        });
        console.log(`[INFO] [backup_db] PostgreSQLバックアップ完了: ${backupPath}`);

        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.sql'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => a.time - b.time);
        while (files.length > maxBackups) {
            const fileToDelete = files.shift();
            fs.unlinkSync(path.join(backupDir, fileToDelete.name));
            console.log(`[INFO] [backup_db] 古いバックアップを削除: ${fileToDelete.name}`);
        }
    } catch (err) {
        console.error(`[ERROR] [backup_db] PostgreSQLバックアップに失敗: ${err.stderr?.toString().trim() ?? err.message}`);
    }
}

function backup_db() {
    require('dotenv').config();
    const configPath = path.join(__dirname, '..', 'config', 'config.yml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const maxBackups = config.backup.keep || 5;

    const dbPath = path.join(__dirname, '..', 'db', config.database.countsDB);
    const countsBackupDir = path.join(__dirname, '..', 'backup', 'counts_db');
    backup_single_db(dbPath, countsBackupDir, maxBackups);

    const pgBackupDir = path.join(__dirname, '..', 'backup', 'posts_db');
    backup_pg(pgBackupDir, maxBackups);
}

if (require.main === module) {
    backup_db();
}

module.exports = { backup_db };
