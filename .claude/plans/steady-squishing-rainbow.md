# 課題管理を GitHub Issues へ移行する（Issue #1 対応）

## Context

sotlas-frontend の軽微タスク管理は現状 `.claude/todo.md`（ファイルベース）で行っているが、
claude-container・findsummits では既に GitHub Issues 運用へ移行済みで、グローバル
CLAUDE.md にも「GitHub Issues による課題管理（opt-in）」節が確立されている。この横展開を
sotlas-frontend でも行うのが [jj1xgo/sotlas-frontend#1](https://github.com/jj1xgo/sotlas-frontend/issues/1)
の内容。todo.md 運用は「完了したら消す」ため経緯が git 履歴にしか残らず、保留系タスク
（claude-container 対応待ち等）の再検討トリガーも本文で管理しづらい。Issues 化することで
findsummits 同様、ラベル・コメント履歴・session-start hook 連携で一貫した運用にする。

**進捗確認済み**: issue #1 の手順1「`on-hold` ラベル作成」は既に完了済み（`gh label list` で
`on-hold #ededed 長期保留。本文に再検討トリガーを明記` を確認）。残り手順2〜7 を本計画で実施する。

**Fable レビュー済み**: 設計判断（新設節の配置・判定基準行からの `plans/*.md` 除去・
session-start.sh 新ブロックの配置順）は妥当と確認。加えて以下3点の見落としを指摘され、
本計画に反映済み:
1. 「環境課題の連携」節の導入文（`.claude/todo.md` ではなく〜という記述）も判定基準行と
   合わせて更新しないと陳腐化する
2. 「計画・タスク管理」節の todo.md 行は単純削除ではなく、新設節への参照行に置換する
   （issue #1 手順3の指定どおり）
3. `.claude/README.md` は「plans/・todo.md」節だけでなく、役割分担表・hooks/session-start.sh
   説明も todo.md 関連箇所の更新対象

## 実施内容

### 1. todo.md の棚卸し・issue 化（5件、jj1xgo/sotlas-frontend へ起票）

各 issue 本文末尾に署名 `— Sonnet 5`（自リポジトリ投稿のため）。

| # | タイトル | ラベル | 本文の要点 |
|---|---|---|---|
| a | アクティベーションゾーン表示を日本のサミットにも追従させる | `enhancement` | todo.md の記述を引き継ぐ。着手時に個別計画（Plan Mode）を作成する旨を明記 |
| b | 地図上に夜間帯（ターミネーター）を表示する | `enhancement` | 参考: https://www.timeanddate.com/worldclock/sunearth.html 。着手時に個別計画を作成する旨を明記 |
| c | upstream issue #23 へ FA-free 方式（stub+alias）を共有するか検討 | `enhancement` | 「投稿前に内容をユーザーへ説明する」条件を明記。upstream #23 へのリンクを含める |
| d | claude-container #3（Node22 ビルドフック提案）対応待ち | `on-hold` | 再検討トリガー「claude-container #3 がクローズされたらリビルドして Node 22 化を動作確認」を明記、リンク保持 |
| e | claude-container #4（gh 公式 apt 化提案）対応待ち | `on-hold` | 再検討トリガー「claude-container #4 がクローズされたらリビルドして gh pr 系コマンドの動作確認」を明記、リンク保持 |

環境整備チェックリスト（全項目完了済み）は issue 化しない（`.claude/todo.md` の既存注記どおり）。

### 2. `CLAUDE.md` の書き換え

- 「計画・タスク管理」節の次の行を、単純削除ではなく新設節への参照行に置換する:
  - Before: `- 軽微な実装タスクは .claude/todo.md に直接書く。完了したものは消す（履歴は git で追える）`
  - After: `- 軽微な実装タスクの管理は GitHub Issues で行う（→「課題管理（GitHub Issues）」節参照）`
- 「環境課題の連携」節の直前に新設節「課題管理（GitHub Issues）」を追加:
  - 対象リポジトリ: `jj1xgo/sotlas-frontend`
  - ラベル体系: `enhancement`（GitHub 既定）・`on-hold`（保留。本文に再検討トリガーを明記するものだけに使う）
  - グローバル CLAUDE.md「GitHub Issues による課題管理（opt-in）」節を参照する旨を明記
  - 署名: 自リポジトリのためモデル名のみ（グローバルルールどおり）
  - `.claude/plans/<slug>.md` の実装計画ファイル運用は本節の対象外で「計画・タスク管理」節に
    残る旨を一行明記し、誤読を防ぐ（Fable 指摘の反映）
- 「環境課題の連携」節の導入文・判定基準行を両方更新（導入文だけ据え置くと陳腐化するため、
  Fable 指摘の反映）:
  - 導入文 Before: `` `.claude/todo.md` ではなく `jj1xgo/claude-container` への GitHub issue で起票する。 ``
    → After: `` 本リポジトリ（jj1xgo/sotlas-frontend）の GitHub Issues ではなく `jj1xgo/claude-container` への GitHub issue で起票する。 ``
  - 判定基準行 Before: `sotlas-frontend 自身の問題 → 従来どおり .claude/todo.md / .claude/plans/*.md。`
    → After: `sotlas-frontend 自身の問題 → 本リポジトリ（jj1xgo/sotlas-frontend）の GitHub Issues。`

### 3. `.claude/hooks/session-start.sh` に自リポジトリ open issue 注入ブロックを追加

既存の claude-container ブロック（98〜135行目）の直前に、同じ構造（jq 有無分岐・timeout・
フェイルソフト）で対象リポジトリを `jj1xgo/sotlas-frontend` に変えた新ブロックを追加する。
出力メッセージは claude-container 向け文言（リビルド前提）を流用せず、「このセッションで
対応可能な自リポジトリの課題一覧」である旨に変える。

### 4. `.claude/README.md` の更新（Fable 指摘で対象範囲を拡大）

- 役割分担サマリー表（24行目）の「plans/・todo.md」行 → 「plans/」に変更し、todo.md 廃止・
  GitHub Issues 移行を注記
- hooks/session-start.sh の説明（19行目・40〜52行目）に新ブロックの説明を追記
- 「plans/・todo.md」セクション（111〜121行目）から todo.md 部分を削除

### 5. `.claude/todo.md` の削除

`git rm .claude/todo.md`（履歴は git で追える）

## 検証

- `npm run lint`
- `bash -n .claude/hooks/session-start.sh` でシンタックスチェック
- `bash .claude/hooks/session-start.sh` を手動実行し、sotlas-frontend の open issue（新規5件 + #1）が
  正しく注入されることを確認
- `gh issue list --repo jj1xgo/sotlas-frontend` で移行した課題とラベルを確認

## コミット・クローズ

- CLAUDE.md・.claude/README.md・.claude/hooks/session-start.sh の変更と todo.md 削除を1コミット
  （Conventional Commits、日本語本文）
- 検証後、Issue #1 に対応完了コメント（署名 `— Sonnet 5`）を付けて `gh issue close` でクローズ
