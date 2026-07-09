# CLAUDE.md 最適化パネル指摘の適用

## Context

`claude-md-panel` スキルで `/workspace/CLAUDE.md` をレビューし、4件の指摘（うち3件をユーザーが適用承認）が出た。
本計画はその実装方法を定める。issue #10・#11 に対応する編集（計画ファイル運用ルールの参照化・
best_practices.md への `@` インポート追記指示）はレビュー着手前に既に適用済みで、本計画の対象外。

設計判断（skill化の是非）は Fable 不可・Opus 挙動不審のためユーザー指示によりセッションモデル切替をせず、
Sonnet が計画立案。判断根拠は Opus サブエージェント（設計意見）と claude-code-guide サブエージェント
（公式ドキュメント裏取り）の両方を独立に呼び、結果を以下で確認した上で採用。

- 公式ドキュメント（<https://code.claude.com/docs/en/skills.md>）: 「CLAUDE.md の一節が事実でなく
  手順に育った場合はskillにする」「skill本体は使用時のみロードされ常時コンテキストコストがかからない」
  と明記 → 今回の「環境課題の連携」節（23行の手順）はまさに該当ケース
- `description` フィールドは常時コンテキストに残り、Claude が状況に応じて自動起動する（`disable-model-invocation`
  を設定しない限り）ことを公式ドキュメントで確認 → best_practices「ルールは機構に埋める」原則（常時適用
  ルールを呼ばれない場所に置かない）への抵触は回避できる
- 再発時のクローズ運用（リビルド後動作確認→クローズ）は `.claude/hooks/session-start.sh`
  （L212-247, 実物確認済み）が毎セッション自動注入する形で既に機構化されており、skill化してもこの経路は
  失われない

## 変更内容

### 1. ローカルパッチ列挙の陳腐化修正（`CLAUDE.md` L21-22）

`git ls-files master -- .claude/` で実際に確認したところ `.claude/research/*.md`（3件）・
`.claude/plans/*.md`（2件）も master 固有ファイルとして存在し、「現在は...のみ」という列挙は既に
事実と不一致（`.claude/lessons.md` に同一指摘が既に記録済み）。網羅列挙をやめ、確認コマンドへの
参照に置き換える。

### 2. 「課題管理（GitHub Issues）」節の重複削除（L69-72付近）

節冒頭の地の文と直後の箇条書きで「対象リポジトリ: jj1xgo/sotlas-frontend」が二重掲載されている。
箇条書き側の1行を削除。

### 3. 「環境課題の連携」節をプロジェクトskillへ切り出し（L81-103）

- 新規ファイル `.claude/skills/report-container-issue/SKILL.md` を作成し、現行の手順（フロー・
  ルール1〜5）を移す。ただし署名ルール（現ルール3）はグローバル CLAUDE.md の署名書式をそのまま
  再掲せず「グローバル CLAUDE.md の署名ルール（クロスリポジトリ形式）に従う。付記するリポジトリ名は
  `sotlas-frontend`」という参照に圧縮する
  - frontmatter: `description` に「sotlas-frontendの開発コンテナ環境（claude-container）自体に
    起因する問題を jj1xgo/claude-container へ起票・コメント・クローズする手順」、`when_to_use` に
    シグナル例（コンテナ内に想定ツール/パッケージが無い、PATスコープでpush/issue操作がブロック、
    node-version.txt/packages.txtのフォールバック挙動、ポート非公開、`-b`リビルド要、サンドボックス
    制約）と「起票・コメント・クローズ前に必ず参照」という発火タイミングを明記し、自動起動の確実性を
    担保する
  - `disable-model-invocation` は設定しない（Claude 自身が状況認識して自動起動する必要があるため）
- `CLAUDE.md` の「環境課題の連携」節は1段落程度に圧縮し、最悪失敗パターン（誤ったリポジトリへの起票）
  だけは常時ロードされる本文に残す。手順の詳細は skill 参照に一本化する

## 実装後の確認

- `git diff` で3ファイル（CLAUDE.md, 新規SKILL.md, 削除される計画ファイル）の差分を目視確認
- CLAUDE.md/skillはドキュメントのみで `src` に影響しないため `npm run lint` の対象外。念のため
  `npm run lint` を実行しゼロ警告を確認する
- issue #10 は今回の重複確認依頼に対する回答として、対応完了コメント＋クローズを行う
- issue #11 は今回追記した「best_practices.md 生成後に `@` インポートを追記する」の一文で対応完了として
  コメント＋クローズを行う（この2件は本計画の主眼であるパネル指摘とは別に、承認後の実装フェーズでまとめて
  実施する）
- 実装完了後、計画ファイルは `git rm` で削除する（グローバルCLAUDE.md「1. 計画を優先する」節の運用ルール）。
  CLAUDE.md・skillファイル自体の実装コミットは、ユーザーに要否を確認してから行う
