# Vue 3 移行 ページ別検証チェックリスト（Phase 0 成果物）

`router.js` の全ルートと、ルート単位では現れないグローバル要素・複合機能を洗い出したもの。
各 Phase 完了時に、対応するページ・機能をホスト側 `npm run dev` で目視確認する台本として使う。

**使い方**: Phase 完了ごとに該当行の「Vue2 現状」欄を空欄のまま or 済マークを付け、
「移行後」欄に確認結果（OK / NG: 内容）を書き足していく形で運用する（このファイル自体を都度更新）。

## グローバル要素（全ページ共通、App.vue / NavBar.vue）

| # | 要素 | 確認内容 | Vue2 現状 |
|---|---|---|---|
| G1 | NavBar ロゴ・リンク | ロゴ表示、モバイル/ワイド切替、各リンクの遷移 | 未確認（Phase 0 時点、既存動作の記録は各 Phase 実施者が行う） |
| G2 | NavBar 時計 | 現在時刻(UTC)表示が1分毎に更新 | 〃 |
| G3 | NavBar 検索欄 | SearchField のフォーカス/候補表示、Enter で SearchAnything へ遷移 | 〃 |
| G4 | NavBar 「More」ドロップダウン | 開閉、各リンク遷移 | 〃 |
| G5 | ログイン(SSO/Keycloak) | LoginButton クリック→ログイン→ログアウト。**sotl.as 本番ドメインでのみ検証可能**（メンテナ提供のサブパス環境を使う） | 〃 |
| G6 | Cloudflare Turnstile | 未ログイン時に表示され verified イベントでトークンがストアに入る | 〃 |
| G7 | ページ遷移時のスクロール位置復元 | 戻る操作でスクロール位置が戻る（Map ページは `delayScroll` 分岐あり） | 〃 |
| G8 | `lastPath` 復元 | `/` アクセス時に前回パスへリダイレクト | 〃 |
| G9 | Footer | 表示・リンク | 〃 |

## ルート別（router.js 準拠）

| # | パス | コンポーネント | 確認内容 | Vue2 現状 |
|---|---|---|---|---|
| R1 | `/about` | About.vue | 静的ページ表示 | 未確認 |
| R2 | `/settings` | Settings.vue | 各設定項目の変更が反映・永続化される | 未確認 |
| R3 | `/map` | Map.vue | 下記「Map ページ詳細」参照 | 未確認 |
| R4 | `/map/summits/:summitCode` | Map.vue | サミットコード指定でポップアップ表示（大文字強制・小文字→大文字リダイレクト） | 未確認 |
| R5 | `/map/coordinates/:coordinates/:zoom` | Map.vue | 座標・ズーム指定で地図移動 | 未確認 |
| R6 | `/map/regions/:region` | Map.vue | リージョン指定表示 | 未確認 |
| R7 | `/summits/` | AssociationList.vue | Association 一覧表示・検索 | 未確認 |
| R8 | `/summits/:associationCode` | Association.vue | Association 詳細（大文字強制・リダイレクト） | 未確認 |
| R9 | `/summits/:regionCode` | Region.vue | Region 詳細（大文字強制・リダイレクト） | 未確認 |
| R10 | `/summits/:summitCode` | Summit.vue | Summit 詳細（下記「Summit ページ詳細」参照） | 未確認 |
| R11 | `/activations/:activationId` | Activation.vue | Activation 詳細（QSOList・チャート） | 未確認 |
| R12 | `/activators/` | Activators.vue | Activator 一覧・検索・フィルタ | 未確認 |
| R13 | `/activators/:callsign` | Activator.vue | Activator 詳細（チャート・履歴） | 未確認 |
| R14 | `/spots` (redirect) | Spots.vue | `/spots/sotawatch` へリダイレクト | 未確認 |
| R15 | `/spots/sotawatch` | SotaSpots.vue | Spot 一覧・自動更新（LiveFeedIndicator） | 未確認 |
| R16 | `/spots/rbn` | RBNSpots.vue | RBN Spot 一覧・自動更新 | 未確認 |
| R17 | `/alerts` | Alerts.vue | Alert 一覧・フィルタ・編集(EditAlert) | 未確認 |
| R18 | `/new_photos` | NewPhotos.vue | 新着写真一覧・PictureSwipe 拡大表示 | 未確認 |
| R19 | `/solar_history` | SolarHistory.vue | 太陽活動履歴チャート | 未確認 |
| R20 | `/search` | SearchAnything.vue | 検索結果一覧・各種リンク遷移 | 未確認 |
| R21 | `*` (404) | NotFound.vue | 存在しないパスで表示 | 未確認 |

