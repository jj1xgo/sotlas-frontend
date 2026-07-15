# Vue 3 移行 総点検 — 同型バグの全数洗い出しと修正

## Context

Phase 5 で `<b-modal>` の v-model 破損（全10箇所、Alert/Spot/Photo編集モーダルが Phase 2 以降ずっと開かなかった）を発見・修正した。しかしこれは **「Buefy 3 で `modelValue` 化されたコンポーネントに旧prop名を渡している」という一般パターンの一例**に過ぎず、他コンポーネントへ横展開されていなかった。

ユーザーからの指摘: 10セッション持ち越しの既知バグ（地図オプションアイコンの位置ずれ）が Phase 5 完了時点でも未修正であり、他にも見落としがあるのではないか。原因は **Phase 1〜4 の時点でヘッドレスブラウザ検証環境（Playwright MCP、2026-07-13導入）が存在せず**、ホスト側の部分的な目視確認しか行われていなかったこと。**この状態では Phase 5 PR は提出できない**（ユーザー判断）。

実際に総点検したところ、**同型の未修正バグが3種類12箇所**見つかり、すべて実機で再現確認した。このバグ族の特徴は **ビルドが通り、コンソールにエラーも警告も一切出ないまま機能だけが死ぬ**こと（Vue 3 は未知の属性を `$attrs` 経由でルート要素へ素通しするため）。したがって console 監視では検知できず、**「操作 → 期待する状態変化」を実際に検証する**必要がある。

本計画のゴールは、この見落としパターンを**機械的に全数洗い出して潰し**、Phase 5 PR を提出可能な状態にすること。

## 確定した事実（すべて実物・実機で裏取り済み）

### Phase 5 PR に含める修正（`feat/vue3-migration` → upstream `vue3`）

| # | 箇所 | 事実 | 実機で確認した症状 |
|---|---|---|---|
| 1 | `<b-loading :active>` **10箇所** | `Loading.vue` の props は `modelValue` のみで **`active` は不在**。`isActive: this.modelValue \|\| false` + `v-if="isActive"` | `filtering=true` を立てても `.loading-overlay` がDOMに出ない → **全ローディングスピナーが無表示** |
| 2 | `NavBar.vue:2` `v-model:isActive` | `Navbar.vue` の props は `modelValue` のみ。emit も `update:modelValue` のみ | `isactive="false"` が素の属性としてフォールスルー。`closeBurger()` が不活性 → **モバイルでナビリンクをタップしてもメニューが閉じない**（`:close-on-click="false"` のため Buefy 側の自動クローズも無い） |
| 3 | `CardPagination.vue:3` `v-model:current` | `Pagination.vue` の props は `modelValue` のみ | `current="1"` が `<nav>` に素の属性で出現。**次ページクリックで一切変化なし**（Activatorページ・モバイル幅・10件超で発現） |
| 4 | `SwisstopoInfo.vue:2` / `BasemapAtInfo.vue:2` `:on-cancel` | Buefy 3 Modal に `onCancel` prop なし | デッドコード（`:can-cancel="false"` のため現状無害）。Buefy 0.8 の残骸 |
| 5 | `src/mapgl/controls.js:5-9` / `src/mapgl/README.md:67-72` | 「SOTLAS が `:key="$mq.mobile"` で workaround していた」と記載 | **事実誤認**。`git log --all -S':key="$mq.mobile"'` の結果、これは移行ブランチ自身が `5956f8c` で追加し `ba3b689` で削除した一時的なもので、upstream には一度も存在しない |

### 正常と確認できたもの（修正不要）

- `v-model:current-page` on `b-table` × 3 → `Table.vue:582` に `currentPage` prop、`:717` に `update:currentPage` emit が**実在**
- `:value` on `b-dropdown-item` × 9 → `DropdownItem.vue:42` に `value` prop が**実在**
- Vue 3 破壊的変更のうち `$parent`/`$children`/`$listeners`/`$scopedSlots`/`.native`/フィルタ/`functional`/`beforeDestroy`/`v-for`+`ref`/`model`オプション/`.sync` は**全て0件**
- `$buefy.*` プログラマティック呼び出し 21箇所すべて正常（`loading.open()` は全箇所で引数あり）
- `b-table` の `v-slot` は全カラム個別方式、裸の `<template>` は0件

**判別ルール（重要）**: 旧prop が一律削除されたのではなく、**Buefy 3 で `modelValue` を持つようになったコンポーネントだけが旧prop を失っている**。`b-tooltip` は今も `active` prop を持つ（`SearchField.vue:2` は正常）。この規則で照合すること。

