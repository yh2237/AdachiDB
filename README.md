# AdachiDB (足立語録検索)

足立レイのツイートを収集し、検索・ランダム表示するためのAPIサーバーおよびフロントエンドです。

フロントエンドは `https://adachi.2237yh.net` で使用しているものなので必要に応じて変更が必要です。

## 必須要件

-   [Node.js](https://nodejs.org/)

## セットアップ

1.  リポジトリをクローンします。

    ```bash
    git clone https://github.com/yh2237/AdachiDB.git
    cd AdachiDB
    ```
2.  依存関係をインストールします。

    ```bash
    npm install
    ```

3.  設定ファイルを準備します。`config/config.yml` を環境に合わせて編集してください。

    ```yaml
    server:
      url: 'localhost' # サーバーのURL
      port: 3000       # サーバーのポート
      frontend: true   # フロントエンドを有効にするか
      openAPI: true    # APIを外部公開するか (CORS設定)
      banner: true     # 起動時にバナーを表示するか

    backup:
      enable: true     # DBの自動バックアップを有効にするか
      interval: 30     # バックアップ間隔 (分)
      keep: 16         # 保持するバックアップ数

    database:
      dbName: 'adachiPosts.db' # データベースファイル名

    scraping:
      # ... Webスクレイピングに関する設定 ...
    ```

4.  データベースの初期化、データのスクレイピング、oEmbedとツイート本文の取得を行います。

    ```bash
    npm run db:init
    npm run db:collect
    npm run worker
    ```

    `npm run worker` は、処理するデータがありませんといわれるまで放置してください（かなりの時間がかかります）。

5. 以下のコマンドでAPIサーバーとWebフロントエンドを起動します。

    ```bash
    npm run server
    ```

    必要に応じてpm2やsystemdを使ってください

## スクレイピングについて

  この `AdachiDB` では、Entac([@herrkf](https://x.com/herrkf))さんによる[足立レイ語録をまとめてみた](https://herrkf.com/adachi-words)にまとめられている足立レイのツイートのURLをスクレイピングすることでツイートを集めています

  収集スクリプトを実行しない限り既にDBに保存されているツイートを使用します

  **過度な収集スクリプトの実行をしないでください**

## APIエンドポイント

-   `GET /api/posts/random`
    -   データベースからランダムな投稿を1件取得します。oEmbedとツイート本文が未取得の場合は同時に取得を試みます。
-   `GET /api/posts/random10`
    -   ランダムな投稿を10件取得します。oEmbedとツイート本文が未取得の場合は同時に取得を試みます。
-   `GET /api/posts/search?q={query}`
    -   ツイート本文を検索し、一致する投稿を返します。
-   `GET /api/pending-count`
    -   まだoEmbedが取得できていない投稿の数を返します。
-   `GET /api/pending-text-count`
    -   まだツイート本文が取得できていない投稿の数を返します。

## スクリプト

-   `npm run db:backup`
    -   データベースのバックアップを手動で作成します。
-   `npm run db:clear`
    -   データベース内のすべてのツイートとoEmbed、ツイート本文を削除します。
-   `npm run db:init`
    -   データーベースを初期化します
-   `npm run db:collect`
    -   ツイートURLを収集してきます。
-   `npm run worker`
    -   まだoEmbedとツイート本文が未取得のURLを探して取得します。
-   `npm run db:add_url -- <url>`
    -   指定したURLをデータベースに追加します。
-   `npm run db:delete_url -- <url>`
    -   指定したURLをデータベースから削除します。