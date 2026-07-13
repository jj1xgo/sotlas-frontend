# CLAUDE.md

## プロジェクト概要

[SOTA (Summits On The Air)](https://www.sota.org.uk/) の地図・データベース Web フロントエンド。
[manuelkasper/sotlas-frontend](https://github.com/manuelkasper/sotlas-frontend) の fork で、
機能追加・修正は上流への Pull Request を前提に進める。上流への issue・コメント投稿には
署名を付けない（署名ルールはユーザー所有リポジトリへの投稿限定。→「環境課題の連携」ルール3）。

- 技術スタック: Vue **2.7**（EOL。Vue 3 専用 API・Vue 3 前提の依存やコードは提案しない）/ Vite 6 / Buefy (Bulma) / vue-mapbox（実体は MapLibre）
- テストスイートはなし。`npm run lint`（eslint）が唯一の機械的チェック

## ブランチ・PR 運用

- **master = upstream/master + ローカルパッチ**。純ミラーブランチは持たない。上流と同期する場合は
  `git fetch upstream && git rebase upstream/master && git push --force-with-lease origin master`
  で行う（GitHub の "Sync fork" ボタンは merge コミットを作ってしまうため使わない）。force push 前に
  必ずユーザーへ確認する
- **ローカルパッチ**（上流には出さない master 固有の差分）: コンテナ/セッション運用整備一式
  （`.claude/`・`.claude-container.d/`・`.gitignore`・本ファイル自身）に加え、`src/store.js`・
  `src/App.vue` のコンテナ内 Turnstile 検証バイパス（issue #18。開発ビルド限定、詳細は
  `src/store.js` のコメント参照）がある。FontAwesome Pro なしで
  ビルドする仕組みは upstream 本体（PR #43 マージ済み）に取り込まれたため、ローカルパッチとしては
  存在しない（詳細は後述「FontAwesome Pro 事情」）
- **機能開発・PR**: `master` から `feat/<slug>` を切って実装する。上流への PR を出す前に
  `git rebase --onto upstream/master master feat/<slug>` でローカルパッチ分を除いた状態にしてから出す。
  rebase 前に `git log --stat` で対象ブランチのコミット内容を確認し、ローカルパッチ由来の変更が
  機能実装コミットに混在していないか確認する（単純 rebase では混入分を機械的に除けない場合がある）
- **push・PR 作成はホスト側で行う**（コンテナ内の PAT は Issues 限定スコープで push 不可。詳細は
  「コンテナ開発」参照）。PR 作成は `git push` 後に GitHub の Web UI（Compare & pull request）で行う

## FontAwesome Pro 事情

このプロジェクトは本来 FontAwesome Pro（有料）のアイコンセットに依存しているが、開発者は Pro
トークンを持っていない。この課題（上流の
[issue #23](https://github.com/manuelkasper/sotlas-frontend/issues/23)）は、本フォークが提案した
PR #43（`Make FontAwesome Pro icons optional with automatic free fallback`）で upstream 本体に
解決策が取り込まれ済み（機構詳細は README.md「FontAwesome Pro (optional)」節を参照）。

そのため `npm install` に `NPM_FONTAWESOME_TOKEN` は不要。ローカルパッチではなく upstream 本体の
機能なので、fork 同期のたびに自動的に追従する。

## lint

- 集約 target: `npm run lint`（eslint --ext .js,.vue src）。警告ゼロを既定とする
  （グローバル CLAUDE.md 原則6「機械的チェックの警告をゼロに保つ」参照）

## 検証方法

- ブラウザでの動作確認（dev サーバ）は**ホスト側**で `npm run dev` を実行する。コンテナはポートを
  公開していないため、コンテナ内で dev サーバを起動してもホストのブラウザからは届かない
- コンテナ内では `npm run lint` / `npm run build` / curl 等での疎通確認までを行う
- 例外として、コンテナ内 Playwright MCP を使えば限定的なブラウザ検証も可能（ポート非公開とは別軸で、
  dev サーバとブラウザが同一コンテナ内で完結するため到達可能）。`.mcp.json`（`feat/vue3-migration`
  由来）を検証時のみ一時コピーし、検証後は削除してコミットしない。Cloudflare Turnstile がヘッドレス
  ブラウザの bot 検知で通過できないため、Turnstile が絡む画面は issue #18 のバイパス
  （`VITE_MAPTILER_DEV_KEY`）が前提

## 計画・タスク管理

- Plan Mode の計画は `.claude/plans/<slug>.md` に置く。`.claude/settings.json` の
  `plansDirectory: ".claude/plans"` により plan ファイルは最初からリポジトリ内に生成されるため、
  承認後の `mv` は不要。万一 `~/.claude/plans/`（ホーム配下・グローバル）に生成された場合は
  設定が効いていないサインなので、異常として報告した上で `mv` で `.claude/plans/` へ移動する
- `.claude/plans/<slug>.md` は承認後の作成・更新・削除のいずれも、そのターン内にコミットする
  （削除は完了後、区切りがついたら `git rm` で行う。作業が中断・持ち越しで handover を書く場合は残す。
  承認に至らず放棄された下書きが未追跡ファイルとして残っていたら、気づいた時点で削除してよい）
- 軽微な実装タスクの管理は GitHub Issues で行う（→「課題管理（GitHub Issues）」節参照）
- handover ファイル名の日時は `date '+%Y-%m-%d_%H%M'` で実時刻を取得する（推測しない）

## コンテナ開発

`../claude-container` を使ってサンドボックス化されたコンテナ内で開発できる。

- 起動: `../claude-container/claude-container -b ~/sota/sotlas-frontend`（初回・設定変更後は `-b` 必須）
- Node は `.claude-container.d/node-version.txt` で `package.json` の `engines`（22.x）と
  一致するバージョンを導入している（`.claude-container.d/packages.txt` に apt 版は置かない）
- コンテナはポートを公開しない。ブラウザ確認は上記「検証方法」のとおりホスト側で行う
- issue 連携用の PAT は `.claude-container.d/env`（gitignore 対象）の `GH_TOKEN_FILE` で渡す

## 課題管理（GitHub Issues）

軽微な実装タスク・バックログの管理は `jj1xgo/sotlas-frontend` への GitHub Issues で行う
（グローバル CLAUDE.md「GitHub Issues による課題管理（opt-in）」節参照）。

- **対象リポジトリ**: `jj1xgo/sotlas-frontend`
- **ラベル体系**: `enhancement`（GitHub 既定）・`on-hold`（保留。本文に再検討トリガーを明記する
  ものだけに使う）
- **署名**: 自リポジトリ（ユーザー所有）への投稿のためモデル名のみ（例: `— Sonnet 5`）
- `.claude/plans/<slug>.md` の実装計画ファイル運用は本節の対象外。「計画・タスク管理」節のとおり
  Plan Mode 承認後の個別タスクに引き続き使う
- session-start hook が open issue の状態を自動確認し注入する（フェイルソフト。`gh` 不在・API 失敗時は
  一行メッセージのみでスキップ）

## 環境課題の連携（claude-container への issue 起票）

sotlas-frontend 自体の仕様・実装ではなく、コンテナ環境（claude-container）に起因する問題・要望は
本リポジトリ（jj1xgo/sotlas-frontend）の GitHub Issues ではなく `jj1xgo/claude-container` への
GitHub issue で起票する。

**判定基準**: 問題の原因・対応先がコンテナ環境側にある → claude-container への `gh issue`。
sotlas-frontend 自身の問題 → 本リポジトリ（jj1xgo/sotlas-frontend）の GitHub Issues。

**フロー**: 起票 → （claude-container 側が調査・実装・対応完了コメント）→ 対応待ち →
**リビルド後**に動作確認 → 確認内容をコメントに付記してクローズ。

**ルール**:

1. クローズは原則起票側（sotlas-frontend）が動作確認後に行う。例外: 調査の結果「仕様どおり・
   対応不要」と判明した場合は、対応側（claude-container）が説明コメント付きでクローズすることがある
2. 動作確認は稼働中コンテナでは不十分になりうるため、リビルド（`-b`）後に行う
3. AI が起票・コメント・クローズする場合は、本文の**末尾に署名**として記入する。claude-container は
   sotlas-frontend 作業中のセッションから見て異なるリポジトリ（クロスリポジトリ連携）にあたるため、
   グローバル CLAUDE.md の署名ルールに従いモデル名に `(sotlas-frontend)` を付記する
   （例: `— Sonnet 5 (sotlas-frontend)`）。経緯の説明文は書かない。
   **この署名ルールはユーザー所有リポジトリへの投稿に限る**。
   外部プロジェクト（upstream 等）への issue・コメント投稿には署名を付けない
4. 起票先リポジトリ名・仕様は推測せず、不明な場合はユーザーに確認してから起票する
5. 1 issue 1 論点

**注記**: `gh` の利用可否・session-start hook の挙動は「課題管理（GitHub Issues）」節を参照。

## Best Practices（教訓蒸留）運用ルール

- 学びは `.claude/lessons.md` に随時記録する（git 管理外・コミット不要）
- `/update-best-practices`（グローバルコマンド）が `.claude/lessons.md` を再分析し、
  `.claude/best_practices.md`（git 管理対象）を再合成する。蒸留観点・原則数の既定と
  watermark 更新・コミットはコマンド側で完結する
- lessons.md が一定量増えるとセッション開始時に実行が自動的に推奨される（hooks 側で検知）
