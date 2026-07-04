# CLAUDE.md

## プロジェクト概要

[SOTA (Summits On The Air)](https://www.sota.org.uk/) の地図・データベース Web フロントエンド。
[manuelkasper/sotlas-frontend](https://github.com/manuelkasper/sotlas-frontend) の fork で、
機能追加・修正は上流への Pull Request を前提に進める。上流への issue・コメント投稿には
モデル名署名を付けない（署名はユーザー所有リポジトリ限定。→「環境課題の連携」ルール3）。

- 技術スタック: Vue **2.7**（EOL。Vue 3 専用 API・Vue 3 前提の依存やコードは提案しない）/ Vite 6 / Buefy (Bulma) / vue-mapbox（実体は MapLibre）
- テストスイートはなし。`npm run lint`（eslint）が唯一の機械的チェック

## ブランチ・PR 運用

- **master = upstream/master + ローカルパッチ**。純ミラーブランチは持たない。上流と同期する場合は
  `git fetch upstream && git rebase upstream/master && git push --force-with-lease origin master`
  で行う（GitHub の "Sync fork" ボタンは merge コミットを作ってしまうため使わない）。force push 前に
  必ずユーザーへ確認する
- **ローカルパッチ**（上流には出さない master 固有の差分）: 現在は FontAwesome Pro なしでビルドする
  ための stub+alias パッチ（後述）と、この `.claude/` 環境整備一式
- **機能開発・PR**: `master` から `feat/<slug>` を切って実装する。上流への PR を出す前に
  `git rebase --onto upstream/master master feat/<slug>` でローカルパッチ分を除いた状態にしてから出す
- **push・PR 作成はホスト側で行う**（コンテナ内の PAT は Issues 限定スコープで push 不可。詳細は
  「コンテナ開発」参照）。PR 作成は `git push` 後に GitHub の Web UI（Compare & pull request）で行う

## FontAwesome Pro 事情

このプロジェクトは本来 FontAwesome Pro（有料）のアイコンセットに依存しているが、開発者は Pro
トークンを持っていない。そのため master には次のローカルパッチが常時乗っている:

- `.npmrc` の `@fortawesome:registry=https://npm.fontawesome.com/` 行をコメントアウト
- `package.json` の pro パッケージを `free-regular-svg-icons` に置換
- `vite.config.mjs` に alias を追加し、`@fortawesome/pro-regular-svg-icons` /
  `@fortawesome/pro-solid-svg-icons` の import を `src/fa-pro-regular-stub.js` /
  `src/fa-pro-solid-stub.js`（free アイコンで代替実装したスタブ）へ解決する

この仕組みのおかげで `npm install` に `NPM_FONTAWESOME_TOKEN` は不要。関連: 上流の
[issue #23](https://github.com/manuelkasper/sotlas-frontend/issues/23)（同種の課題が
2023年から未解決）。

## lint

- 集約 target: `npm run lint`（eslint --ext .js,.vue src）。警告ゼロを既定とする
  （グローバル CLAUDE.md 原則6「機械的チェックの警告をゼロに保つ」参照）

## 検証方法

- ブラウザでの動作確認（dev サーバ）は**ホスト側**で `npm run dev` を実行する。コンテナはポートを
  公開していないため、コンテナ内で dev サーバを起動してもホストのブラウザからは届かない
- コンテナ内では `npm run lint` / `npm run build` / curl 等での疎通確認までを行う

## 計画・タスク管理

- Plan Mode 承認済みの計画は `.claude/plan-<slug>.md` に置く。`<slug>` は `/plan` が
  `~/.claude/plans/<slug>.md` に生成するファイル名をそのまま流用する
- `.claude/plan-<slug>.md` は作成・更新・削除のいずれも、そのターン内にコミットする
  （削除は完了後、区切りがついたら `git rm` で行う。作業が中断・持ち越しで handover を書く場合は残す）
- 軽微な実装タスクは `.claude/todo.md` に直接書く。完了したものは消す（履歴は git で追える）
- handover ファイル名の日時は `date '+%Y-%m-%d_%H%M'` で実時刻を取得する（推測しない）

## コンテナ開発

`../claude-container` を使ってサンドボックス化されたコンテナ内で開発できる。

- 起動: `../claude-container/claude-container -b ~/sota/sotlas-frontend`（初回・設定変更後は `-b` 必須）
- Node は Debian stable 由来の 20.x 系（`.claude-container.d/packages.txt` で指定）。
  `package.json` の `engines`（22.x）とはずれるが vite 6 の対応範囲内のため実害はない。
  厳密対応は claude-container 側でビルドフック追加提案が対応されてから行う
- コンテナはポートを公開しない。ブラウザ確認は上記「検証方法」のとおりホスト側で行う
- issue 連携用の PAT は `.claude-container.d/env`（gitignore 対象）の `GH_TOKEN_FILE` で渡す

## 環境課題の連携（claude-container への issue 起票）

sotlas-frontend 自体の仕様・実装ではなく、コンテナ環境（claude-container）に起因する問題・要望は
`.claude/todo.md` ではなく `jj1xgo/claude-container` への GitHub issue で起票する。

**判定基準**: 問題の原因・対応先がコンテナ環境側にある → claude-container への `gh issue`。
sotlas-frontend 自身の問題 → 従来どおり `.claude/todo.md` / `.claude/plan-*.md`。

**フロー**: 起票 → （claude-container 側が調査・実装・対応完了コメント）→ 対応待ち →
**リビルド後**に動作確認 → 確認内容をコメントに付記してクローズ。

**ルール**:

1. クローズは原則起票側（sotlas-frontend）が動作確認後に行う。例外: 調査の結果「仕様どおり・
   対応不要」と判明した場合は、対応側（claude-container）が説明コメント付きでクローズすることがある
2. 動作確認は稼働中コンテナでは不十分になりうるため、リビルド（`-b`）後に行う
3. AI が起票・コメント・クローズする場合は、本文の**末尾にモデル名のみを署名**として記入する
   （現在のセッションのモデル名。例: `— Sonnet 5`）。ユーザーアカウントでの投稿が自問自答に見えるのを
   防ぐため。経緯の説明文は書かない。**この署名ルールはユーザー所有リポジトリへの投稿に限る**。
   外部プロジェクト（upstream 等）への issue・コメント投稿には署名を付けない
4. 起票先リポジトリ名・仕様は推測せず、不明な場合はユーザーに確認してから起票する
5. 1 issue 1 論点

**注記**: `gh` はコンテナ内セッションのみ利用可能（ホストセッションには無い）。session-start hook が
起票済み open issue の状態を自動確認し注入する（フェイルソフト。`gh` 不在・API 失敗時は
一行メッセージのみでスキップする）。

## Best Practices（教訓蒸留）運用ルール

- 学びは `.claude/lessons.md` に随時記録する（git 管理外・コミット不要）
- `/update-best-practices`（グローバルコマンド）が `.claude/lessons.md` を再分析し、
  `.claude/best_practices.md`（git 管理対象）を再合成する。蒸留観点・原則数の既定と
  watermark 更新・コミットはコマンド側で完結する
- lessons.md が一定量増えるとセッション開始時に実行が自動的に推奨される（hooks 側で検知）
