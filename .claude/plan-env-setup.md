# sotlas-frontend 開発環境整備計画

## Context

sotlas-frontend（manuelkasper/sotlas-frontend の fork。上流 PR 前提で開発）の開発基盤を、findsummits / claude-container と同じ運用体系に載せる。最終目標は機能①（アクティベーションゾーン表示の日本サミット追従）と②（地図の夜間帯オーバーレイ）の上流 PR だが、**本計画は環境整備まで**。機能開発と FA-free の上流共有（issue #23 へのコメント）はスコープ外とし、todo.md に保留項目として記録する。

このセッションで確定した設計判断:

- **master 運用**: master = upstream/master + ローカルパッチ（rebase + force-with-lease 同期）。純ミラーブランチは持たない。devel は役目を終えており削除する
- **FontAwesome Pro**: トークンを持っていないため、devel にある stub + vite alias 方式の FA-free パッチが開発の必需品。これを master のローカルパッチにする
- **コンテナ**: ../claude-container を利用。Node は当面 Debian stable の 20.19（vite 6 の対応範囲内）。Node 22 厳密化と gh 更新は claude-container 側課題として issue 起票
- **PM ツール**: claude-container の軽量セット（hooks + todo.md + lessons/best_practices + handover）+ findsummits の issue 連携（起票側）を移植

### 実装セッションが知るべき前提

- リモート: origin=jj1xgo/sotlas-frontend, upstream=manuelkasper/sotlas-frontend。現 master = upstream/master + 管理2コミット（3456968, 5515304）
- ホスト: Debian forky/sid, node v24.18.0, gh なし, git credential.helper=store（push 可能）
- コンテナの gh 2.46.0-3 は PR 系コマンドが破損（Debian bug #1119130）だが issue 系は動作する
- fine-grained PAT は他人のリポジトリに書けない → upstream への push/PR/コメントは常にホスト側・ユーザー経由
- `.claude-container.d/env` の変数は compose.yml が参照するもの（GH_TOKEN_FILE, TZ 等）だけがコンテナに届く

## Phase 0: 計画の保存

- 本計画を `.claude/plan-env-setup.md` へコピーして保存（実装セッションの参照点。完了後に git rm する運用は CLAUDE.md に記載）

## Phase 1: master 再構成（FA-free パッチのローカルコミット化）

ホストで実施。

1. バックアップ: `git branch backup/master-2026-07-04 master`
2. devel から FA-free パッチのみ適用:
   - `git checkout devel -- src/fa-pro-regular-stub.js src/fa-pro-solid-stub.js`
   - `git diff master devel -- .npmrc package.json vite.config.mjs | git apply`
   - **含めない**: `tools/test_language_patch.py`（上流取り込み済みの旧 map-label 用）、`.gitignore`/`CLAUDE.md` の差分（devel が古いだけ）
   - パッチ内容の確認観点: .npmrc の FA レジストリ2行がコメントアウト、package.json の pro 2パッケージ → `free-regular` 1つ、vite.config.mjs に alias 3行（pro→stub ×2、`vue/dist/vue.esm`）
3. lock 再生成: `rm -rf node_modules package-lock.json && npm install`（free 構成の lock になる。npm.fontawesome.com 参照が消えることを `grep -c fontawesome.com package-lock.json` で確認）
4. 1コミットにまとめる（例: `chore: FontAwesome Proなしでビルド可能にするローカルパッチ（stub+alias方式）`。本文に「上流にはPRしない恒久ローカルパッチ」「関連: upstream #23」を明記）
5. `git push origin master`（fast-forward。force 不要）

**検証**: `npm ci && npm run lint && npm run build` が成功。`npm run dev` をホストで起動し、トップページと summit ページでアイコンが表示されること（= stub 解決の実地確認）。

## Phase 2: コンテナ設定ファイルの作成（ホスト。起動はまだしない）

1. ファイル作成（いずれも git 管理・ローカルパッチとしてコミット）:
   - `.claude-container.d/packages.txt`: `nodejs` と `npm` の2行（+ 用途コメント）
   - `.claude-container.d/allowed-domains.txt`: `registry.npmjs.org` 1行（+ コメント。FA-free 化済みのため npm.fontawesome.com は不要）
   - `.gitignore` に `.claude-container.d/env` を追記
2. コミット（例: `chore: claude-container用のプロジェクト設定を追加`）→ push

## Phase 3: PM ツール導入 + CLAUDE.md 整備（ホスト。コンテナ起動前に済ませ、初回コンテナセッションから hook を効かせる）

→ 内容は下記「Phase 3 詳細」参照（旧 Phase 4 と同一）

