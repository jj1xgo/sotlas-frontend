# issue #17: vuedraggable v2 → v4（Vue3対応）差し替え — Phase 4 第1弾

## Context

Summit詳細ページの写真ギャラリー（`PictureSwipe.vue`）が使う `vuedraggable ^2.24.3` はVue2専用で、
Vue3環境（`feat/vue3-migration`）では `$scopedSlots` 参照により写真のあるSummitページで**必ず**
`TypeError: Cannot read properties of undefined (reading 'header')` を投げる（issue #17）。
さらに `app.config.errorHandler` 未登録のため、この例外が同一パッチ内の無関係コンポーネントへ
二次エラー（`vnode is null` 系）を連鎖させ、他バグの誤診断も招いている（lessons 43）。

PR #46（Phase 3・地図）がupstream `vue3` ブランチへマージ済みとなり、Phase 4（小物ライブラリ）が
着手可能になった。本計画はPhase 4のうち **vuedraggable 1件のみ**を対象とする（ユーザー選択。
clipboard / infinite-loading / websocket / keycloak 等の残りは別タスク）。

## 設計判断（確定済み・根拠付き）

- **移行先: `vuedraggable@^4.1.0`（vuedraggable@next）**。upstream #44 へ公開済みの移行計画表に
  `vuedraggable ^2.24.3 → vuedraggable@next 4.1.0` と明記済みで、これを踏襲する
  （best_practices #13: 計画に固定した設計判断からの無言逸脱をしない）。
  - 懸念: v4は最終リリース2021-08で実質メンテ停止。代替の `vue-draggable-plus`（2026-01更新、
    週23.7万DL）も検討したが、(a) 公開済み計画からの逸脱になる、(b) イベント契約が変わり
    `dragChange` の書き換えが必要、(c) 本件の使用箇所は1ファイル・単純用途でv4の既知の弱点
    （transition-group絡み等）に該当しない、ため不採用。v4で将来問題が出た場合の乗り換え先として記録に残す
- **API契約の照合結果**（vue.draggable.next README・npm registryで確認済み）:
  - `v-model` / `handle=".handle"` / `@change`（`moved: {newIndex, oldIndex, element}`）は**v2から契約不変** → 既存の `dragChange` ハンドラ（PictureSwipe.vue:119-124）は無変更で使える
  - **要変更はslot構文のみ**: default slot内 `v-for` → `<template #item="{element, index}">` ＋ `item-key` prop必須
  - 実装時に `node_modules/vuedraggable`（v4インストール後）の実物ソースでも上記契約を再確認する
    （lessons 18: 名前一致だけで互換と判定しない）
- **作業ブランチ: `feat/vue3-migration`（開発枝）で実装・コミット**。二層構造
  （開発枝=feat/vue3-migration・PR枝=vue3-phaseN）を踏襲し、クリーンPR枝 `vue3-phase4` の作成は
  Phase 4残件が揃ってPRを出す段階で行う（本タスクのスコープ外）。
  feat/vue3-migration のsrcはupstream/vue3と完全一致確認済み（git diffで検証済み）

## 変更内容

### 1. 依存の更新（`package.json` / `package-lock.json`）

- `vuedraggable`: `^2.24.3` → `^4.1.0`（sortablejs は推移的依存で 1.10.2 → 1.14.0 に上がる）
- ブランチ切替直後は node_modules がmaster（Vue2.7）系のままなので、先に `npm install` で
  feat/vue3-migration の依存へ同期してから vuedraggable を上げる

### 2. `src/components/PictureSwipe.vue`（vuedraggable唯一の使用箇所）

テンプレート4-18行目のみ変更。scriptブロックは無変更:

```vue
<draggable v-model="myItems" item-key="src" handle=".handle" @change="dragChange">
  <template #item="{ element: item, index }">
    <figure>
      <!-- 既存の中身そのまま（:key="item.src" は削除。item-keyがv4側でkey管理するため） -->
    </figure>
  </template>
</draggable>
```

