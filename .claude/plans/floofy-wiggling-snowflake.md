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

### C3: fragment render 対応（表示調整）**完了**（コミット `7f734ce`）

新 MglMap は fragment（div + スロット）を render するため class 継承・scoped CSS が効かない:
- `Map.vue`: `class="map"` を MglMap から外し、`.map :deep(.maplibregl-popup) { max-width: 600px !important }`
  の死亡に対処 → SummitPopup 等 Map.vue 配下のポップアップに `:max-width="'600px'"` prop を付与
  （新 MglPopup はデフォルト 240px をインライン設定するため、prop で指定しないと SummitPopup が潰れる）
- `MiniMap.vue`: ルート div に `position: relative` を追加（スロット直書きの zoom-warning /
  MapEnlargeControl の absolute 基準が map div の兄弟化で外へ飛ぶため）。
  死んでいる `.map :deep(...)` ルール（現行でも無効）は削除
- dev の「Extraneous non-props attributes」警告ゼロを確認 **OK**（ホスト実機・Claude in Chrome併用で
  SummitPopup幅・zoom-warning/enlargeボタン位置・警告消失を確認済み）

### C4: cleanup・低リスク改善 **完了**（コミット `7977570`）

- `MapDownloadControl.vue`: プライベート API `this.map._render()` → 公開 API `this.map.redraw()`
  （maplibre 5 の d.ts で実在確認は実装時に行う）**完了**。`redraw()`は内部で`_render(0)`を
  同期呼び出しするため`render`イベントも従来通り発火することをdist本体で確認済み
- Activator/Association/Region の MiniMap `:bounds`（computed が毎回新配列を返す）で地図が意図せず
  リセンターされないかホスト検証し、問題があれば MiniMap 側で初期値を data に固定 →
  **「初期値に一度だけ固定」から「値が実質同じ場合だけ古い参照を使い回す」方式へ変更**（設計判断の
  逸脱、Fableサブエージェントでレビュー済み・妥当性確認済み）。理由: `App.vue`の`router-view`は
  `:key`無しで`<component :is="Component" />`を使っており、Region/Association間のページ内遷移
  （例: `/summits/JA/AC`→`/summits/JA/BC`）では同一コンポーネントインスタンスが再利用され、
  `region.bounds`/`association.bounds`は`watch: { regionCode/associationCode() {...} }`経由で
  正当に新しい値になる。一度きりの固定だとこの正当な地域変更に地図が追従しなくなる別の不具合を
  作り込むため、`MiniMap.vue`に`stableBounds`data＋`bounds`propのJSON.stringify比較watchを追加し、
  値が変わった時だけ`stableBounds`を更新してそちらを`MglMap`へbindする方式にする。**完了**。
  なお実装当初の懸念（Activatorの一覧ページ送りで地図が勝手に元位置へ戻る）は、Claude in Chrome
  拡張の合成マウスイベントによるパン操作がMapLibreのdragPanハンドラに実際にはコミットされていな
  かったテスト手法側のアーティファクトと判明（ユーザーによる手動操作では再現せず）。3ラウンドの
  切り分け（Network・`bounds`watchへのデバッグログ・`onMapLoaded`再マウント検出）でいずれも
  該当コードパスが実行されていないことを確認し、`stableBounds`自体の対策（本来の懸念である
  スプリアスな同値再フィット防止）は理屈上妥当なため採用、ページ送り時の見かけ上の現象は
  実機再現せずクローズ

## 既知リスク（実装では解決せず検証で確認）

- ~~**mapbox-gl-draw fork**（`#sotlas2`、MapDraw.vue のみ）...~~ **解決済み**。ホスト検証で発覚した
  3件の不具合を修正しコミット済み（詳細は次回 handover / git log 参照）:
  - `906e449`: `MapDraw.vue` が自前 provide('map', computed(...))（load後にしか解決しない）に依存して
    いたため、addControl 時点で mapbox-gl-draw 内部が「map.loaded()==false→16msポーリング待ち」に
    落ち、クリックしても描画されなかった。`@indoorequal/vue-maplibre-gl` が公開する `mapSymbol`
    （load前から解決済みのShallowRef）から直接injectし、load前にaddControlする方式へ変更
  - `150fd68`: 標高API(`VITE_ELEVATION_API_URL`)呼び出しにtimeout未設定で、応答が無いと永久に
    ローディングスピナーが残る不具合。`timeout: 10000` を追加
  - `fbee667`: `this.$buefy.loading.open()` を引数無しで呼んでおり、Buefy 3.0の内部実装が
    close時に`params.onClose`を参照するため`undefined`アクセスで例外→スピナーが閉じない不具合。
    他の呼び出し箇所と同様に `{}` を渡すよう修正
  - ホスト実機（Claude in Chrome 併用）で LineString描画・標高グラフ・save(gpx生成)まで
    end-to-endで動作確認済み。openアイコンのOSファイル選択ダイアログ表示自体は自動化ツールの
    制約で未検証（ユーザー目視のみ、リスクは低いと判断）
