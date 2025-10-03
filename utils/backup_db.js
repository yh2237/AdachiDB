const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function backup_db() {
    const configPath = path.join(__dirname, '..', 'config', 'config.yml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

    const dbPath = path.join(__dirname, '..', 'db', config.database.dbName);
    const backupDir = path.join(__dirname, '..', 'backup');
    const maxBackups = config.backup.keep || 16;

    if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
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

module.exports = { backup_db };