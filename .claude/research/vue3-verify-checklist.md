# Vue 3 移行 ページ別検証チェックリスト（Phase 0 成果物）

`router.js` の全ルートと、ルート単位では現れないグローバル要素・複合機能を洗い出したもの。
各 Phase 完了時に、対応するページ・機能をホスト側 `npm run dev` で目視確認する台本として使う。

**使い方**: Phase 完了ごとに該当行の「Vue2 現状」欄を空欄のまま or 済マークを付け、
「移行後」欄に確認結果（OK / NG: 内容）を書き足していく形で運用する（このファイル自体を都度更新）。

## グローバル要素（全ページ共通、App.vue / NavBar.vue）

| # | 要素 | 確認内容 | Vue2 現状 |
|---|---|---|---|
| G1 | NavBar ロゴ・リンク | ロゴ表示、モバイル/ワイド切替、各リンクの遷移 | **Phase 5・OK**: ロゴ・時計・Map/Summits/Spots/Alerts各リンク表示。Playwright MCPで確認済み |
| G2 | NavBar 時計 | 現在時刻(UTC)表示が1分毎に更新 | **Phase 5・表示のみ確認**: UTC時刻表示自体はOK。1分毎更新は低視認性のため目視確認は省略（best_practices原則9） |
| G3 | NavBar 検索欄 | SearchField のフォーカス/候補表示、Enter で SearchAnything へ遷移 | **Phase 5・OK**: フォーカス→"Searching..."表示、Enterで`/search?q=...`へ遷移確認済み |
| G4 | NavBar 「More」ドロップダウン | 開閉、各リンク遷移 | **Phase 5・OK**: クリックでNew Photos/Activators/Settingsが展開表示（スクリーンショット確認済み） |
| G5 | ログイン(SSO/Keycloak) | LoginButton クリック→ログイン→ログアウト。**sotl.as 本番ドメインでのみ検証可能**（メンテナ提供のサブパス環境を使う） | 未確認・**ホスト側依頼**（コンテナ内では本番ドメイン制約により検証不能） |
| G6 | Cloudflare Turnstile | 未ログイン時に表示され verified イベントでトークンがストアに入る | **本物のTurnstileフローは未確認・ホスト側依頼**（R3の通りdevバイパスで地図検証自体は完結できたが、`verified`イベント発火・トークン取得という本来の仕組みはバイパスで迂回しているため未検証） |
| G7 | ページ遷移時のスクロール位置復元 | 戻る操作でスクロール位置が戻る（Map ページは `delayScroll` 分岐あり） | **訂正・Phase 5・OK**: `/summits/`で800pxスクロール→別ページへ遷移→ブラウザバックでスクロール位置(800px)が復元されることを`window.scrollY`で確認済み |
| G8 | `lastPath` 復元 | `/` アクセス時に前回パスへリダイレクト | **訂正・Phase 5・OK**: `/about`訪問後に`localStorage.getItem('lastPath')`が`/about`であることを確認、`/`アクセスで`/about`へリダイレクトされることを確認済み |
| G9 | Footer | 表示・リンク | **Phase 5・OK**: "SOTA Atlas by Manuel HB9DQM. About"・バージョン表示（コミットハッシュ）確認済み |

## ルート別（router.js 準拠）

