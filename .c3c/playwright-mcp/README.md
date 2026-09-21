# Playwright MCP（lockfile 固定ローカルインストール）

`.mcp.json` の `playwright` サーバーが起動時に読み込む `@playwright/mcp` の実体。
claude-container v5.0.0 の stdio 型起動時 TTY 確認ゲート対応で、`npx` の実行時取得を避けるため
このディレクトリで exact pin してローカルインストールしている（詳細: 内部運用issue参照）。

## 初回セットアップ

`node_modules/` は git 管理外のため、clone 直後や新しい checkout ではこのディレクトリで `npm ci` を
実行する。未実行だとセッション起動時に playwright MCP が「Connection closed」で接続に失敗する
（エラーメッセージからは原因が分からないので注意）。

## バージョン更新手順

1. `package.json` の `@playwright/mcp` バージョンを上げる
2. このディレクトリで `npm install` を実行し `package-lock.json` を更新する
3. `.mcp.json` 側のパス指定（`node_modules/@playwright/mcp/cli.js`）は変更不要
