# Phase 3b: vue-maplibre-gl → MapTiler SDK 直結の薄い自前 Vue 統合層（b2）

## Context

upstream #44 で Manuel 氏が「Option 2（SDK を GL エンジンに戻す）」を選択した。
「vue-maplibre-gl 相当の機能を外部依存なしの数百行で再現できるならそれが最もクリーン、
複雑になるならフォーク」という判断。本計画は前者（b2 = ドキュメント付き薄い自前統合層）を
実装する。これにより自前 `transformRequest` による mtsid 再現（ToS 懸念の発端）が不要になり、
セッション課金・`/mapsession` 報告は SDK の公式機構経由に戻る。

現行 Phase 3 実装（`@indoorequal/vue-maplibre-gl` 8.4.2 + 素の maplibre-gl 5）はコミット済み・
検証済み。今回はラッパー層のみを差し替え、消費側 8 ファイルの diff を最小に保つ。

## 裏取り済みの確定事実（実装時に再調査不要）

- SDK 4.0.2 実物（tarball の dist/Map.d.ts・maptiler-sdk.mjs）で確認:
  - Map options: `navigationControl`/`geolocateControl` デフォルト true（load 時に自動追加）、
    `forceNoAttributionControl: true` で attribution + LogoControl を抑制、`logSDKVersion: false`
    でコンソールバナー抑制。scaleControl/terrainControl/fullscreenControl/projectionControl/
    geolocate はデフォルト false
  - config デフォルト: `session=true`（mtsid 付与）・`caching=true`・`telemetry=true`
  - SDK は transformRequest の後段に「api.maptiler.com なら key（無い場合のみ）+ mtsid 付与」を
    常に合成 → 現行 `src/maptiler.js` の完全上位互換
  - セッション ID の正規取得は `map.getMaptilerSessionId()` のみ（`MAPTILER_SESSION_ID` は
    runtime 未 export、mjs grep 0 件）。master でも Map.vue:250 / MiniMap.vue:186 で使用実績あり
  - Marker/Popup/各コントロール/LngLatBounds 等は SDK が再 export → 直接依存 maplibre-gl は削除可
  - maplibre-gl は `~5.21.1` に pin（現行 5.24 から実質ダウングレード。使用 API は安定領域のみ）
  - CSS は `@maptiler/sdk/dist/maptiler-sdk.css`（maplibregl-* クラス内包。master も SDK CSS のみ）
- vue-maplibre-gl のビルド前 TS ソース（node_modules/@indoorequal/vue-maplibre-gl/lib/）で
  移植元機構を確認:
  - Popup: `h("div", {ref}, slots.default())` を描画し `onMounted` で `popup.setDOMContent(root)`。
    DOM は maplibre が物理移動するが vnode は Vue 管理下のままでリアクティビティ維持
    （popup.component.ts:127-210）
  - Marker: `new Marker({element: markerRoot})` 生成後 `isMounted` が立つまで default slot を
    描画しない → slot 内の MglPopup の setup 時点で markerSymbol 解決済み → `marker.setPopup()`
    （marker.component.ts:118-220）。MapPhoto/MapWebcam はこの「Marker default slot 内 Popup」構造
  - Source/Layer のスタイル切替再登録: Source は `map.on("style.load", addSource)` で再追加、
    Layer は `watch([isLoaded, sourceRef])` で source 再生成に反応して addLayer。
    アンマウント順序（親 Source が子 Layer より先に beforeUnmount）は SourceLayerRegistry
    （id→removeLayer の小型 Map、~15 行）で解決（useSource.ts / useLayer.ts / sourceLayer.registry.ts）
  - useControl は props を setup 時に一度しか評価しない（:key 回避策の原因）→ 自前層では
    watch → remove+再生成+addControl で解決

## 設計判断

1. **新モジュール `src/mapgl/`**（計 ~650 行、plain JS の defineComponent、コメント英語）。
   公開 API は現行 vue-maplibre-gl と同名・同 props/emits/slots（SOTLAS が使うサブセットのみ。
   汎用ラッパーは狙わない）
2. **`transformRequest` prop は実装しない**（SDK 内蔵で不要）。`src/maptiler.js` は削除
3. **`config.telemetry = false` を明示**（SDK 3 以降の新機構。master の SDK 2.0.3 に telemetry は
   無く、本番 Vue 2 と等価にするため。Manuel 氏が PR レビューで覆せるよう README に明記）。
   `session=true`・`caching=true` はデフォルト維持
4. SDK 固有挙動の抑制: `navigationControl: false`, `geolocateControl: false`,
   `forceNoAttributionControl: true`（attributionControl=false 時）, `logSDKVersion: false`
5. bounds の同値ガード（JSON.stringify 比較）と control props の watch 追従を層側に内蔵し、
   消費側の回避策（MiniMap の stableBounds、AttributionControl の `:key="$mq.mobile"`）を撤去
6. `mapSymbol`（load 前解決の ShallowRef）は自前層でも同一契約で provide。
   MapDraw.vue は import パス変更のみで 906e449 の「load 前 addControl」動作を維持
7. 依存: `@maptiler/sdk ^4.0.2` 追加、`@indoorequal/vue-maplibre-gl` と直接依存 `maplibre-gl` を
   削除（二重バンドル防止のため自前層は必ず `@maptiler/sdk` から import）

## ファイル構成（src/mapgl/）

