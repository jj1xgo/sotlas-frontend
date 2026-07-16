# CLAUDE.md / `.claude/` の製品コードからの分離

## Context

現状 `/workspace`（sotlas-frontend リポジトリルート）直下に、製品コード（`src/`・`public/`・
`package.json` 等）と Claude Code 運用ファイル（`CLAUDE.md`・`.claude/` 配下）が同居している。

姉妹プロジェクト `claude-container` では既に同型の分離を実践済みで、`.gitignore` で
`CLAUDE.md`・`.claude/` を除外し、`.claude/` 自体を独立 git リポジトリ（ネストされた
`.claude/.git`、リモート `jj1xgo/claude-container-ops`、private）にすることで製品コードから
分離している（命名規則 `<製品リポジトリ名>-ops`、同型のグローバル版が `~/.claude` →
`jj1xgo/dotclaude-ops`）。この調査は前セッションでホスト側から実施済みで、記録は
`master` ブランチの `.claude/research/claude-md-ops-separation.md`（コミット `1be5fa7`）に
一次情報として残っている。

目的は、第三者が製品部分のみをクローンできるようにすること、および製品リポジトリの履歴を
Claude Code 運用ファイルのコミット（現時点で `CLAUDE.md` 13件・`.claude/` 64件、重複除去70件、
総コミット469件中）で汚さないこと。

このセッションでは、ユーザーの提案により（CLAUDE.md 原則4の「Sonnetのままでよい」明示に基づき）
Sonnet が計画立案まで担当する。実装は別セッション（本計画の承認後）で行う。

## 決定事項（確定済み）

1. **分離範囲**: 全体分離。`CLAUDE.md` と `.claude/` 配下全部（`best_practices.md`・
   `lessons.md`・`hooks/`・`skills/`・`settings.json`・`README.md`・`research/`・`plans/`・
   `scripts/` を含む）を新規 private リポジトリへ。製品リポジトリ側には一切残さない。
2. **CLAUDE.md配置**: `.claude/CLAUDE.md` へ格納（claude-container方式に合わせる。現状は
   リポジトリルート直下）。
3. **既存git履歴の扱い**: 履歴を捨てて新規初期化。新リポジトリは現状のファイル内容だけを
   コピーした fresh initial commit にする（`git filter-repo` 等の履歴移植はしない）。
4. **作業ブランチ**: `master`。`CLAUDE.md`/`.claude/` はプロジェクトCLAUDE.md定義上
   「master固有のローカルパッチ」であり、`feat/vue3-migration` 等の feat ブランチは
   PR 提出前に `git rebase --onto upstream/master master feat/<slug>` でローカルパッチ分を
   削がれる運命にあるため、分離作業自体は `master` 上で行う。
5. **新規 ops repo 内の git 追跡範囲**: 現状踏襲。`lessons.md`・`handovers/`・`incidents/`・
   `pr-drafts/`・`playwright-mcp/`・`settings.local.json`・`bash_history` は ops repo でも
   引き続き git 管理外（`.gitignore` に列挙）のまま据え置く。
6. **新規リポジトリ名**: `jj1xgo/sotlas-frontend-ops`（private）。
7. **ルート `CLAUDE.md` の残置**: しない（削除）。スタブファイルも置かない。README.md への
   分離の一言追記も必須にしない（任意・今回は追記なし）。

## 事前調査で判明している事実

- 現状 `.gitignore` は `.claude/` を個別ファイル/ディレクトリ単位（`settings.local.json`・
  `conversations/`・`sessions/`・`skills/.cache/`・`handovers/`・`incidents/`・`bash_history`・
  `lessons.md`・`pr-drafts/`・`playwright-mcp/`）で除外しており、丸ごと除外ではない。
- 製品コード（`src/`）と `.claude/` が同一コミットで混在している例は2件のみ（いずれも
  `.claude/plans/*.md` へのplan進捗追記が実装コミットに同梱されたケース。`CLAUDE.md`自体の
  混在例は無し）。
- `.claude/settings.json` の `.claude/` 前提ハードコードパス: `plansDirectory: ".claude/plans"`、
  hooks の `$CLAUDE_PROJECT_DIR/.claude/hooks/{session-start,lint-posttool}.sh`。
- hookスクリプトはリポジトリルート相対（`session-start.sh` は自己位置から `../..` で解決）または
  `$CLAUDE_PROJECT_DIR` 環境変数ベースで、絶対パスハードコードなし。`.claude/` がネストgit
  リポジトリになってもファイルシステム上の実在パスは変わらないため、動作継続の見込みは高いが
  実機検証が必要。
- `CLAUDE.md` 3行目 `@.claude/best_practices.md`（リポジトリルート相対インポート）は、
  `.claude/CLAUDE.md` へ移動後にパス調整が必要（`@best_practices.md` へ変更が候補。実機検証必須、
  機能しなければ `@.claude/best_practices.md` のまま残す）。
- `.claude/README.md` 内に `[CLAUDE.md](../CLAUDE.md)` という相対リンクが複数箇所あり、
  `.claude/CLAUDE.md` への移動に伴い `[CLAUDE.md](CLAUDE.md)`（同一ディレクトリ相対）へ修正が必要。
- ルート `.mcp.json` は `--output-dir ".claude/playwright-mcp"` を参照。ファイルシステム相対パスで
  ディレクトリ自体は移動しないため変更不要（実機確認のみ）。
- 環境制約: コンテナ内PAT（`GH_TOKEN_FILE`）はIssues限定スコープでpush不可。新規リポジトリ作成・
  push は **ホスト側限定**。