| # | パス | コンポーネント | 確認内容 | Vue2 現状 |
|---|---|---|---|---|
| R1 | `/about` | About.vue | 静的ページ表示 | **Phase 5・OK**: 全文表示、リンク（GitHub・データソース等）確認済み |
| R2 | `/settings` | Settings.vue | 各設定項目の変更が反映・永続化される | **Phase 5・OK**: Units（b-radio）切替→リロード後も選択状態が保持されることをスクリーンショットで確認済み（B1と同型のBuefy3永続化パターン） |
| R3 | `/map` | Map.vue | 下記「Map ページ詳細」参照 | **訂正・Phase 5・OK**: master由来のTurnstile devバイパス（`devMapKeyPreseeded`、issue #18）が`feat/vue3-migration`に未移植だったと判明・移植（`src/store.js`/`src/App.vue`、ローカルパッチ扱い・upstream PRには含めない）。移植後、地図タイル（関東地方）が正常描画、Turnstile 600010エラーなしを確認 |
| R4 | `/map/summits/:summitCode` | Map.vue | サミットコード指定でポップアップ表示（大文字強制・小文字→大文字リダイレクト） | **Phase 5・OK**: `/map/summits/JA/NN-001`でSummitPopup（M9）表示を確認 |
| R5 | `/map/coordinates/:coordinates/:zoom` | Map.vue | 座標・ズーム指定で地図移動 | **Phase 5・OK**: `/map/coordinates/35.689300,139.689900/8.0`で地図移動・表示を確認 |
| R6 | `/map/regions/:region` | Map.vue | リージョン指定表示 | 未確認（優先度低、時間の関係でスコープ外。R3-R5でTurnstileバイパス自体は実証済み） |
| R7 | `/summits/` | AssociationList.vue | Association 一覧表示・検索 | **Phase 5・OK**: 大量データ表示、Filter絞り込み（B2）・列ソート（B5）とも確認済み |
| R8 | `/summits/:associationCode` | Association.vue | Association 詳細（大文字強制・リダイレクト） | **Phase 5・OK**: `/summits/JA`（Region一覧）表示・breadcrumbs確認済み |
| R9 | `/summits/:regionCode` | Region.vue | Region 詳細（大文字強制・リダイレクト） | **Phase 5・OK**: `/summits/JA/NN`（Summit一覧）表示、見た目破綻なし（B7）確認済み |
| R10 | `/summits/:summitCode` | Summit.vue | Summit 詳細（下記「Summit ページ詳細」参照） | **Phase 5・OK**: `/summits/JA/NN-001`でS1/S3/S4/S6/X1確認済み（詳細は下記） |
| R11 | `/activations/:activationId` | Activation.vue | Activation 詳細（QSOList・チャート） | 未確認・**ホスト側依頼**（QSOs一覧クリックはSSOログイン必須、未ログイン時は`$buefy.dialog.alert`のログイン促しダイアログが正しく表示されることのみ確認済み） |
| R12 | `/activators/` | Activators.vue | Activator 一覧・検索・フィルタ | **Phase 5・OK**: 国旗アイコン・スコアソート済みテーブル表示確認済み |
| R13 | `/activators/:callsign` | Activator.vue | Activator 詳細（チャート・履歴） | **Phase 5・OK**: 統計・BarChart/PieChart（X1）・Logged activationsテーブル・ページネーション確認済み |
| R14 | `/spots` (redirect) | Spots.vue | `/spots/sotawatch` へリダイレクト | **Phase 5・OK**: `/spots`→`/spots/sotawatch`のリダイレクト確認済み |
| R15 | `/spots/sotawatch` | SotaSpots.vue | Spot 一覧・自動更新（LiveFeedIndicator） | **Phase 5・OK**: "Live Feed CONNECTED"表示・タブUI確認済み（X7は既にPhase4完了確認済み） |
| R16 | `/spots/rbn` | RBNSpots.vue | RBN Spot 一覧・自動更新 | **Phase 5・OK**: タブ切替・フィルタUI・LiveFeed表示確認済み（直近1時間データなしは正常） |
| R17 | `/alerts` | Alerts.vue | Alert 一覧・フィルタ・編集(EditAlert) | **Phase 5・OK**: 一覧表示、AddボタンでEditAlertモーダルが開き（T1/T1b修正が実機で機能）、Cancelで閉じることを確認済み |
| R18 | `/new_photos` | NewPhotos.vue | 新着写真一覧・PictureSwipe 拡大表示 | **Phase 5・OK**: 写真ギャラリー・コメントアイコン表示確認済み |
| R19 | `/solar_history` | SolarHistory.vue | 太陽活動履歴チャート | **Phase 5・OK**: LineChart（SFI/SN）・PercentageChart描画確認済み |
| R20 | `/search` | SearchAnything.vue | 検索結果一覧・各種リンク遷移 | **Phase 5・OK**: G3のEnter検索から`/search?q=Everest`への遷移で確認済み |
| R21 | `*` (404) | NotFound.vue | 存在しないパスで表示 | **Phase 5・OK**: 存在しないパスで"Not Found"ページ表示確認済み |