## Map ページ詳細（最複雑・vue-mapbox 依存、Phase 3 で最重要）

`src/views/Map.vue` の子要素（`Mgl*` は vue-mapbox 由来、Phase 3 で vue-maplibre-gl に置換）:

| # | 要素 | 確認内容 |
|---|---|---|
| M1 | 地図の基本表示 | ズーム・パン・回転無効化の確認 |
| M2 | MglGeolocateControl | 現在地取得・追従 |
| M3 | MglNavigationControl | ズームボタン |
| M4 | MglScaleControl | スケール表示（km/mi 切替） |
| M5 | MglAttributionControl | 表示・モバイルでコンパクト化 |
| M6 | MapFilterControl | フィルタ開始/終了 |
| M7 | MapOptionsControl | レイヤー切替（**夜間帯/ターミネーターのトグルを含む**、webcams 等） |
| M8 | MapDownloadControl | ダウンロード機能 |
| M9 | SummitPopup | サミットクリックでポップアップ表示、最新スポット・次回アラート表示 |
| M10 | MapRoute | ルート表示（永続ルート） |
| M11 | MapInfoPopup | 情報ポップアップ表示・閉じる |
| M12 | MapDraw | 描画機能 |
| M13 | MapWebcams | ウェブカムレイヤー(オプション有効時) |
| M14 | SwisstopoInfo / BasemapAtInfo | 地図クレジット表示 |
| M15 | MapKeyFailedInfo | MapTiler API キー失敗時の表示 |
| M16 | 夜間帯(ターミネーター)オーバーレイ | MapTerminator.vue、地図タイプ非依存であることを含め表示・info ダイアログ確認（直近実装分） |
| M17 | ローディングポップアップ | サミットクリック直後の LoadingRing 表示 |

## Summit ページ詳細（複合コンポーネントが多い）

| # | 要素 | 確認内容 |
|---|---|---|
| S1 | SummitAttributes | 標高・ポイント等の属性表示 |
| S2 | MiniMap | 小地図表示 |
| S3 | SummitActivations / LoggedActivationsList | アクティベーション履歴一覧 |
| S4 | SummitPhotosGroup / PictureSwipe | 写真表示・拡大 |
| S5 | SummitVideosGroup | 動画埋め込み（vue-lazy-youtube-video 依存、Phase 4） |
| S6 | SummitRoutes | ルート情報表示・ダウンロード |
| S7 | NearbySummitsList | 近隣サミット一覧 |
| S8 | Coordinates | 座標表示・クリップボードコピー（vue-clipboard2 依存、Phase 4）→**Phase 4 完了・OK**: `navigator.clipboard`+execCommandフォールバックへ置換。Playwright MCPでCopyボタンのトースト表示・フォールバック経路とも確認済み |
| S9 | EditSpot / EditAlert (アクセス可能な場合) | スポット/アラート編集フォーム |

## 横断機能（複数ページで共通利用、個別確認が必要）

| # | 機能 | 依存 | 確認内容 |
|---|---|---|---|
| X1 | チャート類（BarChart/LineChart/PieChart/PercentageChart/ActivationCharts） | frappe-charts fork（Vue非依存） | 描画・データ反映 |
| X2 | 写真アップロード（PhotosUploader/EditPhoto） | vue-filepond（Phase 4） | アップロード・プレビュー |
| X3 | ドラッグ&ドロップ（PictureSwipe 内の並べ替え等） | vuedraggable（Phase 4） | 並べ替え動作 |
| X4 | 無限スクロール（CardPagination） | vue-infinite-loading→v3-infinite-loading（**Phase 4 完了・OK**） | 追加読み込みトリガー。Playwright MCPで`/alerts`・`/activators/:callsign`のモバイルビューを最下部までスクロールし追加読み込み・complete後の文言非表示を確認済み |
| X5 | デバウンス入力（Activators.vue / SearchField.vue） | vue2-debounce→in-repo実装（**Phase 4 完了・OK**） | 入力遅延後に検索実行。ネットワークログで500ms/300ms後の単発リクエスト、Enter即時発火、プログラム的入力変更での発火（SearchField）を確認済み |
| X6 | レスポンシブ判定（`$mq`） | vue-match-media（Phase 4） | モバイル/ワイド切替 |
| X7 | WebSocket 経由のライブ更新（Spots系・LiveFeedIndicator） | vue-native-websocket fork→自前実装（**Phase 4 完了・OK**） | 接続・再接続・データ反映。コンテナ内実接続で`state.socket.isConnected=true`・spots 454件受信・RBNページのLIVE表示を確認済み。再接続（切断復帰）はコンテナからは注入困難なためホスト検証項目として残す |
| X8 | EventBus 通知（RBNSpots/SotaSpots/Activator/Summit/NavBar） | event-bus.js → mitt（Phase 1） | 各種イベント連携（トリガースクロール等） |