| ファイル | 責務 | 行数目安 |
|---|---|---|
| `index.js` | 公開 re-export（10 コンポーネント + mapSymbol） | ~15 |
| `keys.js` | InjectionKey 用 Symbol 群 + SourceLayerRegistry | ~30 |
| `MglMap.js` | SDK Map 生成・provide・イベント中継・prop watch・webglcontextlost 再初期化 | ~170 |
| `MglPopup.js` | setDOMContent 方式。marker 子モードと座標スタンドアロンモード | ~90 |
| `MglMarker.js` | named slot `marker` を element に。default slot は marker 生成後描画 | ~85 |
| `controls.js` | useControl（watch→再生成）+ Navigation/Geolocate/Scale/Attribution | ~130 |
| `MglGeoJsonSource.js` | addSource + style.load 再登録 + setData watch + registry provide | ~70 |
| `layers.js` | createLayerComponent → MglLineLayer/MglSymbolLayer | ~90 |
| `README.md` | 設計ドキュメント（英語、下記） | — |

MglMap の要点:
- props: mapStyle, bounds, fitBoundsOptions, center, zoom, dragRotate, attributionControl,
  **apiKey（新設）**。emits: map:load / map:click / map:contextmenu / map:moveend / map:idle
  （payload は現行互換の `{ type, map, event }`）
- render は fragment（div + isInitialized 後の slot）。消費側は C3（7f734ce）で対応済み
- webglcontextlost → dispose → nextTick 再初期化（vue-maplibre-gl の restart パターン踏襲）

## 消費側の変更

- MapRoute / MapPhoto / MapWebcam / SummitPopup / MapInfoPopup / MapDraw: **import 1 行のみ**
  （`'@indoorequal/vue-maplibre-gl'` → `'../mapgl'`）
- Map.vue / MiniMap.vue: import 変更 + `:transformRequest` 削除 + `:apiKey="mapTilerApiKey"` 追加 +
  `reportMapSession('map'|'mini', this.map.getMaptilerSessionId())` へ変更（master と同形に復帰）
- App.vue:48: CSS import を `@maptiler/sdk/dist/maptiler-sdk.css` へ
- vite.config.mjs:87: optimizeDeps.include を `'@maptiler/sdk'` へ
- 回避策撤去: Map.vue/MiniMap.vue の `:key="$mq.mobile"`、MiniMap の stableBounds 一式

## コミット分割（日本語コミット。各コミット単独で lint/build が通る）

1. `build: 地図エンジンとして@maptiler/sdk 4.0.2を追加`（package.json/lock のみ）
2. `feat: MapTiler SDKベースの自前Vue統合層src/mapglを追加`（新モジュール一式、未参照）
3. `refactor: 地図コンポーネントをvue-maplibre-glからsrc/mapglへ切替`
   （消費側 8 ファイル + App.vue CSS + src/maptiler.js 削除 + mapsession 配線）
4. `build: @indoorequal/vue-maplibre-glと直接依存maplibre-glを削除`（package.json/lock/vite.config）
5. `refactor: 統合層のprop追従対応で不要になった回避策を削除`（:key、stableBounds）
6. `docs: 地図統合層src/mapglの設計ドキュメントを追加`（README.md）

## 検証計画

**コンテナ内**: `npm install` → `npm run lint`（警告ゼロ）→ `npm run build` →
dist/assets に maplibre が 1 系統のみか grep 確認。

**ホスト側ブラウザ**（`npm run dev`、Phase 3 検証リストの再実行 + SDK 固有項目）:
1. Map 基本・summit クリック・SummitPopup
2. スタイル切替（maptiler_outdoor⇄winter⇄swisstopo 等）**切替後にルート線・オプションレイヤーが
   復活するか**（再登録機構の本丸）
3. draw（クリック即描画 = load 前 addControl 維持・標高グラフ・GPX save/open）・PNG DL・webcams
4. MiniMap 4 ページ（enlarge・photo マーカー・**Activator 無限スクロールで地図が動かない** =
   層内蔵 bounds ガード）
5. URL 同期・localStorage bounds 復元・長押し座標・geolocate・scale 単位
6. **Network（重点）**: api.maptiler.com 全リクエストに mtsid・key 二重付与なし・`/mapsession`
   POST が map/mini 各 1 回・sessionId がタイルの mtsid と一致・**telemetry（/metrics）POST が無い**
7. attribution compact が**リサイズに追従**（:key 撤去後）・ナビ/ジオロケート二重表示なし・
   MapTiler ロゴなし・SDK バージョンバナーなし

注記: SDK は load 時に tiles.json を 1 回 fetch する（forceNoAttributionControl でも実行）。
Network 検証時に異物と誤認しないこと。

## 設計ドキュメント（src/mapgl/README.md、英語）

1. Why this module exists（vue-mapbox fork → vue-maplibre-gl → in-house layer の経緯と判断）
2. Why the MapTiler SDK Map, not bare maplibre-gl（mtsid 課金・key 注入・getMaptilerSessionId）
3. Architecture(mapSymbol 契約・popup DOM マウント・style.load 再登録)
4. SDK behaviors we suppress or rely on（オプション表 + telemetry=false の判断）
5. What to check when upgrading @maptiler/sdk（デフォルトコントロール・transform 条件・
   config デフォルト・maplibre pin・getMaptilerSessionId 存続）
6. Supported API surface（"not a general-purpose wrapper" 明記）

## 実装後

- lessons.md へ学び記録（あれば）
- upstream #44 へ完了報告コメント（英語・非署名）— 内容はホスト側 push・sotl.as/vue3 デプロイ
  確認後にユーザーと相談
- 計画ファイルは完了時に `git rm`

## 実装体制

既定で Sonnet が実装。Popup/Marker の Vue コンテンツマウントと style.load 再登録は移植元
（node_modules/@indoorequal/vue-maplibre-gl/lib/ の TS ソース）が現存するため機械的に移植可能。
ただし移植後にリアクティビティ喪失・イベント順序などの原因不明な挙動が出た場合は、
実装中委譲 3 条件（難解なデバッグ）に該当するため上位モデルサブエージェントへ諮問する。