## Map ページ詳細（最複雑・vue-mapbox 依存、Phase 3 で最重要）

`src/views/Map.vue` の子要素（`Mgl*` は vue-mapbox 由来、Phase 3 で vue-maplibre-gl に置換）:

| # | 要素 | 確認内容 |
|---|---|---|
| M1 | 地図の基本表示 | ズーム・パン・回転無効化の確認 →**Phase 5・OK**: 関東地方の地図タイル正常描画確認済み |
| M2 | MglGeolocateControl | 現在地取得・追従 →未確認（ヘッドレス環境で位置情報APIの扱いが不安定なため優先度低） |
| M3 | MglNavigationControl | ズームボタン →**Phase 5・OK**: 右上のズームボタン表示確認済み |
| M4 | MglScaleControl | スケール表示（km/mi 切替） →**Phase 5・OK**: 左下のスケールバー（"20 km"等）表示確認済み |
| M5 | MglAttributionControl | 表示・モバイルでコンパクト化 →**Phase 5・部分OK**: 右下の帰属表示（© MapTiler © OpenStreetMap）確認済み。モバイルコンパクト化は未確認 |
| M6 | MapFilterControl | フィルタ開始/終了 →**Phase 5・アイコン表示のみ確認**: 左上のフィルタアイコン表示を確認、開閉動作は未実施 |
| M7 | MapOptionsControl | レイヤー切替（**夜間帯/ターミネーターのトグルを含む**、webcams 等） →**Phase 5・OK**: スタイル選択・Regions/Contour lines/Hillshading/Activation zones/Hiking difficulty/Recent spots/Alerts for next/Inactive summits/Webcamsのチェックボックス群を開閉・確認。terminatorは本移行ではM16の通り対象外 |
| M8 | MapDownloadControl | ダウンロード機能 →**Phase 5・アイコン表示のみ確認**: 左上のダウンロードアイコン表示を確認、クリック動作は未実施 |
| M9 | SummitPopup | サミットクリックでポップアップ表示、最新スポット・次回アラート表示 →**Phase 5・OK**: `/map/summits/JA/NN-001`で写真・名前・altitude/points/activations/last activation・Close/Minimize/Moreボタン表示を確認 |
| M10 | MapRoute | ルート表示（永続ルート） →未確認（優先度低、時間の関係でスコープ外） |
| M11 | MapInfoPopup | 情報ポップアップ表示・閉じる →未確認（優先度低、時間の関係でスコープ外） |
| M12 | MapDraw | 描画機能 →**Phase 5・アイコン表示のみ確認**: 右側のツールバー（線・点・削除・フォルダ・保存アイコン）表示を確認、描画動作は未実施 |
| M13 | MapWebcams | ウェブカムレイヤー(オプション有効時) →未確認（優先度低、時間の関係でスコープ外） |
| M14 | SwisstopoInfo / BasemapAtInfo | 地図クレジット表示 →**Phase 5・OK**: 帰属表示確認済み（M5と同一箇所） |
| M15 | MapKeyFailedInfo | MapTiler API キー失敗時の表示 →未確認（今回はキー取得自体が成功しているため対象外） |
| M16 | 夜間帯(ターミネーター)オーバーレイ | MapTerminator.vue、地図タイプ非依存であることを含め表示・info ダイアログ確認（直近実装分） →**対象外**（Phase 0確認済みの通り、terminator機能は本移行のベースブランチに未マージのため） |
| M17 | ローディングポップアップ | サミットクリック直後の LoadingRing 表示 →未確認（優先度低、時間の関係でスコープ外） |

**M系検証の前提（重要）**: 上記はTurnstile devバイパス（`devMapKeyPreseeded`、R3参照）をコンテナ内で有効化した状態での確認。この仕組みは`feat/vue3-migration`のローカルパッチであり、upstream PRには含めない。ホスト側（本物のTurnstileフロー）での再確認は依然有効（G5・G6と合わせて）。

