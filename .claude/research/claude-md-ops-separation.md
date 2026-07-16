# CLAUDE.md/.claude/ 分離パターン調査（claude-container-ops 事例）

## 目的

sotlas-frontend の `CLAUDE.md`・`.claude/` を製品コードから分離し、第三者が製品部分のみを
クローンできるようにする案の検討材料として、`claude-container` リポジトリで既に実践されている
同型の分離パターンをホスト側で直接調査した記録。次回セッション（Opus による計画立案）向けの
一次情報として残す。

## 調査結果（ホスト側で実物確認、2026-07-16）

- `../claude-container` の `.gitignore` に以下のエントリと理由コメントがある:
  ```
  # CLAUDE.md と .claude/ はメンテナ個人の開発運用ファイル（プロダクト本体ではない）。
  # private nested git リポジトリ（jj1xgo/claude-container-ops）として別管理する。
  CLAUDE.md
  .claude/
  ```
- 実体として `.claude/` ディレクトリ自体が独立した git リポジトリ（`.claude/.git` が存在）になっており、
  そのリモートは `https://github.com/jj1xgo/claude-container-ops.git`（private）
- `CLAUDE.md` はリポジトリルートではなく `.claude/CLAUDE.md` に配置されている（claude-container 独自の
  配置。sotlas-frontend は現状ルート直下に `CLAUDE.md` を置く構成で異なる）
- 観測時点、`.claude/`（=claude-container-ops）は origin に対し1コミット先行、`lessons.md` に
  未ステージ差分あり — これは他セッションによる進行中の運用状態であり、分離構造の仕様そのものでは
  ない（スナップショット。設計の参考にしない）
- 命名規則: `<製品リポジトリ名>-ops`（`claude-container` → `claude-container-ops`）。同型のグローバル版が
  `~/.claude` → `jj1xgo/dotclaude-ops`（プロジェクト非依存、既知）

## この仕組みが機能する理由（技術的な要点）

`.gitignore` は git の追跡対象から外すだけで、ファイルシステム上の実在を妨げない。ネストされた
`.claude/` git リポジトリの中身は物理的に `/workspace`（コンテナのマウント対象）上に実在し続けるため、
session-start hook 等のランタイム参照（`.claude/best_practices.md`・`.claude/lessons.md`・
`.claude/skills/` 等のファイル読み取り）は分離後も機能するはず（未検証・要実機確認）。

## sotlas-frontend への適用時に検討が必要な論点（未決定）

1. 分離対象の範囲: `CLAUDE.md` 全体＋`.claude/` 配下全体か、一部（`.claude/research/`・
   `.claude/plans/` は製品開発の意思決定記録として製品リポジトリに残す方が良いか）か
2. `CLAUDE.md` の配置: claude-container 方式（`.claude/CLAUDE.md` に格納）に合わせるか、
   現状どおりルート直下に置いて `.gitignore` で除外するだけにするか
3. 新規リポジトリ名: 命名規則に従うなら `jj1xgo/sotlas-frontend-ops`（private）
4. 既存 git 履歴の扱い: 現在 `CLAUDE.md`・`.claude/` は sotlas-frontend 本体のコミット履歴に混在
   している。新リポジトリへの履歴移植（`git filter-repo` 等）を行うか、履歴を捨てて新規初期化するか
5. 実装（新規 private repo 作成・push）はホスト側限定（コンテナの PAT は Issues 限定スコープで
   push 不可、プロジェクト CLAUDE.md の既存運用と同じ制約）
6. upstream との関係: 現行の「ローカルパッチ」定義（`.claude/` 配下の research/plans 等・本ファイル
   自身を master 固有パッチとして扱う）が、分離後は不要になる可能性がある（`master` と upstream の
   差分が縮小する）
7. 分離後、session-start hook・`plansDirectory` 設定（`.claude/settings.json` の
   `plansDirectory: ".claude/plans"`）等、`.claude/` 配下のファイルパスに依存する既存の仕組みが
   機能し続けるか実機検証が必要
8. サンドボックスの書き込み拒否リスト（`.claude/settings.json`・`.claude/skills/`・`.claude/hooks/`
   等）が分離後のネストリポジトリ構成でも同様に機能するか（今回の調査中、ホスト側でも
   これらのパスへの git checkout による書き換えがサンドボックスにブロックされる場面があった）

## 次のアクション

次回セッションで Opus（上位モデル）による計画立案を予定。上記論点1〜8の意思決定と実装ステップの
計画を行う。
