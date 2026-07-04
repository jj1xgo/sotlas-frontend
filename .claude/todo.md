# ToDo リスト

完了したものは消す（履歴は git で追える）。長期保留中のものは「保留」セクションへ。

## 保留

- 機能①: アクティベーションゾーン表示を日本のサミットにも追従させる（着手時に個別計画を作成）
- 機能②: 地図上に夜間帯（ターミネーター）を表示する（着手時に個別計画を作成。参考: https://www.timeanddate.com/worldclock/sunearth.html ）
- FA-free 方式（stub+alias）を upstream issue #23 へコメントで共有するか検討（環境構築完了後。投稿前に内容をユーザーへ説明する）
- claude-container への Issue A（Node 22 用ビルドフック提案）が対応完了になったらリビルドし、Node 22 化を動作確認する
- claude-container への Issue B（gh を公式 apt リポジトリ導入へ切替提案）が対応完了になったらリビルドし、gh pr 系コマンドの動作を確認する

## 環境整備チェックリスト（初回コンテナセッションで実施）

- [ ] session-start hook が動作し handover 等が注入される
- [ ] `node --version` が v20.19.x であること、`git rev-parse HEAD` が動くこと
- [ ] `rm -rf node_modules && npm ci && npm run lint && npm run build` が firewall 内で完走すること
- [ ] ブラウザでのアイコン表示確認はホスト側 `npm run dev` で行う（コンテナはポート非公開）