## Summit ページ詳細（複合コンポーネントが多い）

| # | 要素 | 確認内容 |
|---|---|---|
| S1 | SummitAttributes | 標高・ポイント等の属性表示 →**Phase 5・OK**: 座標・Locator・First activation・points・activations表示確認済み（`/summits/JA/NN-001`） |
| S2 | MiniMap | 小地図表示 →**訂正・Phase 5・OK**: Turnstile devバイパス移植後、`/summits/JA/NN-001`で山頂マーカー・ズーム/位置取得/拡大ボタン・帰属表示とも正常描画を確認 |
| S3 | SummitActivations / LoggedActivationsList | アクティベーション履歴一覧 →**Phase 5・OK**: テーブル・ページネーション表示確認済み |
| S4 | SummitPhotosGroup / PictureSwipe | 写真表示・拡大 →**Phase 5・OK**: 写真ギャラリー表示確認済み、TypeErrorなし（X3参照、vuedraggable既にv4で解消済みと判明） |
| S5 | SummitVideosGroup | 動画埋め込み（vue-lazy-youtube-video 依存 →**Phase 1 前倒し完了・OK**: 自前実装 `src/components/LazyYoutubeVideo.vue` へ置換済み。package.jsonに旧依存の記載なし、コード実物で確認済み） |
| S6 | SummitRoutes | ルート情報表示・ダウンロード →**Phase 5・OK**: GPXダウンロードリンク表示確認済み（403エラーは既知ベースライン、lesson53） |
| S7 | NearbySummitsList | 近隣サミット一覧 →**訂正・分類誤り**: Summit詳細ページではなくEditAlert/EditSpotフォーム内の「Summit reference」欄に付随する"Nearby"ドロップダウンとして存在（`grep`で使用箇所2件、いずれもフォームコンポーネント）。**Phase 5・部分OK**: `/alerts`のAddボタンからNearbyクリックまで動作確認。Geolocation APIを呼び出す設計のため、ヘッドレス環境では"User denied Geolocation"のネイティブダイアログとなり実際のリスト表示までは未確認（lesson33のOSネイティブダイアログ制約、コード側の異常兆候なし） |
| S8 | Coordinates | 座標表示・クリップボードコピー（vue-clipboard2 依存、Phase 4）→**Phase 4 完了・OK**: `navigator.clipboard`+execCommandフォールバックへ置換。Playwright MCPでCopyボタンのトースト表示・フォールバック経路とも確認済み |
| S9 | EditSpot / EditAlert (アクセス可能な場合) | スポット/アラート編集フォーム →**Phase 5・部分OK**: EditAlertはT1/T1b修正のモーダル開閉を確認済み（`/alerts`のAddボタン）。EditSpotは`:disabled="!authenticated"`により未ログイン時Addボタンが非活性（想定通りの仕様、Alertsとの非対称性はVue2由来と推測）で実物未確認・**ホスト側依頼** |

## 横断機能（複数ページで共通利用、個別確認が必要）

