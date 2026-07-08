# Vue 3 移行 実現可能性調査・実行計画

作成: 2026-07-07（Fable 5）
背景: upstream issue [manuelkasper/sotlas-frontend#44](https://github.com/manuelkasper/sotlas-frontend/issues/44) で
メンテナが「新機能より先に Vue 3 移行（Buefy v3 等の依存更新込み）をやるべき。AI にやらせるのは試す価値がある」と回答。
本書はその移行の実現可能性調査と、**Sonnet 単独で実行できる粒度**の段階計画。上位モデル（Fable/Opus）への
依存は計画時点で最小化してある（経緯: Fable の定額枠内利用が 2026-07-08 まで。以降の実装は Sonnet が主担当）。

## 結論（サマリ）

**移行は現実的に可能。** 根拠:

- コードベースは中規模（.vue 94 + .js 25、計 20,676 行）で、ほぼ全て Options API。
  Options API は Vue 3 でもそのまま動くため、アプリコードの書き換え対象は計測済みの少数パターンに限られる
- 依存ライブラリは全てに Vue 3 対応版または代替が存在する（下表、npm registry で 2026-07-07 裏取り済み）。
  特に最大の依存 Buefy は v3.0.8（2026-06-08 公開、vue ^3.0.0）が実在し活発にメンテされている
- 最大のリスクはコードでなく**検証体制**（テスト無し・目視のみ）。ページ別チェックリストと段階コミットで補う

工数感: Phase 構成で 8〜15 セッション程度（幅があるのは Buefy 0.8→3 の API 差分量と
vue-mapbox 置き換えの難度が実装時まで確定しないため）。1〜2 フェーズ/セッションで区切り、都度 handover。

## 依存ライブラリ棚卸し

裏取り方法: registry.npmjs.org の dist-tags と peerDependencies.vue を直接取得（2026-07-07）。

### 要移行（Vue 依存）

| 現行 | 移行先 | 裏取り結果 | 使用箇所 |
|---|---|---|---|
| vue ^2.7.16 | vue 3.x | — | 全体 |
| @vitejs/plugin-vue2 | @vitejs/plugin-vue | latest 6.0.7 (vue ^3.2.25) | vite.config.mjs |
| buefy ^0.8.20 | buefy 3.x | **3.0.8 (vue ^3.0.0, 2026-06-08)** | 27 種 440 タグ + `$buefy` 31 箇所 |
| vue-router ^3.6.5 | vue-router 4（安定後 5 検討） | 4 系が公式移行ガイドの対象。latest 5.1.0 (vue ^3.5.34) | router.js |
| vuex ^3.6.2 | vuex 4（API ほぼ互換） | 4.1.0 (vue ^3.2.0) | store.js |
| @fortawesome/vue-fontawesome ^2 | 同 v3 | 3.3.0 (vue >=3 <4) | main.js |
| vue-mapbox (fork #10cb772) | **vue-maplibre-gl** | 5.6.1 (vue ^3.5.27, 2026-02) | 地図系 8 ファイル（下記） |
| vuedraggable ^2.24.3 | vuedraggable@next (4.1.0) | dist-tag `next`=4.1.0 | PictureSwipe.vue のみ |
| vue-filepond ^6 | vue-filepond 8 | 8.0.0 (vue >=3 <4) | 写真アップロード系 |
| @gaviti/vue-turnstile ^0.6.5 | 同 1.x | 1.1.4 (vue ^3.5.13) | App.vue |
| @dsb-norge/vue-keycloak-js (fork #sotlas3) | 上流 v3 系 | 3.0.8 (vue >=3.0.0, 2026-06-15) | main.js + mixins/ssoauth.js 他 |
| vue-native-websocket (fork) | vue-native-websocket-vue3 | 3.1.8 (vue ^3.0.0) | store.js |
| vue-infinite-loading ^2.4.5 | v3-infinite-loading (1.3.2) or IntersectionObserver 自前 | 本体は Vue2 専用で死蔵 (2020) | CardPagination.vue のみ |
| vue-clipboard2 ^0.3.1 | 廃止 → `navigator.clipboard` 直呼び | 本体 Vue2 専用 | Coordinates.vue のみ |
| vue-match-media ^1.0.3 | 自前 20 行プラグイン or @vueuse/core `useMediaQuery` | 本体 Vue2 専用 (2018) | `$mq` 8 ファイル |
| vue-lazy-youtube-video ^2.3.0 | 自前 iframe 遅延ロード | latest 2.4.0 (vue ^2.6.12) 止まり | SummitVideosGroup.vue のみ |
| vue2-debounce ^1.0.1 | 自前 directive or lodash-es debounce | Vue2 専用 | Activators.vue / SearchField.vue |
| （新規）event-bus.js の `new Vue()` | **mitt** (3.0.1) | Vue3 で `$on/$off` 削除のため必須 | event-bus.js + 6 ファイル |

### 移行不要（Vue 非依存）

axios / moment / proj4 / cheap-ruler / haversine-distance / maidenhead / node-vincenty /
photoswipe 4 / filepond 本体 / frappe-charts (fork) / @mapbox/mapbox-gl-draw (fork) /
@maptiler/sdk / @tmcw/togeojson / @dwayneparton/geojson-to-gpx / flagpack / bulma
（bulma は buefy 3 の要求バージョン整合のみ確認。→未確認事項）

## アプリコードの Vue 2 固有パターン（grep 実測値）

| パターン | 件数 | 対応 |
|---|---|---|
| `mixins:` | 57 | **対応不要**（Vue 3 でも mixins は動作。書き換えない） |
| `$buefy.*` | 31 | Buefy 3 の API 差分確認の上で機械的置換 |
| `slot-scope=` | 17 | `v-slot` 構文へ機械的置換 |
| `.sync=` | 10 | `v-model:prop` へ機械的置換 |
| `Vue.use(` 8 / `Vue.component(` 2 / `Vue.prototype` 2 / `new Vue(` 2 | 14 | main.js の `createApp` 化・event-bus の mitt 化に吸収 |
| `$set(` | 7 | 通常代入へ（Vue 3 は Proxy ベースで不要） |
| `destroyed` 7 / `beforeDestroy` 1 | 8 | `unmounted` / `beforeUnmount` へリネーム |
| `$on(` 6 / `$off(` 6 / `$once(` 1 | 13 | EventBus 由来は mitt へ。個別インスタンス由来が無いか実装時に判別 |
| `$parent` 6 / `$root` 6 | 12 | 動作はするが vue-mapbox 由来なら Phase 3 で消える。個別確認 |
| `filters:` | 3 | methods/computed へ変換（Vue 3 で filters 削除） |
| `functional:` / `$listeners` / `$scopedSlots` / `$children` / render(h) | 0 | 対応不要（未使用を確認済み） |

EventBus 利用ファイル: event-bus.js, store.js, RBNSpots.vue, SotaSpots.vue, Activator.vue, Summit.vue, NavBar.vue

地図系（vue-mapbox の Mgl* 使用）: Map.vue, MiniMap.vue, MapRoute.vue, MapInfoPopup.vue,
MapPhoto.vue, SummitPopup.vue, MapTerminator.vue, MapWebcam.vue（8 ファイル、
Mgl コンポーネント 8 種 23 タグ）

## フェーズ計画（Sonnet 実行前提）

原則: 各 Phase は独立にコミットし、`npm run build` + lint 警告ゼロ + 対象ページの目視確認で締める。
ブランチは `feat/vue3-migration`（master から。upstream へ出す時はローカルパッチ除去 rebase、既存運用どおり）。

- **Phase 0 — 検証基盤**: router.js から全ルートを列挙し、ページ別目視チェックリスト
  （`.claude/research/vue3-verify-checklist.md`）を作成。ホスト側 `npm run dev` で現状の正常動作を先に記録
- **Phase 1 — コア差し替え**: vue 3 / @vitejs/plugin-vue / vue-router 4 / vuex 4 /
  vue-fontawesome 3 / main.js の `createApp` 化 / event-bus.js の mitt 化 / filters・$set・
  ライフサイクル名・slot-scope・.sync の機械的置換。**ゴール: ビルドが通り最低 1 ページ表示**
  （Buefy・地図はこの時点で一時的に壊れていて良い。コミットは分割）
- **Phase 2 — Buefy 0.8 → 3.0**: 公式 changelog/移行ガイドを確認してから着手。
  最重量は b-table(15) + b-table-column(79)。`$buefy` ダイアログ/トースト 31 箇所。
  FontAwesome free フォールバック機構（tools/install-fontawesome-pro.mjs）は npm 層なので原則無影響
- **Phase 3 — 地図**: vue-mapbox fork → vue-maplibre-gl。8 ファイル書き換え。
  着手前に fork (manuelkasper/vue-mapbox#10cb772) のパッチ内容を diff で確認し、同等機能の要否を判定。
  ※コンポーネント API が 1:1 対応でないため、**設計判断が要る場合は上位モデルへ委譲**（実装中委譲 3 条件該当）
- **Phase 4 — 小物ライブラリ**: 棚卸し表の残り（clipboard / match-media / infinite-loading /
  lazy-youtube / debounce / draggable / filepond / turnstile / websocket / keycloak）。
  keycloak と websocket は fork パッチの差分確認が先（→未確認事項）
- **Phase 5 — 総仕上げ**: `$parent`/`$root`/`$on` 残存の解消、eslint (vue3 essential ルール) 警告ゼロ、
  チェックリスト全ページ消化、bulma バージョン整合

## リスクと未確認事項

1. **テスト無し**（最大リスク）: 回帰検知は目視のみ。→ Phase 0 のチェックリストで機械化に近づける。
   SSO(Keycloak) ログイン系はローカル検証が難しい可能性あり。要ホスト側確認
2. **Buefy 0.8 → 3.0 は 2 メジャー跨ぎ**: 0.8→0.9 時点で b-table 等に破壊的変更があった。
   API 差分の総量は実装時に公式ドキュメントで確定させる（本書では未確定）
3. **fork 依存のパッチ内容が未確認**: vue-keycloak-js#sotlas3 / vue-native-websocket / vue-mapbox#10cb772。
   各 Phase 着手前に upstream との diff を取り、パッチが Vue 3 版でも必要か判定する。
   最悪 vue-keycloak-js は fork の Vue 3 版を新たに作る必要が生じうる（メンテナ協力が要る可能性）
4. **bulma 0.7 と buefy 3 の整合**: buefy 3 が要求する bulma バージョン未確認。Phase 2 で確認
5. **upstream との関係**: 巨大 PR は fork(このリポジトリ)で完結できるが、upstream に入れるには
  メンテナとの進め方調整が必要（一括 PR か段階かは先方の意向次第）。着手前判断はユーザー

## 進め方の選択肢（ユーザー判断待ち）

- (a) まず fork で Phase 0-1 だけ PoC → 動く証拠を添えて #44 に「移行を手伝う」と返信
- (b) 先に #44 へ返信して進め方（一括/段階、ブランチ運用）を合意してから着手
- (c) 保留（terminator は fork 運用継続、移行はやらない）

いずれも本書の調査結果は有効。実装は全フェーズ Sonnet 主担当、上位モデル委譲想定箇所は Phase 3 のみ明記。