## 実装ステップ

各ステップに **[container]**（コンテナ内で実行可能）／**[host]**（ホスト側限定）を付与。

### Phase 0: 準備 [container]
1. `git status` で作業ツリーがcleanなことを確認。
2. `git checkout master` へ切替（決定事項4）。
3. ロールバック起点として `git rev-parse HEAD` を記録。
4. `/handover` で着手前セッション状態を保存。

### Phase 1: 新規 private リポジトリ作成 [host]
5. `gh repo create jj1xgo/sotlas-frontend-ops --private --description "Claude Code operational files for jj1xgo/sotlas-frontend (CLAUDE.md, .claude/)"`。push はまだしない。

### Phase 2: 製品リポジトリ側の分離処理（ローカルgit操作のみ）[container]
6. `.gitignore` を書き換え（個別除外エントリを削除し、以下2行に置換）:
   ```
   # CLAUDE.md と .claude/ はメンテナ個人の開発運用ファイル（プロダクト本体ではない）。
   # private nested git リポジトリ（jj1xgo/sotlas-frontend-ops）として別管理する。
   CLAUDE.md
   .claude/
   ```
7. 追跡解除（ワークツリーのファイルは維持）:
   ```
   git rm -r --cached .claude
   git rm --cached CLAUDE.md
   ```
8. `.gitignore` を `git add`・コミット（product repo側、変更理由をメッセージに明記）。
9. `cp CLAUDE.md .claude/CLAUDE.md` した上で調整:
   - 3行目インポートパスを `@best_practices.md` に変更（Phase 4で実機検証）
   - 「ブランチ・PR運用」節の「ローカルパッチ」定義を更新（`.claude/` が製品リポジトリの
     一部でなくなるため、実体は `.claude-container.d/` と `.gitignore` の2行のみに縮小する旨）
10. 旧ルート `CLAUDE.md` を削除（`rm CLAUDE.md`。既に追跡外なのでgit操作不要）。
11. `.claude/README.md` の `../CLAUDE.md` リンクを `CLAUDE.md` に修正。
12. ネストgitリポジトリ初期化: `cd .claude && git init && git branch -M master`。
13. ops repo用 `.gitignore` を新規作成（決定事項5、現状の個別除外リストをプレフィックス無しで
    再利用）。
14. `git add` してコミット（ops repo側、fresh initial commit）。
15. `git remote add origin git@github.com:jj1xgo/sotlas-frontend-ops.git`（push はまだしない）。

### Phase 3: push [host]
16. ops repo: `git push -u origin master`。
17. product repo（`master`）: push 前に `git status`・`git log --oneline -5` をユーザーに提示して
    確認を取ってから `git push origin master`。

### Phase 4: 実機検証（新規セッションで実施）[container]
18. `.claude/CLAUDE.md` が実際に読み込まれているか確認。
19. `@best_practices.md` インポートが機能しているか確認（機能しなければ
    `@.claude/best_practices.md` に戻す）。
20. session-start hook の自動注入（handover/lessons/incident等）が通常通り動くか確認。
21. Plan Mode を1回起動し、生成される計画ファイルが `.claude/plans/<slug>.md` に作られるか確認
    （`~/.claude/plans/` へのフォールバックが起きていないか）。
22. `.claude/settings.json`・`.claude/hooks/*`・`.claude/skills/*` への軽微な編集を試み、
    サンドボックス書込保護の挙動がネスト構成後も同様か確認。
23. Playwright MCP を1回動かし、`.claude/playwright-mcp` へのログ出力を確認。
24. 検証結果を ops repo側 `.claude/research/claude-md-ops-separation.md` に追記。

### Phase 5: 後片付け [container]
25. `.claude/README.md`「## CLAUDE.md の位置」節を `.claude/CLAUDE.md` 配置に更新。
26. 完了後の通常 `/handover` を実行（このhandoverファイル自体は以後 ops repo側に物理的に
    置かれることになる点に注意。運用上の実害はない）。

## ロールバック手段

Phase 3（push）より前は全てローカル操作のみなので安全にやり直せる。

- Phase 2 途中で中断: `git reset --hard <Phase 0で記録したSHA>`。ネストリポジトリ化のみ
  取り消したい場合は `rm -rf .claude/.git` で「ネスト化」だけを取り消し、他の非追跡ファイル
  （handovers/incidents等）は触らない縮小版ロールバックを優先する（`git clean -fd .claude` は
  それらも消す破壊的操作なので使わない）。
- Phase 1 のみ実施済みで中断: 空リポジトリが残るだけで実害なし。
- Phase 3（push）後に問題発覚: force push は使わず、修正コミットを積む方針とする（product repo
  の `master` 運用ルールに準拠）。

## Critical Files
- `/workspace/CLAUDE.md`
- `/workspace/.gitignore`
- `/workspace/.claude/settings.json`
- `/workspace/.claude/README.md`
- `/workspace/.claude/hooks/session-start.sh`
- `/workspace/.mcp.json`
- `/workspace/.claude/research/claude-md-ops-separation.md`（一次情報・検証結果追記先）

## 検証方法

Phase 4の実機検証手順（18〜23）が該当。特にCLAUDE.md自体が読み込まれない場合が最も深刻
（プロジェクト固有ルールが一切適用されなくなる）なため最優先で確認する。それ以外
（`@`インポート・session-start hook・plansDirectory・サンドボックス保護）はいずれも
fail-soft/fail-closedの性質上、気づかれにくい失効が起こりうるため、Phase 4の各項目を
チェックリストとして明示的に確認する。