| # | 機能 | 依存 | 確認内容 |
|---|---|---|---|
| X1 | チャート類（BarChart/LineChart/PieChart/PercentageChart/ActivationCharts） | frappe-charts fork（Vue非依存） | 描画・データ反映 →**Phase 5・OK**: Activator詳細のBarChart/PieChart、SolarHistoryのLineChart/PercentageChartで描画確認済み |
| X2 | 写真アップロード（PhotosUploader/EditPhoto） | vue-filepond（Phase 4） | アップロード・プレビュー →未確認・**ホスト側依頼**（SSOログイン必須） |
| X3 | ドラッグ&ドロップ（PictureSwipe 内の並べ替え等） | vuedraggable（Phase 4） | 並べ替え動作 →**訂正・Phase 4で解消済み**: lesson43/52記載の「vuedraggable v2.24.3起因のTypeError」は古い情報。実データ確認の結果、`package.json`は既に`vuedraggable: ^4.1.0`（node_modules実物でも4.1.0を確認）で、upstream/vue3側も`3c47022`で同じv4更新を実施済み。今回のSummit詳細ページ表示（S4）でTypeErrorは再現せず、コンソールエラーなしを確認済み。並べ替え操作自体（ドラッグ）はPlaywright合成イベントの限界（lesson35と同型のリスク）を踏まえ未実施・優先度低 |
| X4 | 無限スクロール（CardPagination） | vue-infinite-loading→v3-infinite-loading（**Phase 4 完了・OK**） | 追加読み込みトリガー。Playwright MCPで`/alerts`・`/activators/:callsign`のモバイルビューを最下部までスクロールし追加読み込み・complete後の文言非表示を確認済み |
| X5 | デバウンス入力（Activators.vue / SearchField.vue） | vue2-debounce→in-repo実装（**Phase 4 完了・OK**） | 入力遅延後に検索実行。ネットワークログで500ms/300ms後の単発リクエスト、Enter即時発火、プログラム的入力変更での発火（SearchField）を確認済み |
| X6 | レスポンシブ判定（`$mq`） | vue-match-media →**Phase 1 前倒し完了・OK**: 自前実装 `src/matchmedia.js` へ置換済み。package.jsonに旧依存の記載なし、コード実物で確認済み | モバイル/ワイド切替 |
| X7 | WebSocket 経由のライブ更新（Spots系・LiveFeedIndicator） | vue-native-websocket fork→自前実装（**Phase 4 完了・OK**） | 接続・再接続・データ反映。コンテナ内実接続で`state.socket.isConnected=true`・spots 454件受信・RBNページのLIVE表示を確認済み。再接続（切断復帰）はコンテナからは注入困難なためホスト検証項目として残す |
| X8 | EventBus 通知（RBNSpots/SotaSpots/Activator/Summit/NavBar） | event-bus.js → mitt（Phase 1） | 各種イベント連携（トリガースクロール等） |

## Phase 2 固有の確認観点（Buefy 0.8→3.0 + bulma 0.7→1.0 移行）

Phase 2 では実装中の調査で判明した以下の破壊的変更に対応した。通常のルート別確認（上記）に加え、
**修正の効果を狙い撃ちで確認する**観点として使う。