### 別PR に分離（ユーザー判断済み）

- **地図オプションアイコンの位置ずれ**: 真因は `MapOptionsControl.vue:310-312` の `.b-tooltip { vertical-align: bottom; }`。実機で **345px の下方向シフトを再現**、`vertical-align: top` で元位置（105px）に復帰することも**ブラウザ上で検証済み**。ただし当該CSSは **upstream の Vue 2 版とバイト単位で同一** で、Vue 3 移行による退行ではない（`.b-tooltip` の display 値に依らず再現するため Buefy バージョン差でも説明できない）。→ **`master` 起点の別小PR**（T6 の README 修正と同じ扱い）
- 「C3 fragment render 由来疑い」という過去メモは**誤診**。3コントロールとも単一ルートで、class は自前テンプレートで直接付与しており fragment 由来の継承欠落は原理的に起こり得ない

### 修正しない（仕様として記録、ユーザー判断済み）

- **M5 AttributionControl のモバイルコンパクト化**: maplibre-gl の仕様どおりの挙動。`maplibre-gl-dev.js:69820-69826` で、コンパクトモードに入るどの分岐も `maplibregl-compact` と `maplibregl-compact-show` を**必ずセットで付与**する＝「初期状態で折りたたみ済み」という状態が maplibre に存在しない。`compact: true` でも `undefined` でも 400px 幅では同一DOM。「i」に畳まれるのは地図を**ドラッグした後**（`_updateCompactMinimize` が `'drag'` にバインド）かボタンクリック時のみ。upstream（Vue 2 + maplibre 4.7.1）でも同一で、v3→v4→v5 で変更なし

## タスク

### T-A: 確定バグの修正（実装は Sonnet）

- **A1**: `<b-loading :active="X">` → `:model-value="X"` に置換（10箇所: `Map.vue:37`・`RBNSpots.vue:53`・`Activator.vue:36,52,70,101`・`SotaSpots.vue:47`・`MiniMap.vue:24`・`ModalQSOList.vue:10`・`MapDraw.vue:10`）
  - **`v-model` ではなく `:model-value` を使う**理由: 元の `:active` は一方向バインドで、`:active="true"` のようなリテラル指定が4箇所あり `v-model` は使えない。10箇所すべて `canCancel` 未指定（＝Buefy が `update:modelValue` を emit しない）ため一方向で意味的に等価
- **A2**: `NavBar.vue:2` `v-model:isActive="burgerActive"` → `v-model="burgerActive"`（`closeBurger()` が機能するよう双方向が必要）
- **A3**: `CardPagination.vue:3` `v-model:current="currentCardPage"` → `v-model="currentCardPage"`（双方向が必要）
- **A4**: `SwisstopoInfo.vue:2` / `BasemapAtInfo.vue:2` の `:on-cancel` を削除
- **A5**: `src/mapgl/controls.js:5-9` と `src/mapgl/README.md:67-72` のコメントを事実に合わせて訂正（`useControl` の deep-watch 自体は `@indoorequal/vue-maplibre-gl` に対する改善として正当なので、誤った帰属部分のみ修正）

### T-B: 機械照合による総点検（本計画の中核）

grep は**既知パターンしか捕まえられない**ため、prop 名の突合を機械化して**未知の見落としを全数検出**する。

- **B1**: Buefy 全登録コンポーネントの**実物の props** を抽出する
  - **ブラウザ上（Vite の解決経路）で行う**。`app._context.components` から全コンポーネントを取得し、`props` + `mixins`/`extends` を再帰マージ
  - Node 単体の import は解決経路が異なり偽陰性を生むため使わない（lessons 16/21）
  - Buefy は 32 コンポーネントが mixin 経由で props を持つため、再帰マージは必須
- **B2**: `@vue/compiler-dom`（依存に実在）で `src/**/*.vue` のテンプレート AST を解析し、各コンポーネント使用箇所に渡している prop/attr 名を全て抽出
- **B3**: B1 と B2 を突合し、**「宣言 prop でない かつ ネイティブHTML属性/ARIA/`data-*`/ディレクティブでない」**ものを列挙
- **B4**: 自前コンポーネント（`src/components/*.vue`・`src/views/*.vue`）に対しても同じ照合を行う（`FilterInput`/`FrequencyInput` が Vue 2 契約のまま取り残されていた前例があるため）
- **B5**: 検出結果を1件ずつ判定（`node_modules` の実物で裏取り）し、バグは修正
- スクリプトは `.claude/` 配下に置く（**ローカルパッチ扱い、upstream PR には含めない**）

