# Phase 4: 小物ライブラリ4件の Vue 3 対応（vue-clipboard2 / vue2-debounce / vue-infinite-loading / vue-native-websocket）

## Context

Vue 3 移行（issue #7）の Phase 4。Phase 0〜3 は完了・upstream マージ済み（PR #45/#46）、vuedraggable（issue #17）も完了済み。`package.json` 実物の洗い出しで残った Vue 2 専用依存は5件だが、**`@dsb-norge/vue-keycloak-js#sotlas3` は node_modules 実物で Vue 2/3 両対応済み（v2.4.0、install 内で分岐、README に Vue 3 節）と確認済みのためコード変更不要（検証のみ）**。実対応は4件。

現状の実害（いずれも Vue 2 専用 API が原因）:

- 座標コピーボタンが no-op（vue-clipboard2 無効化中、`Coordinates.vue`）
- 検索フィールド・アクティベータ絞り込みの debounce ディレクティブが no-op（vue2-debounce 無効化中、`SearchField.vue` / `Activators.vue`）
- モバイルのカード無限スクロールが実行時破綻（vue-infinite-loading は `this.$on` 等 Vue 2 専用 API 使用、overrides で vue だけ差し替えても内部が動かない）
- SOTA/RBN スポットのライブ更新が停止（vue-native-websocket install 未呼出、`store.js`）

## 方針（4件の設計判断、根拠は実物照合済み）

| ライブラリ | 方針 | 根拠 |
|---|---|---|
| vue-clipboard2 | **依存削除**。`navigator.clipboard` + execCommand フォールバックを Coordinates.vue のメソッドに内製 | 使用は1ボタンのみ・`$copyText` 使用0件。ライブラリは2020年から更新停止。1箇所のために新規依存を足さない（Phase 3 の依存削減路線） |
| vue2-debounce | **依存削除**。in-repo `src/debounce.js`（純関数、~25行）+ イベント/watch ベースに書き換え | 後継 `vue-debounce` v5 は不採用: Buefy 3 の `b-autocomplete`/`b-input` は `inheritAttrs: false`（`node_modules/buefy/src/utils/CompatFallthroughMixin.ts` で確認）のため、SearchField の `:debounce-events="'input'"` がディレクティブに届かず無言で keyup フォールバックし、ペースト/IME 入力で検索が発火しない隠れ回帰になる。回避には結局書き換えが要り、差し替えの利点が消える。**この不採用理由は upstream PR 説明に必ず書く** |
| vue-infinite-loading | **`v3-infinite-loading@^1.3.2` へ差し替え**（新規依存1件） | ES ビルド実物を registry tarball で全読し、CardPagination の契約を全て充足と確認: `identifier` watch で observer 再生成（リセット）、`$state.loaded()` 後にセンチネル可視なら自動再発火（1バッチで画面が埋まらないケース）、`complete()` で observer 切断。自前実装だと同じエッジ処理で60行超になる。vuedraggable v4 と同型の「品質の高い既製品優先」判断 |
| vue-native-websocket | **依存削除**。自前モジュール `src/websocket.js`（~50行） | アプリは `$socket`/`$connect`/`sockets` オプションを一切使わず、必要なのは「接続 + sendObj + 自動再接続 + `SOCKET_*` commit」のみ（元ライブラリ236行の一部）。GitHub コミット固定依存の解消にもなる。Phase 3 の `src/mapgl/` 自前統合層の前例に沿う |

## 実装（コミット4分割、各コミットでビルド可能を維持・lockfile 同梱）

### C1: vue-clipboard2 → navigator.clipboard（座標コピー復旧）

- `src/components/Coordinates.vue`: L18 の `v-clipboard:copy/:success/:error` 3連を `@click="copyCoordinates"` に置換。methods に追加:
  - `navigator.clipboard` があれば `writeText(lat + ',' + lon).then(this.onCopySuccess, this.onCopyError)`
  - 無ければ（non-secure context: LAN IP 経由 dev 等）textarea + `document.execCommand('copy')` フォールバック（vue-clipboard2 自身の手法）
  - 既存 `onCopySuccess`/`onCopyError`（Buefy toast）は無修正で接続
- `src/main.js`: コメントアウト済み import（L6）と説明コメントの clipboard 分を削除
- `package.json`: `vue-clipboard2` 削除

### C2: vue2-debounce → in-repo debounce（検索・フィルタ復旧）