| # | 要素 | 確認内容 | 対応した破壊的変更 |
|---|---|---|---|
| B1 | MapOptionsControl（`/map`）のチェックボックス群 | 各オプション（Regions/Contours/Hillshading/AZ 等）をON/OFF→ページを**リロード**して設定が保持されているか | `b-checkbox`/`b-radio`/`b-input` が `input` イベントを廃止し `update:modelValue` のみemitするようになったため、`@input` で行っていた localStorage 永続化（`setMapOption` mutation）が発火しなくなっていた（`@update:model-value` へ修正済み）。**訂正・Phase 5・OK**: Turnstile devバイパス移植後に実機確認。「Regions」チェックボックスをON→リロード後もチェック状態が保持されることをスクリーンショットで確認済み |
| B2 | FilterInput 使用箇所（`/activators`、`/alerts`、`/spots/rbn`、`/summits/`、Region/Association 一覧、Activator 詳細のアクティベーション絞り込み等） | 検索欄に文字を入力→リストが即座に絞り込まれるか | `FilterInput.vue`/`FrequencyInput.vue` が独自にVue2方式のv-model契約（`props:{value}`+`$emit('input')`）のままPhase1から取り残されており、Buefy3のb-inputと組み合わせで入力値の伝播が機能しない状態だった（`modelValue`/`update:modelValue` へ修正済み）。**Phase 5・OK**: `/summits/`でFilter欄に"Japan"入力→4件へ即座に絞り込まれることを確認済み |
| B3 | EditSpot のFrequencyInput（周波数手入力） | Alert/Spot編集画面で周波数欄に手入力→値が反映されるか | 同上（B2と同じ根本原因）。未確認・**ホスト側依頼**（EditSpotのAddボタンが`:disabled="!authenticated"`でコンテナ内は未ログインのため開けない） |
| B4 | EditAlert のfreqMode タグ入力 | Alert編集で周波数/モードのタグ追加・カンマ区切り分割が機能するか | b-taginput が `input` イベントを廃止（`@update:model-value` へ修正済み）。未確認・**ホスト側依頼**（EditAlertモーダル自体はコンテナ内で開閉確認済みだが、タグ入力の詳細操作・送信はSSOログインが前提のため） |
| B5 | 全 b-table ページ（R7,R12,R15〜R17,R20 等）のソート・ページネーション | ヘッダクリックでソート、ページ送りが機能するか | コード変更なし（既にv-slot構文でAPI互換）。**Phase 5・OK**: `/summits/`でIdentifier列ヘッダクリック→降順ソート反映を確認済み |
| B6 | `$buefy` 経由のダイアログ/トースト/スナックバー/ローディング（Alert削除確認、写真アップロードエラー、ネットワークエラー通知、各ページのローディング表示等） | 表示・ボタン動作・自動消去のタイミング | コード変更なし（オプションキー互換確認済み）。**Phase 5・OK**: `$buefy.dialog.alert`（Activator詳細のQSOsクリック→"Please log in to view QSOs."）の表示・OKボタンでの消去を確認済み |
| B7 | navbar・モーダル・ドロップダウン・フォーム部品全般の見た目 | 色・枠線・背景等がbulma 0.7時代と大きく破綻していないか | bulma 0.7.5→1.0.4へ更新（CSS変数ベースのテーマ機構への移行に伴う）。**Phase 5・OK**: 非地図ページ全般（Settings/Summits/Activators/Alerts等）のスクリーンショットで大きな破綻なしを確認済み |
| B8 | OSのダーク/ライト設定を切り替えても表示が変わらないこと | OS側でダークモードに切り替えて再読み込み→配色が変化しないか | bulma 1.0はデフォルトで`prefers-color-scheme: dark`の自動ダークテーマを含むため、`bulma-no-dark-mode`版を採用して回避済み。**Phase 5・OK（静的解析）**: Playwright MCPにOSカラースキームのエミュレーション機能が無いため、代替としてビルド後CSS(`npm run build`)を実データで解析。通常版`themes/_index.scss`は`@include cv.system-theme($name: "dark")`で`prefers-color-scheme: dark`メディアクエリを生成するが、`bulma-no-dark-mode.scss`は`themes/light`のみ`@use`し`themes/dark`を一切importしない設計と、ソースコードレベルで確認。ビルド後CSSを`grep`した結果、bulma由来の`prefers-color-scheme: dark`は0件（ヒットした6件はmaplibre-glのハイコントラストモード対応用`prefers-color-scheme:light`で無関係）。ダークテーマ自体がビルド成果物に含まれないため、OS設定に関わらず配色は変化しない |

## Phase 5 総点検（modelValue化コンポーネントへの旧prop渡し・サイレントフォールスルー）

背景: Phase 1〜4はコンテナ内ヘッドレスブラウザ検証環境（Playwright MCP、2026-07-13導入）が
無く、ホスト側の部分的な目視確認しか行われていなかった。`<b-modal>`のv-model破損（Phase 2〜5、
全10箇所）を発見・修正した際、同型の「Buefy 3で`modelValue`化されたコンポーネントに旧prop名を
渡している」パターンが他にも残っていないか、機械的な総点検を実施した（詳細は
`.claude/plans/cuddly-churning-sunset.md`）。

**手法**: (1) ブラウザ上でBuefy全57コンポーネントの実物props/emitsをmixin再帰マージ込みで抽出
（`.claude/research/buefy-props-map.json`）、(2) `@vue/compiler-sfc`でsrc全94ファイルの
テンプレートASTを解析し渡しているprop/v-model名を抽出、(3) 突合して未宣言のものを検出する
スクリプト（`.claude/scripts/check-prop-fallthrough.js`）。既知ケース（`b-loading :active`が
偽陽性なく検出されること）で較正済み。(4) 独立した経路として、ランタイムでDOM上の素の
camelCase風属性（フォールスルーの痕跡）を全ページ・モバイル/デスクトップ両幅で検出する
スキャンも実施し、静的解析の結果と一致することを確認。

