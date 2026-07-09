---
name: report-container-issue
description: sotlas-frontend の開発コンテナ環境（claude-container）自体に起因する問題・要望を、本リポジトリではなく jj1xgo/claude-container へ GitHub issue として起票・コメント・クローズする手順。
when_to_use: sotlas-frontend の実装/検証中に、原因がアプリケーションコード（Vue/Buefy/bulma等）ではなくコンテナ側の制約・機構に起因すると判明した場合に使う。シグナル例 — コンテナ内に想定ツール/パッケージが無い、PATのスコープでpush/issue操作がブロックされる、node-version.txt/packages.txtのフォールバック挙動、コンテナがポートを公開せずdevサーバに繋がらない、`-b`（リビルド）を要する設定変更、サンドボックス制約に阻まれた操作。起票前・コメント前・クローズ前に必ず参照する。
---

# report-container-issue

## 対象範囲

sotlas-frontend 自体の仕様・実装ではなく、開発用コンテナ環境（`../claude-container`）に起因する
問題・要望はこの skill で対応する。起票先は `jj1xgo/claude-container`（本リポジトリの Issues ではない）。

## フロー

起票 → （claude-container 側が調査・実装・対応完了コメント）→ 対応待ち → **リビルド後**に動作確認 →
確認内容をコメントに付記してクローズ。

## ルール

1. クローズは原則起票側（sotlas-frontend）が動作確認後に行う。例外: 調査の結果「仕様どおり・
   対応不要」と判明した場合は、対応側（claude-container）が説明コメント付きでクローズすることがある
2. 動作確認は稼働中コンテナでは不十分になりうるため、リビルド（`-b`）後に行う
3. AI が起票・コメント・クローズする場合は、本文の**末尾に署名**として記入する。グローバル CLAUDE.md
   の署名ルール（クロスリポジトリ形式）に従う。付記するリポジトリ名は `sotlas-frontend`
   （例: `— <実行中のモデル名> (sotlas-frontend)`）。経緯の説明文は書かない
   （上流への非署名は本リポジトリ CLAUDE.md「プロジェクト概要」節参照）
4. 起票先リポジトリ名・仕様は推測せず、不明な場合はユーザーに確認してから起票する
5. 1 issue 1 論点

## 参考

`gh` の利用可否・session-start hook の挙動は本リポジトリ CLAUDE.md「課題管理（GitHub Issues）」節を参照。
