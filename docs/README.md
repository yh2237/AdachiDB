# AdachiDB

足立レイのツイートをランダム表示、検索するためのAPIサーバーおよびフロントエンド

## APIエンドポイント

-   `GET /api/posts/random`
    -   データベースからランダムなツイートを1件取得します。oEmbedとツイート本文が未取得の場合は同時に取得を試みます。
-   `GET /api/posts/random10`
    -   ランダムなツイートを10件取得します。oEmbedとツイート本文が未取得の場合は同時に取得を試みます。
-   `GET /api/posts/search?q={query}&limit={limit}`
    -   ツイート本文を検索し、一致するツイートを返します。
-   `GET /api/posts/id?id={id}`
    -   特定のIDのツイートを返します
-   `GET /api/posts/all?limit={limit}`
    -   limitの数だけツイートをIDが上の順から返します。
-   `GET /api/pending-count`
    -   まだoEmbedが取得できていないツイートの数を返します。
-   `GET /api/pending-text-count`
    -   まだツイート本文が取得できていないツイートの数を返します。

## スクリプト

-   `npm run db:backup`
    -   データベースのバックアップを手動で作成します。
-   `npm run db:clear`
    -   データベース内のすべてのツイートとoEmbed、ツイート本文を削除します。
-   `npm run db:init`
    -   データーベースを初期化します
-   `npm run db:collect`
    -   [足立レイ語録をまとめてみた](https://herrkf.com/adachi-words) からツイートURLを収集してきます。
-   `npm run worker`
    -   まだoEmbedとツイート本文が未取得のURLを探して取得します。
-   `npm run db:add_url -- <url>`
    -   指定したURLをデータベースに追加します。
-   `npm run db:delete_url -- <url>`
    -   指定したURLをデータベースから削除します。