### T-C: ランタイム総点検（サイレント故障の検知）

このバグ族は console にエラーも警告も出さないため、**console 監視だけでは検知できない**。「操作 → 期待する状態変化」を実際に確認する。

- **C1**: `app.config.warnHandler` / `errorHandler` を一時的に仕込み（dev 限定・コミットしない）、全ページ巡回で Vue の警告を漏れなく収集
- **C2**: **DOMフォールスルー検知**: 全ページで、ルート要素に付いた camelCase 属性や Vue の prop 名らしき素の属性をスキャン（今回 `current="1"` / `isactive="false"` が動かぬ証拠になったのと同じ手法）。B の静的照合とは独立した経路で、両方通れば信頼度が上がる
- **C3**: **behavior assertion**: 主要インタラクションを実際に動かし、期待する状態変化を検証する
  - 全モーダルの開閉、全ページネーション（デスクトップ b-table / モバイル CardPagination 両方）、全ソート、全フィルタ入力、チェックボックス/ラジオの永続化、ローディング表示の出現、バーガーメニューの開閉
  - **モバイル幅（400px）とデスクトップ幅（1280px）の両方**で実施する（今回のバグ3件中2件はモバイル幅でしか発現しなかった）
- **C4**: 地図系は移植済みの Turnstile devバイパス（`VITE_MAPTILER_DEV_KEY`）でコンテナ内実施

### T-D: 検証・記録・PR

- **D1**: `npm run lint`（警告ゼロ）・`npm run build`（成功）
- **D2**: `.claude/research/vue3-verify-checklist.md` を実結果で更新（M5 は「仕様」として記録）
- **D3**: PR用ブランチ `vue3-phase5`（現在 `ee908a8`）を作り直し、T-A/T-B/T-C の修正を英語コミットで積む。base は upstream `vue3`、push・PR作成はホスト側
- **D4**: `lessons.md` へ記録（下記「学び」）
- **D5**: 別PR: アイコンずれ修正（`master` 起点、英語コミット）

## 記録すべき学び（D4）

1. **`<b-modal>` を直したときに、同じ「modelValue 化で旧prop が消えた」パターンの他コンポーネントへ横展開しなかった**のが今回の根本原因。1件バグを見つけたら、その**バグの「型」を定義して全数照合する**
2. このバグ族は **console にエラーも警告も出さない**（Vue 3 の `$attrs` フォールスルー）。console 監視をすり抜けるため、behavior assertion が必須
3. **フォールスルーはDOMに痕跡を残す**（`current="1"` が `<nav>` の素の属性として出現）。これは強力な検知手段になる
4. 旧prop は**一律削除ではない**（`b-tooltip` は今も `active` を持つ）。「`:active` を機械的に全部置換」は誤り。**コンポーネントごとに実物の props を確認**する必要がある
5. 移行の**初期フェーズで自動検証環境を用意しなかった**代償は後段で膨らむ。Phase 2 で入った b-modal バグが Phase 5 まで生き延びた

## 検証方法

- **T-A の各修正**: 修正前に「壊れている」ことを実機で再現 → 修正 → 「直った」ことを実機で確認（今回すでに再現手順は確立済み）
  - b-loading: Map ページで `filtering=true` を立て `.loading-overlay` がDOMに出ること
  - NavBar: 400px 幅でバーガーを開き、ナビリンクをタップしてメニューが閉じること
  - CardPagination: 400px 幅で `/activators/DL6FBK`（19スポット）を開き、次ページクリックでカードが変わること
- **T-B**: スクリプトを**必ずヒットするはずの既知ケース（`b-loading :active`）で較正**してから全体を回す（lessons「検索式を較正する」）。較正できなければ結果は信用しない
- **T-C**: 全ページ巡回のログとスクリーンショットを実物で確認
- **最終**: `npm run lint` / `npm run build` / チェックリスト全項目の diff

## 想定される所要と分割

T-A は機械的で短い。T-B のスクリプト作成が本計画の主工数。T-C は範囲が広いため、**モバイル幅/デスクトップ幅 × ページ群**で分割して進める。セッションをまたぐ場合は handover で引き継ぐ。

## 計画ファイル運用

承認後・実装着手前に本ファイルをコミット。完了時に `git rm`。
