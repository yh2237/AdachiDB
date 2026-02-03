const { postsDb: db } = require('./database');
const { snowflakeToDate } = require('./snowflakeToDate');

async function processBatch() {
  const rows = db
    .prepare("SELECT url FROM posts WHERE createdAt IS NULL LIMIT 50")
    .all();

  if (rows.length === 0) return false;

  const updateStmt = db.prepare(
    "UPDATE posts SET createdAt = ? WHERE url = ?"
  );

  const updateTx = db.transaction((posts) => {
    for (const post of posts) {
      const url = post.url;

      const match = url.match(/status\/(\d+)/);
      if (!match) {
        console.warn("[WARN] tweetId を取得できない URL:", url);
        continue;
      }
      const tweetId = match[1];
      const createdAtUTC = snowflakeToDate(tweetId);
      const createdAtJST = new Date(createdAtUTC.getTime() + 9 * 60 * 60 * 1000);
      const formattedDate = createdAtJST
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      updateStmt.run(formattedDate, url);
    }
  });

  updateTx(rows);

  console.log(
    `[INFO] [CreatedAtWorker] ${rows.length}件の createdAt を更新しました`
  );

  return true;
}

async function main() {
  console.log('[INFO] [CreatedAtWorker] createdAtWorker 起動');
  while (true) {
    const processed = await processBatch();
    if (!processed) {
      await new Promise(res => setTimeout(res, 5000));
    } else {
      await new Promise(res => setTimeout(res, 500));
    }
  }
}

main();