## Phase 4: コンテナのビルド・動作確認（チェックポイント）

1. **ユーザー作業**: `~/sota/claude-container/claude-container -b ~/sota/sotlas-frontend` でビルド・起動
2. **検証**（初回コンテナ内セッションで実施するチェックリスト。todo.md に転記しておく）:
   - session-start hook が動作し handover 等が注入される（gh 未設定の間は「gh 不在/未認証スキップ」の一行になる想定）
   - `node --version` → v20.19.x / `git rev-parse HEAD` が動く（vite.config の COMMITHASH 用）
   - `rm -rf node_modules && npm ci && npm run lint && npm run build` が firewall 内で完走
   - ブラウザ確認はホスト側 `npm run dev` で行う（コンテナはポート非公開。CLAUDE.md に明記）
3. **ここで一旦停止し、動作確認の結果をユーザーへ報告。ユーザーの GO が出てから Phase 5 へ進む**

## Phase 5: issue 連携セットアップ + claude-container へ起票2件（コンテナ動作確認後）

1. **ユーザー作業**: fine-grained PAT 作成（Repository access: `jj1xgo/claude-container` のみ / Permissions: Issues Read and write / 有効期限は短め）→ `/home/tsu/.config/claude-container/sotlas-frontend-gh-token` に保存し `chmod 600`
2. `.claude-container.d/env`（gitignore 済み）を作成: `GH_TOKEN_FILE=/home/tsu/.config/claude-container/sotlas-frontend-gh-token`
   - env はランタイム設定（起動ごとに読み直し）のため**リビルド不要**。コンテナを再起動するだけで反映される
3. 再起動後のコンテナ内セッションから `gh issue create --repo jj1xgo/claude-container` で起票（findsummits ルール踏襲: 1 issue 1 論点、本文末尾にモデル名のみ署名）:
   - **Issue A: プロジェクト側ビルドフックの追加提案** — 動機: sotlas-frontend の engines(node 22.x) 厳密対応。Debian は stable=20.19 / testing=24.18 / backports=なし で apt では 22 が入手不可。提案: `.claude-container.d/` にプロジェクト側スクリプト（例: `build-setup.sh`）を置けたらビルド時に RUN する汎用フック。用途は公式 tarball の Node 22 を /usr/local へ展開。セキュリティ考慮（ビルドコンテナ内 root で任意コード実行になるため「レビュー済みスクリプトのみ置く」前提の README 明記）も本文に含める
   - **Issue B: gh を GitHub 公式 apt リポジトリからの導入へ切り替え** — 動機: trixie の gh 2.46.0-3 は GitHub API 変更で PR 系コマンドが全リポジトリで失敗（Debian bug #1119130、severity: serious。issue 系は動作）。Debian の gh は upstream から46版遅れ。提案: Dockerfile の固定 apt 層で cli.github.com/packages から導入
4. 対応待ちの間は Node 20 のまま開発継続（ブロッカーではない）

## Phase 3 詳細: PM ツール導入 + CLAUDE.md 整備

1. `.claude/settings.json`: `/home/tsu/sota/claude-container/.claude/settings.json` をそのままコピー（SessionStart: startup|resume|clear|compact → session-start.sh / PostToolUse: Write|Edit → lint-posttool.sh / skipDangerousModePermissionPrompt: true — 既存2プロジェクトと同運用）
2. `.claude/hooks/session-start.sh`: `/home/tsu/sota/claude-container/.claude/hooks/session-start.sh`（118行）をコピーし、`/home/tsu/sota/findsummits/.claude/hooks/session-start.sh` の 83〜103行（claude-container 宛 open issue の gh 確認・注入ブロック、起票側文言「対応完了コメント済みのものがあればリビルド後に動作確認しクローズ」）を末尾側にマージ
3. `.claude/hooks/lint-posttool.sh`: claude-container 版（shellcheck 用）を雛形に eslint 版を新規作成:
   - jq で `tool_input.file_path` を取得、`$CLAUDE_PROJECT_DIR` 配下の `*.js` / `*.vue` のみ対象（`.claude/` `node_modules/` は除外）
   - `npx --no-install eslint <file>` を実行し、違反があれば additionalContext で返す
   - fail-soft: jq / node_modules(eslint) 不在時は警告 or スキップ
