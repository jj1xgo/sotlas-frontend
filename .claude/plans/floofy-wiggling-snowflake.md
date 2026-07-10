# Phase 3: vue-mapbox fork → @indoorequal/vue-maplibre-gl 移行計画

## 先行タスク: Phase 0-2 の upstream 初回 PR 準備（Phase 3 実装より先に実施）

調査済みの事実: upstream/vue3 は upstream/master と同一（f114b72）。master..feat/vue3-migration の
19 コミットは「PR 対象 8（Phase 1 の 1/N〜7/N + Phase 2、コード・依存のみ）」と「ローカルのみ 11
（全て .claude/ / CLAUDE.md の docs）」に完全分離でき、パスの混在なし。

1. （コンテナ内）`git checkout -b vue3-phase1-2 upstream/vue3` → 8 コミットを順に cherry-pick、
   **各コミットメッセージを英語に書き直す**（ユーザー決定済み。fork 側 feat/vue3-migration は日本語のまま）
2. 検証: `git diff vue3-phase1-2 feat/vue3-migration --stat` がローカルパッチのみであること、
   `npm ci` + `npm run lint` + `npm run build` が単独で通ること。確認後 feat/vue3-migration に戻る
3. PR タイトル・本文の英語ドラフトを作成しユーザーへ提示
4. （ユーザー・ホスト側）`git push origin vue3-phase1-2` → GitHub Web UI で
   base: `manuelkasper:vue3` ← `jj1xgo:vue3-phase1-2` の PR を作成

## Context

Vue 3 移行の Phase 3（地図ライブラリ）。upstream #44 で manuelkasper 氏が vue3 ブランチ作成・
計画合意済み。同氏から「MapTiler 統合の最善手を検討してほしい」という宿題と、vue-mapbox fork の
パッチ経緯（bounds 同期・popup 修正・MapTiler 対応・attribution 修正）の説明を受領済み。
現状は Vue 2 用 fork を overrides で無理やり Vue 3 に解決しており、v-model:bounds や popup 注入は
既に壊れている可能性が高い。**パリティ比較の基準は master（本番 Vue 2）の挙動**とする。

## 調査で確定した設計判断（3件）

1. **移行先は `@indoorequal/vue-maplibre-gl` 8.4.2**（npm の `vue-maplibre-gl`=razorness 版 5.6.1 とは
   別物。razorness 版には MglPopup が無く、アプリは6ファイルで Popup を使うため不採用）。
   必要な8コンポーネント種は全て 1:1 で存在（ソース裏取り済み）。peer: maplibre-gl ^5.0.0 / vue ^3.4.18。
   ※ upstream には「vue-maplibre-gl 5.6.1」と報告済みのため、完了報告で fork 選定理由を補足する
2. **GL エンジンは素の maplibre-gl 5.x、@maptiler/sdk は削除**。SDK のセッション機構の正体は
   「モジュールレベル UUID を api.maptiler.com へのリクエストに `mtsid` クエリとして付与」だけ
   （node_modules 実物で確認: key は無い場合のみ付与、mtsid は session 有効時常に付与）。
   → `transformRequest` ~15行で完全再現でき、**MapTiler セッション課金と `/mapsession` 報告を維持**。
   これが Manuel の宿題への回答になる
3. **fork の 2024 年パッチ3件（MapTiler 2.0 hack / デフォルトコントロール除去 / attribution 重複排除）は
   全て SDK をエンジンにするためのハックで、素の maplibre-gl では不要**。2019 年の bounds 同期パッチは
   moveend ハンドラで、popup 修正は新ライブラリ自体で代替（diff で確認済み）

## 実装（コミット4分割、各コミットでビルド可能を維持）

### C1: クラウドスタイルの URL 化（先行・現行フォークでも動くため独立検証可能）

- `src/mixins/mapstyle.js` L29-40: `mapStyle` computed のクラウドスタイル UUID 返却を
  `https://api.maptiler.com/maps/<uuid>/style.json` の完全 URL に変更（key はクエリに含めない。
  現行 SDK も新 transformRequest も key を自動付与するため両対応）。ローカルスタイルの `{key}` 置換は現状維持

### C2: 本体スワップ（vue-mapbox 削除は全ファイル同時でないとビルド不能、分割不可）