## Phase 2 固有の確認観点（Buefy 0.8→3.0 + bulma 0.7→1.0 移行）

Phase 2 では実装中の調査で判明した以下の破壊的変更に対応した。通常のルート別確認（上記）に加え、
**修正の効果を狙い撃ちで確認する**観点として使う。

| # | 要素 | 確認内容 | 対応した破壊的変更 |
|---|---|---|---|
| B1 | MapOptionsControl（`/map`）のチェックボックス群 | 各オプション（Regions/Contours/Hillshading/AZ 等）をON/OFF→ページを**リロード**して設定が保持されているか | `b-checkbox`/`b-radio`/`b-input` が `input` イベントを廃止し `update:modelValue` のみemitするようになったため、`@input` で行っていた localStorage 永続化（`setMapOption` mutation）が発火しなくなっていた（`@update:model-value` へ修正済み） |
| B2 | FilterInput 使用箇所（`/activators`、`/alerts`、`/spots/rbn`、`/summits/`、Region/Association 一覧、Activator 詳細のアクティベーション絞り込み等） | 検索欄に文字を入力→リストが即座に絞り込まれるか | `FilterInput.vue`/`FrequencyInput.vue` が独自にVue2方式のv-model契約（`props:{value}`+`$emit('input')`）のままPhase1から取り残されており、Buefy3のb-inputと組み合わせで入力値の伝播が機能しない状態だった（`modelValue`/`update:modelValue` へ修正済み） |
| B3 | EditSpot のFrequencyInput（周波数手入力） | Alert/Spot編集画面で周波数欄に手入力→値が反映されるか | 同上（B2と同じ根本原因） |
| B4 | EditAlert のfreqMode タグ入力 | Alert編集で周波数/モードのタグ追加・カンマ区切り分割が機能するか | b-taginput が `input` イベントを廃止（`@update:model-value` へ修正済み） |
| B5 | 全 b-table ページ（R7,R12,R15〜R17,R20 等）のソート・ページネーション | ヘッダクリックでソート、ページ送りが機能するか | コード変更なし（既にv-slot構文でAPI互換）だが実機での回帰確認は未実施 |
| B6 | `$buefy` 経由のダイアログ/トースト/スナックバー/ローディング（Alert削除確認、写真アップロードエラー、ネットワークエラー通知、各ページのローディング表示等） | 表示・ボタン動作・自動消去のタイミング | コード変更なし（オプションキー互換確認済み）だが実機での回帰確認は未実施 |
| B7 | navbar・モーダル・ドロップダウン・フォーム部品全般の見た目 | 色・枠線・背景等がbulma 0.7時代と大きく破綻していないか | bulma 0.7.5→1.0.4へ更新（CSS変数ベースのテーマ機構への移行に伴う） |
| B8 | OSのダーク/ライト設定を切り替えても表示が変わらないこと | OS側でダークモードに切り替えて再読み込み→配色が変化しないか | bulma 1.0はデフォルトで`prefers-color-scheme: dark`の自動ダークテーマを含むため、`bulma-no-dark-mode`版を採用して回避済み。これが効いているかの確認 |

## 運用メモ

- Phase 0 時点では「Vue2 現状」を記録する運用に空欄で用意した。Phase 1 着手前にホスト側で
  一通り触って現状の正常動作をスクリーンショット等（`.claude/research/` 配下）で残すと、
  以降の Phase での比較が容易になる（本チェックリスト自体の更新は各 Phase 実施者が行う）