4. `.claude/todo.md` 新規作成。初期内容: 保留項目として (a) 機能① AZ 日本追従（着手時に個別計画）(b) 機能② 夜間オーバーレイ（同）(c) FA-free 方式の #23 コメント共有（環境構築後。投稿前に内容をユーザーへ説明）(d) Issue A 対応後の Node 22 化リビルド確認 (e) Issue B 対応後の gh 動作確認 (f) Phase 2 のコンテナ内検証チェックリスト
5. `.claude/lessons.md` を空テンプレで作成（gitignore 済み・コミットしない）
6. `CLAUDE.md` 整備（既存の best_practices セクションは維持し、以下を追加）:
   - プロジェクト概要（fork 関係・Vue 2.7 / Vite 6 / Buefy・テストスイート無し）
   - ブランチ・PR 運用（master = upstream + ローカルパッチ / 同期: `git fetch upstream && git rebase upstream/master && git push --force-with-lease origin master`、force push 前にユーザー確認 / GitHub の Sync fork ボタン不使用 / PR: feat/x を master から切り、PR 前に `git rebase --onto upstream/master master feat/x` でローカルパッチを外す / push・PR 作成はホスト側）
   - FontAwesome Pro 事情（トークン無し前提・stub+alias 機構の説明・上流 #23 との関係）
   - lint 集約 target: `npm run lint`（eslint。警告ゼロ運用）
   - 検証方法（dev サーバはホスト `npm run dev`、コンテナ内は lint/build/curl まで）
   - 計画・タスク管理のパス（`.claude/plan-<slug>.md` / `.claude/todo.md` / `.claude/lessons.md`。運用は claude-container の CLAUDE.md「計画ファイル・handover の扱い」節に準拠、handover 日時は `date` コマンドで取得）
   - セッション開始ルーティン（`.claude/handovers/` 最新1件 + lessons 未蒸留分は hook が自動注入）
   - コンテナ開発（起動コマンド・Node 20 暫定の注意・`.claude-container.d/` の説明）
   - 環境課題の連携（claude-container への issue 起票。findsummits CLAUDE.md「環境課題の連携」節を sotlas 用に簡約: 判定基準 = コンテナ環境起因 → claude-container へ gh issue / それ以外 → todo.md。フロー・クローズ役割分担・モデル名署名・gh はコンテナ内のみ）
7. コミット（`.claude/settings.json` `hooks/` `todo.md` `CLAUDE.md` は git 管理）→ push

**検証**:
- `bash .claude/hooks/session-start.sh` を手動実行し、handover 注入・インシデント 0 件・（gh 不在スキップの一行）が出力されること
- lint hook: 故意に違反を含む一時 .js ファイルを作り `echo '{"tool_input":{"file_path":"<path>"}}' | CLAUDE_PROJECT_DIR=$PWD bash .claude/hooks/lint-posttool.sh` で違反 JSON が返ること（確認後に一時ファイル削除）
- `npm run lint` が警告ゼロであること

## Phase 6: クリーンアップ + 引き継ぎ

1. devel 削除（Phase 1 の検証成功が前提）: `git branch -D devel && git push origin --delete devel`（backup/master-2026-07-04 と旧 backup ブランチは残す）
2. `.claude/lessons.md` へ本セッション由来の学びを記録（handover の「学び」から転記）
3. `/handover` 実行を促す

## フェーズ順序の要点

ホスト作業（Phase 1〜3: git 再構成・コンテナ設定・PM ツール）を先に完結 → ユーザーがビルド（Phase 4）→ **動作確認の報告後にユーザーの GO を待つ** → PAT 作成・env 設定・issue 起票（Phase 5）→ クリーンアップ（Phase 6）。Phase 4 と 5 の間がユーザー作業（PAT）のチェックポイント。

## モデル分担

全タスク Sonnet 直接実装可（設計判断は本計画で確定済み。上位モデル委譲の3条件に該当するタスクなし）。実装中に仕様解釈が複数成立する事態が生じた場合のみ、グローバル CLAUDE.md のルールに従い Fable サブエージェントを起動する。

## ユーザー作業（Claude が依頼するタイミングで実施）

1. Phase 4-1: コンテナのビルド起動 `~/sota/claude-container/claude-container -b ~/sota/sotlas-frontend`
2. Phase 4-3: 動作確認報告を受けて Phase 5 進行の GO 判断
3. Phase 5-1: PAT 作成・配置（手順は上記）
4. force push が必要になる場面は本計画には無い（同期規約として CLAUDE.md に記載のみ）

## 検証まとめ（完了条件）

- ホスト: `npm ci && npm run lint && npm run build` 成功、`npm run dev` でアイコン表示
- コンテナ: 初回セッションで node 20.19 / npm ci / lint / build 完走、gh で issue 2件が起票済み
- hooks: session-start 手動実行と lint hook のテスト出力確認
- git: master に FA-free パッチ + コンテナ設定 + PM ツールのコミットが積まれ push 済み、devel 削除済み
