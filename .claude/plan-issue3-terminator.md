# 計画: issue #3 地図上に夜間帯(ターミネーター)表示

作成日: 2026-07-07
起票: https://github.com/jj1xgo/sotlas-frontend/issues/3
計画担当: Fable(サブエージェント委譲、フォールバックなし)
scope: 本ファイルはgit未追跡(`.claude/`配下)。upstream PRには含めない。

## 前提の検証結果(実コード確認済み)

| 前提 | 検証結果 |
|---|---|
| suncalc等は未導入 | 確認。`package.json` に太陽計算系依存なし |
| `nowticker.js` が1分ごとの `this.now` を提供 | 確認(60000ms間隔) |
| 動的レイヤー追加のテンプレート | 当初候補の `mapstyle.js` snowcover は swisstopo専用の命令的実装で**不適**。`MapRoute.vue` の宣言的パターン(`MglGeojsonLayer` + `before="summits_selected"`)が適合 |
| `mapOptions` トグル機構 | 確認。`store.js` の `setMapOption` mutationで永続化 |
| クライアントサイドで完結可能 | 確認。バックエンド・外部データ不要 |
| 地図タイプ非依存性 | **確認: 全9地図タイプで一律対応可能**。`summits_selected` レイヤーが全スタイルに存在しアンカーとして使える |

### セッション側での裏取り(2026-07-07、Fableセッションで実コード再確認済み)

- vue-mapbox `GeojsonLayer.js:91-98`: `source.data` を deep watch して `setData()` を呼ぶ。`initial` フラグはマウント完了時(`:124`)に解除されるため、マウント後の1分ティック更新は反映される
- `summits_selected`: ローカル7スタイル(`src/assets/*.json`)全てに存在。クラウドスタイルでも `MapRoute.vue:3-4` が `before="summits_selected"` を実運用中
- `store.js:40-48`: localStorageマージは保存済みキーのみ上書き。新規キー `terminator: false` は既存ユーザーでもデフォルトOFFで安全に導入できる(Vuexストア生成前のデフォルトオブジェクトに含めるためVue 2のリアクティビティ問題もなし)
- `Map.vue:3`: `MglMap` に `renderWorldCopies` 指定なし(デフォルトtrue)。GeoJSONは世界コピーへ自動複製される
- `MapOptionsControl.vue`: 全項目が `b-checkbox` + `setMapOption(key, $event)` の一貫パターン

## 推奨方針

1. **計算ライブラリ**: 自前実装(`src/utils/terminator.js`、leaflet.terminatorのアルゴリズムを移植・出典コメント付き)。suncalcを追加してもポリゴン生成自体は自前実装が必要で、依存追加の節約効果がないため
2. **更新頻度**: `nowticker` の1分間隔をそのまま流用(ターミネーターの移動速度から見て十分)
3. **描画方式**: 4段階薄明(日没/市民薄明6°/航海薄明12°/天文薄明18°)を基本案。初版を2段階(夜間fill+市民薄明)に縮小する選択肢もあり
4. **mapOptions統合**: トグル可能・デフォルトOFF。`MiniMap.vue`にはマウントしない(ズームインでは単に暗くなるだけで実用性が低いため)

## 確定事項(2026-07-07 ユーザー確認済み)

1. **計算方式**: 自前実装(npm依存なし)で進める。leaflet.terminator(MIT)の数学部分を出典明記で移植
2. **描画段階数**: 4段階(日没+市民薄明6°+航海薄明12°+天文薄明18°の入れ子)
3. **PR粒度**: 自リポジトリ(jj1xgo)で先行運用し、実用性確認後にupstreamへ提案
4. UI文言は "Day/night terminator" を既定とし、infoダイアログは初版では省略(実装時に微調整可)

## 実装ステップ(承認後)

1. `src/utils/terminator.js` 新規作成: 日時(UTC)→太陽赤緯+グリニッジ時角→サブソーラーポイント→指定俯角ごとの夜側ポリゴンGeoJSONを返す純関数
2. `src/components/MapTerminator.vue` 新規作成: `nowticker`ミックスイン + `MglGeojsonLayer`(`before="summits_selected"`)、`MapRoute.vue`を雛形にする
3. `src/store.js`: `mapOptions`デフォルトに `terminator: false` 追加
4. `src/views/Map.vue`: `<MapTerminator v-if="mapOptions.terminator" />` を `MapWebcams` と同様に追加
5. `src/components/MapOptionsControl.vue`: チェックボックス追加(地図タイプ非依存のため `v-if` ガード不要。配置グループはWebcams/Spots系オーバーレイ群の近くを想定、実装時に確定)
6. 手動検証: 全9地図タイプ表示、トグル永続化、1分ティック移動、日付変更線・極域・高緯度夏(白夜)、半透明バンド重なり、UTC/ローカル時刻の取り違えなし(`this.now.toDate()` でDate化し計算はUTC基準)、地図PNGダウンロード(`MapDownloadControl`)へのターミネーター写り込みが妥当であること
7. `npm run lint` 通過確認

想定リスク: (a)半透明ポリゴン重なりの合成挙動、(b)極域でのポリゴン閉合。いずれもバンド別レイヤー化・リング形状化で回避可能。

## 参照ファイル

- `src/views/Map.vue`(MapTerminatorのマウント先)
- `src/components/MapRoute.vue`(MglGeojsonLayer雛形)
- `src/mixins/nowticker.js`(時刻更新ミックスイン)
- `src/store.js`(mapOptions定義)
- `src/components/MapOptionsControl.vue`(トグルUI)
- 新規作成予定: `src/utils/terminator.js`, `src/components/MapTerminator.vue`
