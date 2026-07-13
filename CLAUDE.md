# CLAUDE.md

@.claude/best_practices.md

## プロジェクト概要

[SOTA (Summits On The Air)](https://www.sota.org.uk/) の地図・データベース Web フロントエンド。
[manuelkasper/sotlas-frontend](https://github.com/manuelkasper/sotlas-frontend) の fork で、
機能追加・修正は上流への Pull Request を前提に進める。上流への投稿は非署名
（グローバル CLAUDE.md の署名ルールに従う。詳細は `report-container-issue` skill 参照）。

- 技術スタック: Vue（バージョンと可否は当該ブランチの `package.json` を正とする。`master` は **2.7**・EOL で
  Vue 3 専用 API・Vue 3 前提の依存やコードは提案しない。`feat/vue3-migration` は Vue 3 移行中で本制約の対象外）
  / Vite 6 / Buefy (Bulma) / vue-mapbox（実体は MapLibre）
- テストスイートはなし。`npm run lint`（eslint）が唯一の機械的チェック

## ブランチ・PR 運用

- **master = upstream/master + ローカルパッチ**。純ミラーブランチは持たない。上流と同期する場合は
  `git fetch upstream && git rebase upstream/master && git push --force-with-lease origin master`
  で行う（GitHub の "Sync fork" ボタンは merge コミットを作ってしまうため使わない）。force push 前に
  必ずユーザーへ確認する
- **ローカルパッチ**（上流には出さない master 固有の差分）: コンテナ/セッション運用整備関連
  （`.claude/` 配下の research/plans 等を含む・`.claude-container.d/`・`.gitignore`・本ファイル自身）。
  網羅列挙はしない。実態は `git diff upstream/master --stat -- .` 等で都度確認する
  （→「FontAwesome Pro 事情」）
- **機能開発・PR**: `master` から `feat/<slug>` を切って実装する。upstream への PR 提出を前提とする
  ブランチのため、コミットメッセージは最初から英語で書く（グローバル CLAUDE.md のコミット日本語
  規約の例外。書き直し工数・書き直し漏れを避けるため。ローカルパッチ相当のコミットは対象外で
  従来どおり日本語 → 「ローカルパッチ」項参照）。本ルールは新規に切る `feat/<slug>` から適用し、
  `feat/vue3-migration` 等の既存進行中ブランチは現行の日本語コミットのまま継続する（遡及的な
  書き直しはしない）。上流への PR を出す前に
  `git rebase --onto upstream/master master feat/<slug>` でローカルパッチ分を除いた状態にしてから出す
- **push・PR 作成はホスト側で行う**（コンテナ内の PAT は Issues 限定スコープで push 不可。詳細は
  「コンテナ開発」参照）。PR 作成は `git push` 後に GitHub の Web UI（Compare & pull request）で行う

## FontAwesome Pro 事情

`npm install` に `NPM_FONTAWESOME_TOKEN` は不要（Pro トークン非保持でも free フォールバックでビルドできる
upstream 本体の機能。fork 独自パッチではない。機構詳細は README.md「FontAwesome Pro (optional)」節を参照）。

## コーディング規約

- **コード内コメント**: 英語で統一する（upstream メンテナが PR 化の有無に関わらず読む可能性が
  あるため）。既存の日本語コメントは気づいた範囲で修正してよい（大規模な一括置換はしない）

## lint

- 集約 target: `npm run lint`（eslint --ext .js,.vue src）。警告ゼロを既定とする
  （グローバル CLAUDE.md 原則6「機械的チェックの警告をゼロに保つ」参照）

## 検証方法

- **コンテナ内での WebUI 動作確認**: Playwright MCP（リポジトリルート `.mcp.json`、コンテナ内 headless
  Chromium）を第一手段とする。`npm run dev` を run_in_background で起動 → MCP のブラウザツールで対象
  ページへ navigate → スクリーンショット・console/network を実データで確認する。dev サーバとブラウザを
  両方コンテナ内で動かすため、ポート非公開は支障にならない
  - コンテナリビルド直後（npx キャッシュが空の最初のセッション）は
    `npx -y @playwright/mcp@<.mcp.json記載バージョン> --help` で warmup してから使う
    （初回ダウンロード分のタイムアウト回避）
  - MCP バージョン更新は `.mcp.json` の `@x.x.x` を手動で上げてから動作確認する
  - セッション異常終了で headless chromium が残ることがある。`pkill -f chromium` で掃除できる
  - **既知の制約**: Turnstile（`challenges.cloudflare.com`、地図描画に必要な MapTiler キー取得の前提）が
    ヘッドレスブラウザの bot 検知で通過できない場合がある。地図が描画されない場合は非地図箇所の検証に
    留め、地図の見た目確認は下記のホスト側手段を使う
  - ホスト側で `claude` を起動した場合、`/usr/bin/chromium`（コンテナ専用に導入）が無いため MCP の
    ブラウザ起動はエラーになる
- **ホスト側での動作確認**: 上記で確認できない場合（ヘッドフル確認・Turnstile 不通過時の地図確認等）の
  補助手段として、ホスト側で `npm run dev` を実行し実ブラウザで確認する
- コンテナ内では上記に加え `npm run lint` / `npm run build` / curl 等での疎通確認も行う

## 計画・タスク管理

- Plan Mode の計画は `.claude/plans/<slug>.md` に置く。`.claude/settings.json` の
  `plansDirectory: ".claude/plans"` により plan ファイルは最初からリポジトリ内に生成されるため、
  承認後の `mv` は不要。万一 `~/.claude/plans/`（ホーム配下・グローバル）に生成された場合は
  設定が効いていないサインなので、異常として報告した上で `mv` で `.claude/plans/` へ移動する
- 計画ファイルのコミット・削除タイミングは `~/.claude/CLAUDE.md`「1. 計画を優先する」節の
  全プロジェクト共通ルールに従う（承認に至らず放棄された下書きが未追跡ファイルとして残っていたら、
  気づいた時点で削除してよい）
- 軽微な実装タスクの管理は GitHub Issues で行う（→「課題管理（GitHub Issues）」節参照）

## コンテナ開発

`../claude-container` を使ってサンドボックス化されたコンテナ内で開発できる。

- 起動: `../claude-container/claude-container -b ~/sota/sotlas-frontend`（初回・設定変更後は `-b` 必須）
- Node は `.claude-container.d/node-version.txt`（nodejs.org 公式 tarball を `/usr/local/bin` へ導入する
  claude-container の専用機構）で `package.json` の `engines`（22.x）と一致するバージョンを指定している。
  `packages.txt` に `nodejs`/`npm` を追加しても PATH 優先順位（`/usr/local/bin` が `/usr/bin` より先）で
  常に上書きされ無意味なので置かない
- コンテナはポートを公開しない。ブラウザ確認の方法は上記「検証方法」を参照
- issue 連携用の PAT は `.claude-container.d/env`（gitignore 対象）の `GH_TOKEN_FILE` で渡す

## 課題管理（GitHub Issues）

軽微な実装タスク・バックログの管理は `jj1xgo/sotlas-frontend` への GitHub Issues で行う
（グローバル CLAUDE.md「GitHub Issues による課題管理（opt-in）」節参照）。

- **ラベル体系**: `enhancement`（GitHub 既定）・`on-hold`（保留。本文に再検討トリガーを明記する
  ものだけに使う）
- **署名**: 自リポジトリ（ユーザー所有）への投稿のためモデル名のみ（例: `— <実行中のモデル名>`）
- `.claude/plans/<slug>.md` の実装計画ファイル運用は本節の対象外。「計画・タスク管理」節のとおり
  Plan Mode 承認後の個別タスクに引き続き使う
- session-start hook が open issue の状態を自動確認し注入する（フェイルソフト。`gh` 不在・API 失敗時は
  一行メッセージのみでスキップ）

## 環境課題の連携（claude-container への issue 起票）

sotlas-frontend 自体の仕様・実装ではなく、コンテナ環境（claude-container）に起因する問題・要望は
本リポジトリの GitHub Issues ではなく **`jj1xgo/claude-container` に起票する**（誤ったリポジトリへの
起票が最悪の失敗パターンのため、これだけは本文に残す）。起票・署名・クローズの具体的な手順は
`report-container-issue` skill を参照する。

## Best Practices（教訓蒸留）運用ルール

- 学びは `.claude/lessons.md` に随時記録する（git 管理外・コミット不要）
- `/update-best-practices`（グローバルコマンド）が `.claude/lessons.md` を再分析し、
  `.claude/best_practices.md`（git 管理対象）を再合成する。蒸留観点・原則数の既定と
  watermark 更新・コミットはコマンド側で完結する
- lessons.md が一定量増えるとセッション開始時に実行が自動的に推奨される（hooks 側で検知）
- `.claude/best_practices.md` が新規生成された時点で、本ファイル（CLAUDE.md）冒頭に
  `@.claude/best_practices.md` のインポート行を追記する（ファイルは存在するのに読み込まれない
  サイレント失効を防ぐため）