- slot props の `item`（`element` を rename）・`index` で、既存の `open(index)`・
  `$emit('mouseoverPicture', item, index)`・`item.editable` 等の参照は全て無変更で成立
- DOM構造はv2/v4ともラッパー`<div>`直下に`<figure>`が並ぶ形で不変 → CSSセレクタへの影響なし
  （実装時にスクリーンショットで目視確認）
- `SummitPhotos.vue` / `SummitPhotosGroup.vue` は vuedraggable を直接使っておらず**無変更**

### 3. issue #17 の運用

- 着手時: 対応方針（本計画の要点）をコメント
- 完了時: 検証結果を添えて対応完了コメント（クローズは検証完了後、起票側=自分たちなので同セッション可）
- 署名は実装セッションのモデル名（例: `— Sonnet 5`）

## 実装手順

1. `git checkout feat/vue3-migration` → 本計画ファイルをコミット（計画ファイルgit運用ルール）
2. `npm install`（Vue3系依存へ同期）→ `package.json` の vuedraggable を `^4.1.0` へ → `npm install`
3. v4実物ソース（node_modules）で slot契約・`@change` ペイロードを再確認
4. `PictureSwipe.vue` テンプレート書き換え（上記）
5. `npm run lint`（警告ゼロ）・`npm run build`（成功）
6. 動作検証（下記）→ issue #17 完了コメント＋クローズ
7. feat/vue3-migration へコミット（Conventional Commits・日本語本文）、計画ファイルを `git rm`

全タスク Sonnet 実装想定（設計判断は本計画で解消済み。上位モデル委譲が要る想定タスクなし）。

## 検証（コンテナ内 Playwright MCP 第一手段）

前提: feat/vue3-migration にはTurnstile devバイパス（master固有パッチ）が**無い**ため地図部分は
描画されないが、写真ギャラリーは非map要素なので検証可能（lessons 51-52 で実証済みのパターン）。

1. `npm run dev` を run_in_background で起動（必要なら npx warmup）
2. 写真ありSummitページ（`/summits/G/LD-004`・`/summits/DL/MF-080`。issue #17 で再現確認済みの実データ）へ navigate:
   - **修正前の必発エラー `TypeError: reading 'header'`（getSlot）がconsoleに出ないこと**
   - サムネイル一覧が描画されること（スクリーンショット）
   - サムネイルクリックで PhotoSwipe ライトボックスが開くこと
   - 二次汚染（`vnode is null` 系）が消えていること（lessons 43 の連鎖パターン）
3. **並び替え（ドラッグ）の検証** — 観測可能性の制約あり:
   - `item.editable` は認証ユーザーのみtrueで、コンテナ内はログイン不可 → handleボタン自体が出ない
   - 一時的なローカルパッチ（swipeItems の editable を強制true、**コミットしない**）で handle を
     出し、Playwright のマウス操作でドラッグ → `@change` 発火とDOM順序変化を確認（並び替えAPI
     呼び出しは未認証で失敗して正常。UIレイヤの動作確認が目的）
   - 合成ドラッグが sortablejs に効かない場合（lessons 35 の類型）は深追いせず、ホスト側
     実ブラウザ・実ログインでのユーザー手動確認へ切り替える（最終確認は次項）
4. 匿名ユーザーで handle・編集/削除ボタンが**出ない**こと（editable分岐の非回帰）
5. ホスト側実ブラウザ・実ログインでの並び替え最終確認はユーザーへ依頼（任意・PR提出前まででよい）

## 関連ファイル

- `src/components/PictureSwipe.vue`（唯一の変更対象コード）
- `package.json` / `package-lock.json`
- 参照: `src/components/SummitPhotosGroup.vue`（配線元、無変更）、issue #17、upstream #44、
  `.claude/plans/floofy-wiggling-snowflake.md`（feat/vue3-migration上の移行マスタープラン）
