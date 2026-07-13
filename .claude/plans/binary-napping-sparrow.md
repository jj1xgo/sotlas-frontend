# Playwright MCP 検証環境の master 系への恒久統合

## Context

issue #18 の Turnstile バイパス（`feat/turnstile-dev-bypass` で実装・コミット済み）の動作検証には
コンテナ内 Playwright MCP が必要だが、今セッションで以下が判明した:

- 検証環境一式（chromium・フォント・allowed-domains・`.mcp.json`）はコミット `a242cb2` で導入されて
  いるが、**`feat/vue3-migration` ブランチにのみ存在**し、master 系（現ブランチ含む）には無い
- 現ブランチの CLAUDE.md「検証方法」節は「`.mcp.json` を一時コピーすれば使える」と記述しているが、
  chromium 本体（`packages.txt`、ビルド時焼き込み）が無いため実際には動かない（記載と実態の不一致）
- MapTiler キーの注入は Fable 諮問で「セッション限定 export 方式」を採用確定（`.env.local` 方式は
  双方向マウントによりホスト側 dev サーバへバイパスが漏れるため却下）
- 検証環境の恒久化方針も Fable 諮問で **B案（master 系ローカルパッチへの恒久統合）を採用確定**
  （一時コピー方式は「ファイルを戻してもビルド済みイメージから chromium は消えない」ため
  設定＝実態の前提が壊れる構造的欠陥がある）

翻案の実体は **a242cb2 + b2c2f4c（`.mcp.json` の viewport 書式・XDG_CONFIG_HOME 修正）+
9f3c234 の一部（packages.txt の apt nodejs/npm 廃止）** の合成。settings.json・README.md・
.gitignore は HEAD 側が別系統に進化しているため単純 cherry-pick 不可、手動翻案する。

## 実装内容（現ブランチ `feat/turnstile-dev-bypass` に積む）

### コミット1: `chore: packages.txtとNode記述をnode-version.txt実態に合わせる`（9f3c234 の翻案）

- `.claude-container.d/packages.txt`: apt `nodejs`/`npm` を削除し、9f3c234 と同旨のコメント
  （node-version.txt に一本化、PATH 優先順位で apt 版より優先）へ差し替え
- `CLAUDE.md`「コンテナ開発」節: 「Node は Debian stable 由来の 20.x 系」→「node-version.txt で
  `engines`（22.x）と一致するバージョンを導入」へ実態合わせ
- ※ 9f3c234 に同梱されている Vue2.7↔vue3 の文書修正5件は vue3 ブランチ固有のため**含めない**

### コミット2: `feat: Playwright MCP検証環境をmaster系ローカルパッチへ恒久統合`

1. `.claude-container.d/allowed-domains.txt`: a242cb2 の追加31行（実ホスト11個 + コメント）を
   そのまま末尾へ追記（現ブランチ側 base と衝突なし、全行流用可）
2. `.claude-container.d/packages.txt`: `chromium`・`fonts-liberation`・`fonts-noto-core`・
   `fonts-noto-cjk` をコメント付きで追記（a242cb2 と同一内容）
3. `.mcp.json`: 現在ワーキングツリーに一時コピー済みのファイル（b2c2f4c 適用後の版と同一、
   `1280x800`・`XDG_CONFIG_HOME` 修正込みを確認済み）をそのまま `git add` で追跡へ昇格
4. `.claude/settings.json`: `"enableAllProjectMcpServers": true` を追加（`plansDirectory` の後）。
   HEAD 固有の `permissions.deny` 等はそのまま維持
5. `.gitignore`: `.claude/playwright-mcp/`（MCP の console ログ・スクリーンショット出力先）と
   `.claude/pr-drafts/`（PR 下書き置き場。vue3 側 base では ignore 済みで HEAD に漏れていた）を追加
6. `.claude/README.md`: ファイル一覧テーブルへ `.mcp.json` 行を追加し、settings.json の説明に
   `enableAllProjectMcpServers` を追記（HEAD 系の記述スタイル・`permissions.deny` 記述と整合させる）
7. `CLAUDE.md`:
   - 「検証方法」節を vue3 側の恒久運用文面をベースに書き換え（一時コピー運用の記述を削除）。
     ただし Turnstile 制約の段落は現ブランチの実態に合わせる: issue #18 バイパスが実装済みなので
     「`VITE_MAPTILER_DEV_KEY` を export してから `npm run dev` を起動する」手順を明記
     （`Bash(env:*)` が deny ルールのため `env` コマンドでなく shell 組み込み `export` +
     `grep/cut` で `.claude-container.d/env` から抽出する1行を記載）
   - 「ブランチ・PR 運用」のローカルパッチ列挙に `.mcp.json` を追記

## このセッションの範囲と制約

- **ファイル変更・コミットまで**を今セッションで行う
- chromium はビルド時焼き込みのため、**ユーザーがホスト側で `-b` リビルド**が必要
- MCP サーバー接続はセッション開始時のみのため、**検証はリビルド後の新セッション**で行う
- → コミット後 handover を書き、リビルドとセッション再起動を依頼して終了

## 検証手順（リビルド後の新セッション）

1. `npx -y @playwright/mcp@0.0.78 --help` で warmup（npx キャッシュが空のため）
2. `export VITE_MAPTILER_DEV_KEY="$(grep '^VITE_MAPTILER_DEV_KEY=' .claude-container.d/env | cut -d= -f2-)"`
   の後、同一コマンド内で `npm run dev` を run_in_background 起動
3. Playwright MCP で `http://localhost:5173/map` と summit 詳細ページ（埋め込みミニマップ）へ
   navigate し、スクリーンショットで地図タイルの実描画を確認
4. console に Turnstile `600010` エラーが出ないこと（ウィジェット非表示化の効果）を確認
5. `npm run lint` で警告ゼロ
6. 完了後: `feat/turnstile-dev-bypass` を master へ統合、issue #18 へ結果コメント、issue #20 へ
   「direct value も `.claude-container.d/env` では素通しされない」実測事実を追記（クローズ検討）、
   lessons.md へ記録、計画ファイル2件（`optimized-bouncing-blossom.md`・本ファイル）を `git rm`

## 関連

- 既存計画 `.claude/plans/optimized-bouncing-blossom.md`（issue #18 バイパス実装。実装済み・検証待ち。
  本計画はその検証を可能にする環境整備）
- issue: jj1xgo/sotlas-frontend#18（Turnstile 回避）・#20（env 機構の制約）
