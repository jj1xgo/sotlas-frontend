# CLAUDE.md

## プロジェクト概要

[SOTA (Summits On The Air)](https://www.sota.org.uk/) の地図・データベース Web フロントエンド。
[manuelkasper/sotlas-frontend](https://github.com/manuelkasper/sotlas-frontend) の fork で、
機能追加・修正は上流への Pull Request を前提に進める。上流への投稿は非署名
（グローバル CLAUDE.md の署名ルールに従う。詳細は「環境課題の連携」ルール3参照）。

- 技術スタック: Vue（バージョンと可否は当該ブランチの `package.json` を正とする。`master` は **2.7**・EOL で
  Vue 3 専用 API・Vue 3 前提の依存やコードは提案しない。`feat/vue3-migration` は Vue 3 移行中で本制約の対象外）
  / Vite 6 / Buefy (Bulma) / vue-mapbox（実体は MapLibre）
- テストスイートはなし。`npm run lint`（eslint）が唯一の機械的チェック

## ブランチ・PR 運用

- **master = upstream/master + ローカルパッチ**。純ミラーブランチは持たない。上流と同期する場合は
  `git fetch upstream && git rebase upstream/master && git push --force-with-lease origin master`
  で行う（GitHub の "Sync fork" ボタンは merge コミットを作ってしまうため使わない）。force push 前に
  必ずユーザーへ確認する
- **ローカルパッチ**（上流には出さない master 固有の差分）: 現在はコンテナ/セッション運用整備一式
  （`.claude/`・`.claude-container.d/`・`.gitignore`・本ファイル自身）のみ（→「FontAwesome Pro 事情」）
- **機能開発・PR**: `master` から `feat/<slug>` を切って実装する。上流への PR を出す前に
  `git rebase --onto upstream/master master feat/<slug>` でローカルパッチ分を除いた状態にしてから出す
- **push・PR 作成はホスト側で行う**（コンテナ内の PAT は Issues 限定スコープで push 不可。詳細は
  「コンテナ開発」参照）。PR 作成は `git push` 後に GitHub の Web UI（Compare & pull request）で行う

## FontAwesome Pro 事情

`npm install` に `NPM_FONTAWESOME_TOKEN` は不要（Pro トークン非保持でも free フォールバックでビルドできる
upstream 本体の機能。fork 独自パッチではない。機構詳細は README.md「FontAwesome Pro (optional)」節を参照）。

## lint

- 集約 target: `npm run lint`（eslint --ext .js,.vue src）。警告ゼロを既定とする
  （グローバル CLAUDE.md 原則6「機械的チェックの警告をゼロに保つ」参照）

## 検証方法

- ブラウザでの動作確認（dev サーバ）は**ホスト側**で `npm run dev` を実行する。コンテナはポートを
  公開していないため、コンテナ内で dev サーバを起動してもホストのブラウザからは届かない
- コンテナ内では `npm run lint` / `npm run build` / curl 等での疎通確認までを行う

## 計画・タスク管理

- Plan Mode の計画は `.claude/plans/<slug>.md` に置く。`.claude/settings.json` の
  `plansDirectory: ".claude/plans"` により plan ファイルは最初からリポジトリ内に生成されるため、
  承認後の `mv` は不要。万一 `~/.claude/plans/`（ホーム配下・グローバル）に生成された場合は
  設定が効いていないサインなので、異常として報告した上で `mv` で `.claude/plans/` へ移動する
- `.claude/plans/<slug>.md` は承認後の作成・更新・削除のいずれも、そのターン内にコミットする
  （削除は完了後、区切りがついたら `git rm` で行う。作業が中断・持ち越しで handover を書く場合は残す。
  承認に至らず放棄された下書きが未追跡ファイルとして残っていたら、気づいた時点で削除してよい）
- 軽微な実装タスクの管理は GitHub Issues で行う（→「課題管理（GitHub Issues）」節参照）

## コンテナ開発

`../claude-container` を使ってサンドボックス化されたコンテナ内で開発できる。

- 起動: `../claude-container/claude-container -b ~/sota/sotlas-frontend`（初回・設定変更後は `-b` 必須）
- Node は `.claude-container.d/node-version.txt`（nodejs.org 公式 tarball を `/usr/local/bin` へ導入する
  claude-container の専用機構）で `package.json` の `engines`（22.x）と一致するバージョンを指定している。
  `packages.txt` に `nodejs`/`npm` を追加しても PATH 優先順位（`/usr/local/bin` が `/usr/bin` より先）で
  常に上書きされ無意味なので置かない
- コンテナはポートを公開しない。ブラウザ確認は上記「検証方法」のとおりホスト側で行う
- issue 連携用の PAT は `.claude-container.d/env`（gitignore 対象）の `GH_TOKEN_FILE` で渡す

## 課題管理（GitHub Issues）

軽微な実装タスク・バックログの管理は `jj1xgo/sotlas-frontend` への GitHub Issues で行う
（グローバル CLAUDE.md「GitHub Issues による課題管理（opt-in）」節参照）。

- **対象リポジトリ**: `jj1xgo/sotlas-frontend`
- **ラベル体系**: `enhancement`（GitHub 既定）・`on-hold`（保留。本文に再検討トリガーを明記する
  ものだけに使う）
- **署名**: 自リポジトリ（ユーザー所有）への投稿のためモデル名のみ（例: `— <実行中のモデル名>`）
- `.claude/plans/<slug>.md` の実装計画ファイル運用は本節の対象外。「計画・タスク管理」節のとおり
  Plan Mode 承認後の個別タスクに引き続き使う
- session-start hook が open issue の状態を自動確認し注入する（フェイルソフト。`gh` 不在・API 失敗時は
  一行メッセージのみでスキップ）

## 環境課題の連携（claude-container への issue 起票）

sotlas-frontend 自体の仕様・実装ではなく、コンテナ環境（claude-container）に起因する問題・要望は
本リポジトリ（jj1xgo/sotlas-frontend）の GitHub Issues ではなく `jj1xgo/claude-container` への
GitHub issue で起票する。

**フロー**: 起票 → （claude-container 側が調査・実装・対応完了コメント）→ 対応待ち →
**リビルド後**に動作確認 → 確認内容をコメントに付記してクローズ。

**ルール**:

1. クローズは原則起票側（sotlas-frontend）が動作確認後に行う。例外: 調査の結果「仕様どおり・
   対応不要」と判明した場合は、対応側（claude-container）が説明コメント付きでクローズすることがある
2. 動作確認は稼働中コンテナでは不十分になりうるため、リビルド（`-b`）後に行う
3. AI が起票・コメント・クローズする場合は、本文の**末尾に署名**として記入する。claude-container は
   sotlas-frontend 作業中のセッションから見て異なるリポジトリ（クロスリポジトリ連携）にあたるため、
   グローバル CLAUDE.md の署名ルールに従いモデル名に `(sotlas-frontend)` を付記する
   （例: `— <実行中のモデル名> (sotlas-frontend)`）。経緯の説明文は書かない
   （署名ルールの適用範囲・上流への非署名は「プロジェクト概要」節参照）
4. 起票先リポジトリ名・仕様は推測せず、不明な場合はユーザーに確認してから起票する
5. 1 issue 1 論点

**注記**: `gh` の利用可否・session-start hook の挙動は「課題管理（GitHub Issues）」節を参照。

## Best Practices（教訓蒸留）運用ルール

- 学びは `.claude/lessons.md` に随時記録する（git 管理外・コミット不要）
- `/update-best-practices`（グローバルコマンド）が `.claude/lessons.md` を再分析し、
  `.claude/best_practices.md`（git 管理対象）を再合成する。蒸留観点・原則数の既定と
  watermark 更新・コミットはコマンド側で完結する
- lessons.md が一定量増えるとセッション開始時に実行が自動的に推奨される（hooks 側で検知）
