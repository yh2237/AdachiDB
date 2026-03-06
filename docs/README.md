# AdachiDB

足立レイのツイートをランダム表示、検索するためのAPIサーバーおよびフロントエンド

![](../frontend/img/banner.png)

## APIエンドポイント

- `GET /api/posts/random`
    - データベースからランダムなツイートを1件取得します。oEmbedとツイート本文が未取得の場合は同時に取得を試みます。
- `GET /api/posts/random10`
    - ランダムなツイートを10件取得します。oEmbedとツイート本文が未取得の場合は同時に取得を試みます。
- `GET /api/posts/search?q=a&from={YYYY-MM-DD}&to={YYYY-MM-DD}&limit={limit}`
    - ツイート本文を検索し、一致するツイートを返します。
- `GET /api/posts/id?id={id}`
    - 特定のIDのツイートを返します。
- `GET /api/posts/all?limit={limit}`
    - limitの数だけツイートをIDが上の順から返します。
- `POST /api/posts/add`
    - ツイートURLをデータベースに追加します。
    - リクエストボディ: `{ "url": "https://x.com/..." }`
    - レスポンス: 追加したツイートのデータ（201）
    - エラー: 不正なURL（400）、ツイートが存在しない（404）、重複（409）
- `GET /api/pending-count`
    - まだoEmbedが取得できていないツイートの数を返します。
- `GET /api/pending-text-count`
    - まだツイート本文が取得できていないツイートの数を返します。
- `GET /api/uncreated-count`
    - まだ日付が取得できていないツイートの数を返します。
- `GET /api/status`
    - APIおよびサイトへのアクセス数を返します。

---

## スクリプト

- `npm start`
    - API・WebサーバーとWorkerを同時に起動します。
- `npm run server`
    - API・Webサーバーのみを起動します。
- `npm run worker`
    - Workerのみを起動します。oEmbed・ツイート本文・日付が未取得のURLを探して取得します。
- `npm run db:init`
    - PostgreSQLにテーブルを作成します。
- `npm run db:migrate [sqlite_db_path]`
    - SQLiteのデータをPostgreSQLに移行します。
- `npm run db:clear`
    - データベース内のすべてのツイートデータを削除します。
- `npm run db:backup`
    - PostgreSQLデータベースのバックアップを `backup/posts_db/` に作成します。
- `npm run db:collect`
    - [足立レイ語録をまとめてみた](https://herrkf.com/adachi-words) からツイートURLを収集してデータベースに保存します。
- `npm run db:add_url -- <url>`
    - 指定したURLをデータベースに追加します。
- `npm run db:delete_url -- <url>`
    - 指定したURLをデータベースから削除します。
- `npm run db:import_url`
    - `data/saved_urls.json` からURLをデータベースに一括インポートします。
- `npm run db:db_to_json`
    - データベースの内容をJSONファイルに書き出します。