- **maplibre-gl 5 は WebGL2 必須**（WebGL1 のみの古い端末で地図が出なくなる）。完了報告で Manuel に明示
- webglcontextlost 時の新ライブラリの自動再初期化で `reportMapSession` が再 POST される（軽微・許容）

## 検証

- コンテナ内: `npm install` 後 `npm run lint`（警告ゼロ）・`npm run build`
- ホスト側ブラウザ（ユーザー実施、`npm run dev`）:
  1. Map ページ基本表示 → summit クリック / SummitPopup（幅 600px 相当で崩れない）**OK**
  2. filter・options（spots/alerts ハイライト）・スタイル切替（maptiler_outdoor/winter + swisstopo 等
     ローカル、切替後にルート線・オプションレイヤーが残るか）**OK**。filterが反映されないという報告は
     再現せず（`points`条件でsetFilter・getFilterとも正常）、「極小アイコン」は`summits_circles_all`
     による意図的な仕様（フィルタ対象外サミットを薄く小さく常時表示、upstream #18）と判明、バグではない
  3. draw（open/save 含む）/ PNG ダウンロード / webcams **OK**（上記「既知リスク」参照）。openダイアログの
     目視確認も完了（ユーザー実施、保存→選択→開くの一連の流れ正常）
  4. MiniMap 4 ページ（Summit/Activator/Association/Region）: enlarge・zoom-warning の位置、
     photo マーカー、Activator で一覧更新時に地図が勝手に動かないか（C4）**OK**。Summitページのみ
     enlarge・写真マーカー表示（設計通り、`canEnlarge`propはSummit.vueのみ付与）、zoom-warningは
     Activatorページのみ・zoom<3でのみ表示（設計通り、今回未達だが仕様確認済み）、Activatorで地図が
     勝手に動く挙動なし
  5. URL 同期（地図移動で /map/coordinates/... が replace される）・localStorage bounds 復元 **OK**。
     ドラッグ・ズームでURL/localStorage(`bounds`キー)とも正しく更新、リロード後の復元も確認
     （復元時に一瞬白画面になる体感の待ち時間はあるが軽微）
  6. Network タブ: api.maptiler.com リクエストに `mtsid` 付与・`key` 二重付与なし・`/mapsession` POST 1回
     **OK**
  7. 長押し座標ポップアップ・geolocate・scale 単位・attribution（モバイル compact）**OK**（座標ポップアップ・
     geolocate・scale単位切替は正常。attributionのモバイルcompact表示は`@indoorequal/vue-maplibre-gl`の
     `useControl`が`compact`propの変更を監視しない不具合と判明、`:key="$mq.mobile"`で再生成させる形で
     修正・検証済み、コミット`5956f8c`）

  **別途報告済みの追加不具合（要調査、優先度は次回相談）**:
  - 地図種類アイコンがポップアップ表示後に下へ位置ずれ（C3のfragment render問題で説明可能と見ていたが、
    C3完了後の再検証は未実施）
  - solar_history等へのリンク(SFI)が見た目上表示されないが実際はリンクとして機能する（Phase2の
    Buefy/bulma移行絡みの可能性、CSS調査が必要）
  - Summitページの写真ギャラリー（`SummitPhotosGroup`/`PictureSwipe`、`vuedraggable`使用）で、
    地図ドラッグ時にvuedraggable由来のConsole例外（`getSlot`のTypeError・patch処理の`__vnode`エラー）
    が発生。Vue2専用の`vuedraggable ^2.24.3`をそのまま使っていることが原因とみられ、Phase 4
    （小物ライブラリのVue3対応）の対象。並び替え機能自体が壊れている可能性が高く、優先度は
    「中〜低」→「中」への引き上げを検討（Fableサブエージェントの評価）
  - Summitページで`svgicon`コンポーネント未解決の警告あり（`Failed to resolve component: svgicon`）、
    未調査

## スコープ外（このタスクではやらない）

- terminator（MapTerminator.vue）の Vue 3 版再実装（feat/night-terminator は master 未マージ、移行後に別途）
- vue-keycloak-js / vue-native-websocket / vuedraggable 等（Phase 4）

## 完了後

- upstream #44 への Phase 3 完了報告ドラフト作成（ユーザーが投稿）: MapTiler 統合の回答
  （SDK 不要・transformRequest でセッション維持）、@indoorequal fork 選定理由、fork パッチ3件の帰趨、
  WebGL2 要件、既知の見た目差分
- 実装は全タスク Sonnet 想定（設計判断は本計画で解消済み。mapbox-gl-draw が maplibre 5 で壊れた場合のみ
  上位モデル委譲を再検討）