**依存・設定:**
- `package.json`: `vue-mapbox` と overrides の vue-mapbox 行を削除、`@maptiler/sdk` を削除、
  `maplibre-gl@^5`・`@indoorequal/vue-maplibre-gl@^8.4.2` を追加
- `vite.config.mjs`: optimizeDeps から `map-promisified`・`events` を削除（`maplibre-gl` は残して様子見）
- `src/App.vue`: CSS import を `@maptiler/sdk/dist/maptiler-sdk.css` → `maplibre-gl/dist/maplibre-gl.css`

**新規 `src/maptiler.js`:**
- `maptilerSessionId`: `crypto.randomUUID()`（non-secure context フォールバック付き）をモジュールレベルで1個生成
- `transformRequest(url)`: host が `api.maptiler.com` のとき `key`（**無い場合のみ**、store から動的に読む）と
  `mtsid` を付与。SDK 実装のガード条件を踏襲（key 二重付与防止）

**`src/views/Map.vue` / `src/components/MiniMap.vue`（MglMap 保有2ファイル）:**
- import 元を `@indoorequal/vue-maplibre-gl` に変更、`:apiKey` 削除、`:transform-request` 追加
- イベント名: `@load`→`@map:load`、`@click`→`@map:click`、`@contextmenu`→`@map:contextmenu`、
  `@idle`→`@map:idle`（payload の `event.map` は同形で取れる）
- `event.mapboxEvent.*` → `event.event.*`（point / lngLat / originalEvent.hitMarker）
- `reportMapSession('map'|'mini', ...)` の引数を `getMaptilerSessionId()` → `maptiler.js` の `maptilerSessionId` に
- **provide 再設計**: 現 Map.vue の `provide() { return { map: this.map } }` は非リアクティブで死んでいる
  （実際は vue-mapbox MglMap の文字列キー provide が効いていた。新ライブラリは Symbol キーのため文字列
  `'map'` の供給が消える）。対処:
  - `map` を `data()` に移す（新ライブラリが `markRaw` 済みの Map を渡すため reactive proxy 化されない）
  - `provide() { return { map: computed(() => this.map) } }`（Vue 3.3+ は Options API の injected ref を
    自動アンラップするため、子6ファイルの `inject: ['map']`・`this.map.*`・`watch: { map }` は**無変更**）
  - MiniMap.vue も同様（現状 provide 無しなので新設）
- **子のマウントタイミング維持**: 新ライブラリはスロットを map 生成直後（load 前）から描画するため、
  MapFilterControl（mounted で無ガード setFilter）と MapOptionsControl（immediate watcher で無ガード
  setFilter）がクラッシュする（実ファイルで確認済み）。→ Map.vue の
  `<div class="maplibregl-ctrl-top-left">` に `v-if="map"` を付け、load 後マウント（=現行挙動）を維持。
  子ファイルは無変更
- **bounds**: `v-model:bounds` → `:bounds`（初期値・プログラム遷移用。新ライブラリは bounds prop 変更で
  fitBounds を呼ぶ）。旧 bounds watcher の処理（localStorage 保存・updateMapURL・setMapCenter 更新・
  zoomWarning 判定）は `@map:moveend` ハンドラへ移設（maplibre は zoom 操作でも moveend が出るため
  moveend のみで等価。dragRotate=false なので rotate/pitch 不要）。
  **moveend 内で `this.bounds` を書き戻さない**（fitBounds ループになる）。localStorage へは
  `this.map.getBounds().toArray()` を直接保存。`this.$refs.filterControl` 等は `?.` ガード
- `@added` ハック（`onPopupAdded`）削除 → loading ポップアップに `:focus-after-open="false"`

**`src/components/MapRoute.vue`:**
- `MglGeojsonLayer`×2 → `<MglGeoJsonSource :source-id :data>` + 子に `<MglLineLayer>` / `<MglSymbolLayer>`
  （`layer` オブジェクトを `layout` / `paint` props に分解、`before="summits_selected"` 維持、
  `:data` は現 `trackSource.data` / `waypointSource.data`）
- `MglMarker`×3 は `v-slot:marker` 互換のため import 変更のみ

