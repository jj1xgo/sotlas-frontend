# Claude in Chrome 向け指示書 D — 全体回帰確認（非地図ページ）

「前と同じように動作しているか」の広い回帰確認。今回のセッションで`NavBar`・`CardPagination`・
`b-loading`など複数ページで共有されるコンポーネントを修正したため、修正箇所以外の周辺機能が
壊れていないかを一通り確認する。ログイン不要。

## 前提

- `feat/vue3-migration` ブランチで `npm run dev` を起動し、`http://localhost:5173/` へアクセス
- 各ページで「見た目が大きく崩れていないか」「クリック可能な要素が反応するか」「ブラウザの
  DevToolsコンソールに赤いエラーが出ないか」を基本の確認観点とする
- 想定内のノイズ（無視してよいもの）: `solardata/latest`の404、`az.sotl.as/*.gpx`の403、
  `en.wikipedia.org`関連のネットワークエラー、Cloudflare Turnstile関連の警告

## デスクトップ幅（1280px程度）での確認

1. `/about` — 静的ページの表示、リンク
2. `/settings` — Units（Metric/Imperial）ラジオボタン切替→リロードしても選択状態が保持されるか
3. `/summits/` — 一覧表示、検索欄でのフィルタ、列ヘッダクリックでのソート
4. `/summits/JA` → `/summits/JA/NN` → `/summits/JA/NN-001` の階層遷移
5. `/summits/JA/NN-001`（Summit詳細） — 属性表示・写真ギャラリー・アクティベーション履歴・
   ルート情報・動画（あれば）が表示されるか
6. `/activators/` — 一覧・国旗アイコン・スコアソート
7. `/activators/DL6FBK` — 統計・チャート（棒グラフ・円グラフ）・活動履歴テーブルのページネーション
8. `/spots/sotawatch` — 一覧表示、"Live Feed CONNECTED"表示、Bands/Modes/Continentsフィルタ
9. `/spots/rbn` — タブ切替、フィルタ
10. `/alerts` — 一覧表示、フィルタ、「Add」ボタンでモーダルが開く（送信はしない）
11. `/new_photos` — 写真ギャラリー表示
12. `/solar_history` — 2つのチャート（折れ線・棒）が描画されるか
13. `/search?q=Everest`のような検索結果ページ
14. 存在しないURL（例: `/this-page-does-not-exist`）→ Not Foundページが出るか
15. NavBarの「More」ドロップダウンが開閉するか（New Photos/Activators/Settingsリンク）
16. NavBar検索欄にフォーカス→候補検索→Enterで検索結果ページへ遷移するか

## モバイル幅（375〜414px程度）での確認

DevToolsでウィンドウ幅を縮める、またはレスポンシブデザインモードを使用してください。

17. NavBarのハンバーガーメニュー開閉（指示書Cの項目2と同じだが、他のページでも念のため）
18. `/alerts` — カード形式の一覧表示、ページネーション操作
19. `/spots/sotawatch` — カード形式の一覧表示、ページネーション操作
20. `/spots/rbn` — カード形式の一覧表示、ページネーション操作
21. `/activators/DL6FBK` — カード形式の一覧表示（Recent spots等）、ページネーション操作
22. `/summits/JA/NN-001` — レイアウトがモバイル幅で崩れていないか

## ブラウザバック・スクロール位置

23. `/summits/`で下にスクロール→サミットをクリックして詳細ページへ→ブラウザの「戻る」→
    スクロール位置が復元されるか
24. `/about`を開いた状態でブラウザを再読み込みし、`/`にアクセス→`/about`へリダイレクトされるか
    （`localStorage`に前回パスが保存されているため）

## 完了後

NG項目があれば、URL・操作手順・実際に起きたこと（スクリーンショット・コンソールエラー）を
添えて報告してください。全てOKであれば「全項目OK」とだけ報告して構いません。