- G5（SSO ログイン）は sotl.as 本番ドメインでしかテストできないため、メンテナが用意する
  サブパス自動デプロイ環境が必要（issue #44 で合意済み）。ローカル/PR プレビューでは
  「ログインボタンが表示され、クリックでリダイレクトが発生する」程度までの確認に留める

## Phase 0 baseline 確認結果（2026-07-08、ホスト側 `npm run dev`、`feat/vue3-migration` ブランチ）

- 上記チェックリストを一通り目視確認。**terminator（夜間帯オーバーレイ）以外は問題なし**
- **terminator トグルが表示されない**: 原因は不具合ではなく、terminator 機能（issue #3）が
  別ブランチ `feat/night-terminator` にのみ存在し、`master`（および本移行ブランチの起点）に
  未マージのため。分岐点は `1e9c22f`。**ユーザー判断: terminator は移行後に対応する**
  （upstream #44 でも同様に表明済み）。本チェックリストの M16 は本移行では対象外とし、
  移行完了後に `feat/night-terminator` の内容を Vue 3 版として作り直す
- solar_history のサマリ表示リンクについて「久々に出てきた」というコメントあり
  （データ条件依存の表示と推測されるが未確認・バグではない旨の指摘なし。特記事項として記録のみ）

## Phase 1 完了確認（2026-07-08、ホスト側 `npm run dev`、実ブラウザで検証）

Phase 1（コア差し替え）完了時点での実ブラウザ確認結果。当初計画の「ビルドが通り
最低1ページ表示」というゴールは、実装中に以下2件の**起動時ハードクラッシュ**が
判明したため、それらの解消をもって達成した:

1. **Buefy 0.8 の `app.use(Buefy, ...)` が即座に例外を投げる**: `registerComponentProgrammatic`
   が `Vue.prototype.$buefy` に書き込む Vue2専用実装のため、`app.prototype` が存在しない
   Vue3では `install()` の最初の呼び出しで必ずクラッシュしていた（Buefyの一部でなく全体が
   起動不能）。Node上の事前検証（`app.use(Buefy,...)` は警告のみでthrowしない）は
   Node/Viteの解決経路の違いによる偽陰性で、実ブラウザで確認するまで検知できなかった
   （lessons.md に記録済み）。`app.use(Buefy, ...)` を一時無効化して解消（Phase 2 で本対応）
2. **`@gaviti/vue-turnstile` 0.6.5 が render 関数実行時にクラッシュ**: 内部にVue2.7.16を
   直接依存として同梱しており、`this._c`（Vue2専用の内部API）にアクセスして例外。
   App.vue で `v-if="!authenticated"` により未ログイン時は常時描画されるため、
   ほぼ全ユーザーで再現する。Phase 4 予定だったバージョンアップ（1.1.4、Vue3対応確認済み、
   API完全互換）を前倒しして解消

上記2件を解消後、白画面から「崩れているが表示される」状態に到達し、ブラウザ
コンソールにアプリ由来の `Uncaught` エラーが無いことを確認。残る警告は全て
既知・想定内:
- `Failed to resolve component: b-*` 多数: Buefy 未対応のため想定どおり
  （Phase 2 で解消）
- `Property "$keycloak" was accessed during render but is not defined on instance`:
  SSO 未使用時（`wantSso` 未設定）は `$keycloak` が未インストールなため。既存コードの
  一部がオプショナルチェイン無しで参照しているのが原因だが、クラッシュはしないため
  Phase 1 では未対応（必要なら別途対応）
- `content.js` の `Uncaught (in promise) The message port closed...`: ブラウザ拡張機能由来の
  ノイズで本アプリとは無関係

**Phase 1 の教訓**: 計画時点の想定（「Buefy・地図は壊れていて良い」）は、実際には
NavBar 等が全ページで Buefy に依存しているため成立せず、「ビルドが通る」だけでなく
「起動時にクラッシュしない」までを Phase 1 の実質ゴールとして扱う必要があった。
$mq（vue-match-media）・vue-filepond・vue-lazy-youtube-video・vue-turnstile は
いずれも当初 Phase 2〜4 予定だったが、起動時クラッシュの原因だったため Phase 1 中に
前倒しで対応した。