**`src/components/SummitPopup.vue` / `MapInfoPopup.vue` / `MapPhoto.vue` / `MapWebcam.vue`:**
- import 変更、`:showed` 削除（表示は親の v-if で制御済み）、`@added` ハック → `:focus-after-open="false"`
- マーカー内ポップアップ構造（MglMarker default スロット内の MglPopup）は互換、維持
- `@open` / `@close` イベントは同名で存在、維持

### C3: fragment render 対応（表示調整）

新 MglMap は fragment（div + スロット）を render するため class 継承・scoped CSS が効かない:
- `Map.vue`: `class="map"` を MglMap から外し、`.map :deep(.maplibregl-popup) { max-width: 600px !important }`
  の死亡に対処 → SummitPopup 等 Map.vue 配下のポップアップに `:max-width="'600px'"` prop を付与
  （新 MglPopup はデフォルト 240px をインライン設定するため、prop で指定しないと SummitPopup が潰れる）
- `MiniMap.vue`: ルート div に `position: relative` を追加（スロット直書きの zoom-warning /
  MapEnlargeControl の absolute 基準が map div の兄弟化で外へ飛ぶため）。
  死んでいる `.map :deep(...)` ルール（現行でも無効）は削除
- dev の「Extraneous non-props attributes」警告ゼロを確認

### C4: cleanup・低リスク改善

- `MapDownloadControl.vue`: プライベート API `this.map._render()` → 公開 API `this.map.redraw()`
  （maplibre 5 の d.ts で実在確認は実装時に行う）
- Activator/Association/Region の MiniMap `:bounds`（computed が毎回新配列を返す）で地図が意図せず
  リセンターされないかホスト検証し、問題があれば MiniMap 側で初期値を data に固定

## 既知リスク（実装では解決せず検証で確認）

- **mapbox-gl-draw fork**（`#sotlas2`、MapDraw.vue のみ）: dist は self-contained で maplibre 4.7 実績あり。
  maplibre 5 でホスト検証。壊れた場合のみ別途対応（fork の open/save 独自コントロールは維持必須）
- **maplibre-gl 5 は WebGL2 必須**（WebGL1 のみの古い端末で地図が出なくなる）。完了報告で Manuel に明示
- webglcontextlost 時の新ライブラリの自動再初期化で `reportMapSession` が再 POST される（軽微・許容）

## 検証

- コンテナ内: `npm install` 後 `npm run lint`（警告ゼロ）・`npm run build`
- ホスト側ブラウザ（ユーザー実施、`npm run dev`）:
  1. Map ページ基本表示 → summit クリック / SummitPopup（幅 600px 相当で崩れない）
  2. filter・options（spots/alerts ハイライト）・スタイル切替（maptiler_outdoor/winter + swisstopo 等
     ローカル、切替後にルート線・オプションレイヤーが残るか）
  3. draw（open/save 含む）/ PNG ダウンロード / webcams
  4. MiniMap 4 ページ（Summit/Activator/Association/Region）: enlarge・zoom-warning の位置、
     photo マーカー、Activator で一覧更新時に地図が勝手に動かないか（C4）
  5. URL 同期（地図移動で /map/coordinates/... が replace される）・localStorage bounds 復元
  6. Network タブ: api.maptiler.com リクエストに `mtsid` 付与・`key` 二重付与なし・`/mapsession` POST 1回
  7. 長押し座標ポップアップ・geolocate・scale 単位・attribution（モバイル compact）

## スコープ外（このタスクではやらない）

- terminator（MapTerminator.vue）の Vue 3 版再実装（feat/night-terminator は master 未マージ、移行後に別途）
- vue-keycloak-js / vue-native-websocket / vuedraggable 等（Phase 4）

## 完了後

- upstream #44 への Phase 3 完了報告ドラフト作成（ユーザーが投稿）: MapTiler 統合の回答
  （SDK 不要・transformRequest でセッション維持）、@indoorequal fork 選定理由、fork パッチ3件の帰趨、
  WebGL2 要件、既知の見た目差分
- 実装は全タスク Sonnet 想定（設計判断は本計画で解消済み。mapbox-gl-draw が maplibre 5 で壊れた場合のみ
  上位モデル委譲を再検討）