- **新規 `src/debounce.js`**（英語コメント）: `export function debounce (fn, wait)` — setTimeout/clearTimeout、`.cancel()` 付き最小実装（ms 数値のみ。既存使用は全て数値なので `'300ms'` 文字列パース不要）
- `src/components/MapWebcams.vue`: L10 の import 元を `'../debounce'` へ、L64 コメントから "using vue2-debounce" を削除（`debounce(fn, 300)` の呼び出しは無修正）
- `src/components/SearchField.vue`: テンプレートの `v-debounce:300ms="onInput"` と `:debounce-events="'input'"` を削除。`created()` で `this.debouncedOnInput = debounce(this.onInput, 300)`、`watch: { myQuery (value) { this.debouncedOnInput(value) } }` を追加（`myQuery` は v-model で全入力経路 — タイプ・ペースト・IME — から更新される）
- `src/views/Activators.vue`: `v-debounce:500ms="onFilterChanged"` を削除し、**watch ではなく** `@update:model-value="onFilterInput"` + `@keyup.enter="onFilterEnter"` を FilterInput に追加:
  - `onFilterInput () { this.debouncedFilterChanged() }`（`created()` で `debounce(this.onFilterChanged, 500)` を生成）
  - `onFilterEnter () { this.debouncedFilterChanged.cancel(); this.onFilterChanged() }`（vue2-debounce の Enter 即時発火挙動の再現。リスナーは FilterInput → b-input → ネイティブ input へフォールスルーで届く）
  - **watch を使わない理由**: prefs mixin（`src/mixins/prefs.js`）が mounted で `this.filter` を localStorage から復元するため、watch 方式だと復元でも発火し `mounted()` の `loadData()` と二重リクエストになる（watcher の flush タイミング上、mounted 末尾の `cancel()` では抑止不能）。イベント基点なら Vue 2 時代の keyup リスナーと同じ「ユーザー入力のみ発火」の契約が保存される
  - 注: SearchField は watch 方式でよい（prefs 復元なし。`doSearch`/`clear-on-select` による `myQuery=''` で `onInput('')` が走るが `MIN_QUERY_LENGTH` 分岐で候補クリアされるだけで無害）
- `src/main.js`: 残りのコメントアウト import・説明コメント削除
- `package.json`: `vue2-debounce` と overrides エントリ削除

### C3: vue-infinite-loading → v3-infinite-loading（モバイル無限スクロール復旧）

- `src/components/CardPagination.vue` のみ:
  - `import InfiniteLoading from 'v3-infinite-loading'` + `import 'v3-infinite-loading/lib/style.css'`（スピナー表示に必須）
  - テンプレート: `no-more`/`no-results` の空スロット2つ → 空 `complete` スロット1つに（新ライブラリの既定文言 "No more results!" の抑止）。`:distance="100"` を明示（新ライブラリ既定は 0、旧ライブラリの 100px 先読みとの挙動一致）
  - `infiniteHandler($state)` は無修正（`loaded()`/`complete()` の名前・意味が一致）
- `package.json`: `vue-infinite-loading` 削除・`v3-infinite-loading@^1.3.2` 追加。**この時点で overrides ブロックが空になるのでブロックごと削除**

### C4: vue-native-websocket → 自前 `src/websocket.js`（ライブスポット復旧）

- **新規 `src/websocket.js`**（英語コメントで設計意図・元ライブラリとの対応を記す）: `connectWebSocket(url, store, { reconnectionDelay = 1000 })` —
  - `ws.sendObj = obj => ws.send(JSON.stringify(obj))` を **WebSocket インスタンス自体に生やす**（`SOCKET_ONOPEN` mutation が `event.currentTarget.sendObj` を呼ぶ契約。忘れると接続直後の rbnFilter 送信で TypeError）
  - onopen/onerror/onmessage/onclose → `SOCKET_ONOPEN`/`SOCKET_ONERROR`/`SOCKET_ONMESSAGE`(JSON parse 済み)/`SOCKET_ONCLOSE` commit
  - 再接続は **onclose のみ**でスケジュール（onerror と両方来る接続失敗時の二重接続防止）、固定 1000ms・無限回・タイマー発火時に `SOCKET_RECONNECT` commit、onopen でカウンタリセット — master の元実装 `Vue.use(VueNativeSock, VITE_WSS_URL + '/ws', { format: 'json', store, reconnection: true, reconnectionDelay: 1000 })` の意味論と同一（`reconnectionAttempts` 未指定 = Infinity、`SOCKET_RECONNECT_ERROR` は元々到達不能）。バックオフ等の「改善」はしない（diff を移行に限定）
- `src/store.js`: 無効化コメント2箇所（L6-9, L230-231）を削除し、末尾（元の `Vue.use` の位置）に `connectWebSocket(import.meta.env.VITE_WSS_URL + '/ws', store, { reconnectionDelay: 1000 })`。**mutations・`let socket = null` は無修正**（`SOCKET_RECONNECT_ERROR` も state 形状維持のため残す）
- `package.json`: `vue-native-websocket`（GitHub 依存）削除