| # | 要素 | 確認内容 | 結果 |
|---|---|---|---|
| P5-1 | `<b-loading :active>` 全10箇所 | Loading.vueの`active` prop不在 | **確定バグ・修正済み**: `isActive`が永久false→スピナー全無表示。`:model-value`へ置換、`filtering=true`で`.loading-overlay`が実際に出ることを確認 |
| P5-2 | `NavBar.vue v-model:isActive` | Navbar.vueの`isActive` prop不在 | **確定バグ・修正済み**: バーガーメニューがナビリンクタップ後も開いたまま。`v-model`へ置換、400px幅でナビリンクタップ→メニューが閉じることを確認 |
| P5-3 | `CardPagination.vue v-model:current` | Pagination.vueの`current` prop不在 | **確定バグ・修正済み**: モバイルカード一覧のページ送りが無反応。`v-model`へ置換、`/activators/DL6FBK`でページ送り→カード内容が変わることを確認 |
| P5-4 | `SwisstopoInfo`/`BasemapAtInfo` `:on-cancel` | Modal.vueの`onCancel` prop不在（Buefy0.8残骸） | デッドコード削除（実害なし、`:can-cancel="false"`のため） |
| P5-5 | `EditAlert.vue :confirm-key-codes` | Taginput.vueの`confirmKeyCodes` prop不在（Buefy3は`confirmKeys`＋値形式もキー名文字列に変更） | **確定バグ・修正済み**: `onFreqModeKeyDown`が`this.$refs.freqMode.confirmKeyCodes`（存在しない）を参照し、Frequency-Mode(s)欄でキー入力のたびに`TypeError: Cannot read properties of undefined (reading 'indexOf')`。`freqModeConfirmKeys`データプロパティ（`[',', 'Tab', 'Enter', ' ']`）を追加、`event.key`ベースに変更。実機でエラー解消・タグ確定動作を確認 |
| P5-6 | `Map.vue :max-width="'600px'"` on `<SummitPopup>` | SummitPopup.vueが`maxWidth`propを宣言・転送していない | **確定バグ・修正済み**: `MglPopup`はデフォルト240px固定のまま（600px指定が届いていなかった）。`maxWidth` propを追加し`MglPopup`へ転送 |
| P5-7 | `SummitPhotos.vue :titleLink` on `SummitPhotosGroup` | SummitPhotosGroup.vueの`titleLink` prop不在 | upstream由来の無害なデッドコード（byte-identical、親スロット内で直接`group.titleLink`参照のため実害なし）。**修正不要・スコープ外** |
| P5-8 | `SolarHistory.vue spline="1"` on `<BarChart>` | BarChart.vueの`spline` prop不在 | upstream由来の既存バグ（byte-identical）。Vue3移行と無関係。**スコープ外** |
| P5-9 | `SummitVideosGroup.vue :webp="false"` on `LazyYoutubeVideo` | 自前実装（Phase1、vue-lazy-youtube-video置換）に`webp` prop未実装 | Phase1移行時の実装漏れ、実害ほぼ皆無（自前実装は元からJPG固定）。デッドコード削除 |
| P5-10 | 全16非地図ページ＋4地図ページ×2幅（400px/1280px）のDOMフォールスルー痕跡スキャン | 素のcamelCase風属性の検出 | 新規バグ0件（P5-7の`titlelink`のみ再検出、既知・対応不要と一致） |
| P5-11 | Console総点検（全ページ巡回時のerror/warning） | 既知ノイズ以外の新規エラー | `/activations/:activationId`ページで未ログイン時`this.$keycloak.login()`がTypeError（`$keycloak`は`wantSso`未設定時は未インストール）。upstreamと完全に同一実装のため**Vue3移行のリグレッションではなくupstream由来の既存バグ、スコープ外**（記録のみ） |

修正済み6件（P5-1〜3, 5, 6, 9）は`d09a4ad`・`ccc0025`でコミット。機械照合スクリプトと
成果物は`083e3ac`でローカルパッチとしてコミット（upstream PRには含めない）。

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
