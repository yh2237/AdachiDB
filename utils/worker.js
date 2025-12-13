const { spawn } = require('child_process');
const path = require('path');

const workers = [
  'createdAtWorker.js',
  'embedWorker.js'
];

function startWorker(workerScript) {
  const scriptPath = path.join(__dirname, workerScript);
  const worker = spawn('node', [scriptPath]);

  console.log(`[MasterWorker] ${workerScript} をPID ${worker.pid} で起動しました`);

  worker.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  worker.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  worker.on('close', (code) => {
    console.log(`[MasterWorker] ${workerScript} が終了コード ${code} で停止しました。5秒後に再起動します。`);
    setTimeout(() => startWorker(workerScript), 5000);
  });

  worker.on('error', (err) => {
    console.error(`[MasterWorker] ${workerScript} の起動に失敗しました:`, err);
  });
}

workers.forEach(startWorker);