### C5（ローカル運用のみ・upstream cherry-pick 対象外）

- `.claude/research/vue3-verify-checklist.md` へ検証結果記入

各コミットで `npm install`（lockfile 更新）→ `npm run lint`（警告ゼロ）→ `npm run build` を通す。コミットメッセージは本ブランチでは日本語（既存運用継続）、upstream PR 時に英語化して cherry-pick。

## 検証

### コンテナ内（Playwright MCP、各コミット直後）

- **C1**: Summit ページで Copy クリック → 「Coordinates copied to clipboard」トースト・コンソールエラーなし。localhost は secure context なので writeText 経路が通る。フォールバック経路は `browser_evaluate` で `navigator.clipboard` を潰して Copy → トースト確認。headless の clipboard-read 権限で readText 検証が失敗しても**機能自体の失敗と混同しない**（実クリップボード内容はホストへ委譲）
- **C2**: `/activators` で連続タイプ → `browser_network_requests` で `/activators/search` が入力停止後 500ms に**1回だけ**発行・絞り込み反映・Enter 即時発火・**ページロード時（prefs 復元）にリクエストが1回だけ**であること。NavBar 検索欄に4文字以上 → 300ms 後に候補表示。ペースト経路は `browser_evaluate` の programmatic 入力で確認
- **C3**: `browser_resize` 375×667（`!$mq.desktop`）で `/alerts` を最下部までスクロール → 50件超で追加読み込み・出し切り後に "No more results!" が**出ない**こと・スピナー表示。`/activators/<callsign>` の ActivationsList でも確認。**この時点で spots 系はデータ空のため対象外**（C4 後に再検証）
- **C4**: `wss://sotl.as/api/ws` への outbound 可否にまず依存。通れば `/spots/sotawatch` でスポット一覧表示（`message.spots` 初期受信）・`/spots/rbn` で履歴到着（`rbnFilter` sendObj 往復）・console に再接続ループの兆候なし。**C4 後に C3 の確認を spots 系モバイル無限スクロールで再実施**。egress 不通なら「接続試行でクラッシュしない・再接続が暴走しない」までに縮退しホストへ委譲

### ホスト実ブラウザ（ユーザー実施）

- Copy 後に OS エディタへペーストして `lat,lon` を確認
- ライブスポット到着（`message.spot` 差分更新、production sotl.as と並べて目視）・**再接続**（DevTools Network→Offline トグル → 復帰後 1〜2 秒で再接続・spots 更新再開）
- 日本語 IME 入力で SearchField の検索発火（watch ベース化の効果確認）
- SSO: ログインボタン → リダイレクト発生まで（keycloak は検証のみの確認項目）

## リスクと落とし穴

1. **navigator.clipboard は secure context 限定** → execCommand フォールバックで吸収。失敗時は既存エラートーストに落ち UX 破綻なし
2. **debounce の契約差異（良性と判断済み）**: SearchField の programmatic クリアで `onInput('')` が走る（無害）。矢印キー等「値が変わらない keyup でも発火」の旧挙動は消える（改善方向）
3. **v3-infinite-loading**: style.css import 忘れ→スピナー不可視 / 空 complete スロット忘れ→既定文言表示 / `:distance="100"` 忘れ→先読み消失。メンテ停滞（2024-08〜）は契約が CardPagination 1ファイルに閉じるため、破綻時の自前退避コスト小で許容
4. **WebSocket 再現漏れ**: sendObj のインスタンス生やし忘れ / onclose 以外での再接続スケジュール（二重接続）/ サーバー長期ダウン時の1秒間隔リトライは**元実装と同一挙動**なので改変しない

## スコープ外

- Phase 5（総仕上げ: `$parent`/`$root`/`$on` 残存解消・eslint vue3 ルール・チェックリスト全消化）
- Phase 3 で報告済みの未調査不具合（地図種類アイコン位置ずれ・SFI リンク表示・svgicon 警告）— Phase 5 で扱う
- upstream への PR 提出作業自体（Phase 4 完了後、vue3 ブランチ向け英語コミット化は別途）
- 完了済み Phase 3 計画ファイル `floofy-wiggling-snowflake.md` の削除は本計画のコミット時に同時に実施（運用ルール上の削除漏れの解消）

## 実装体制

全タスク Sonnet 実装想定（設計判断は本計画で解消済み）。上位モデル委譲の想定箇所なし（万一 v3-infinite-loading が実機で契約どおり動かない場合の自前実装切替判断のみ、その時点で再検討）。
