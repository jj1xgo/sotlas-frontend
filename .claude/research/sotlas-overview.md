# SOTLAS フロントエンド調査ノート

作成日: 2026-07-06(2026-07-06 網羅調査で更新)
目的: issue #2(アクティベーションゾーンの日本サミット追従)・issue #3(夜間帯/ターミネーター表示)着手前の機能把握。以後は本リポジトリの機能リファレンスとして随時更新する。
scope: 本ファイルは `.claude/` 配下(git未追跡)。upstream への PR には含まれない。

## プロジェクト概要

- SOTLAS (https://sotl.as): Summits On The Air (SOTA) アマチュア無線プログラム向けの、山岳サミット検索・地図アトラス。Vue 2 (Vue CLI/vue-router/Vuex) + Buefy(Bulma) 製フロントエンド。
- 地図描画は `vue-mapbox`(`manuelkasper/vue-mapbox` フォーク) 経由の Mapbox GL JS。
- リポジトリ構成:
  - `src/views/`: ルーティング先ページ(`Map.vue` が地図本体、`Summit.vue`, `Activator.vue` 等)
  - `src/components/`: UI部品(地図コントロール類は `Map*.vue` 群)
  - `src/mixins/`: 横断的ロジック(`api.js`=バックエンドAPIクライアント, `mapstyle.js`=地図スタイル生成, `nowticker.js`=1分ごとの時刻更新等)
  - `src/store.js`: Vuex ストア。`mapOptions`(地図レイヤーのON/OFF設定、localStorage永続化)を保持
  - `src/prefix.js`: SOTA アソシエーション/リージョンのプレフィックス定義表(例: `JA` は既に登録済み)。コールサインからISOコード/大陸を引く `isoCodeForCallsign()` / `continentForCallsign()` も提供
- 認証: SOTA公式Keycloak SSO(`realm: SOTA`, `src/main.js`)。未ログインでも閲覧は可能で、投稿系機能(スポット/アラート/写真アップロード)のみ要ログイン
- バックエンドは2系統:
  1. SOTLAS自前バックエンド(`VITE_API_URL`): サミット/アソシエーション検索、写真、地図キー発行、ソーラーデータ、標高取得等
  2. SOTA公式データベースAPI(`api-db2.sota.org.uk`, `api-db.sota.org.uk`): アクティベーション履歴・QSOログ・S2S・ユニーク集計・SOTAwatchスポット/アラート投稿

## 全機能一覧(ルーティング単位)

`src/router.js` に定義された各ページと主な機能:

| パス | 画面 | 主な機能 |
|---|---|---|
| `/map`, `/map/summits/:code`, `/map/coordinates/:c/:zoom`, `/map/regions/:region` | `Map.vue` | メイン地図。サミットクリックでポップアップ、URLへの座標/サミット同期、右クリックで座標ポップアップ、地図PNGダウンロード、GPX/KML描画・インポート・標高プロファイル(後述) |
| `/summits/`, `/summits/:assoc`, `/summits/:assoc/:region`, `/summits/:code` | `AssociationList`/`Association`/`Region`/`Summit.vue` | サミットデータベースの階層ブラウズ(アソシエーション→リージョン→サミット)、フィルタ、GPX/KML/GeoJSONエクスポート、ミニマップ併記、自分の登頂実績のハイライト |
| `/activations/:id` | `Activation.vue` | 個別アクティベーションのQSOログ詳細(要ログイン、SOTA公式APIから取得) |
| `/activators/`, `/activators/:callsign` | `Activators`/`Activator.vue` | アクティベーター一覧(サーバサイドソート/ページネーション)、個人プロファイル(得点・Mountain Goat・ユニーク数・年別/月別/標高別/アソシエーション別チャート、QSOモード/バンド内訳、最近のSOTA/RBNスポット・アラート、活動地図) |
| `/spots` (`/spots/sotawatch`, `/spots/rbn`) | `Spots`/`SotaSpots`/`RBNSpots` | SOTAwatchスポットのリアルタイム表示(WebSocket)・フィルタ(バンド/モード/大陸/コールサイン正規表現)・新着音通知、Reverse Beacon Network(RBN)スポットのリアルタイム表示・フィルタ(All/Only-P/Activationsのみ) |
| `/alerts` | `Alerts.vue` | 今後のアクティベーション予定一覧、フィルタ、iCalフィード購読(`webcal://`) |
| `/new_photos` | `NewPhotos.vue` | 直近アップロードされたサミット写真をアソシエーション別に閲覧 |
| `/solar_history` | `SolarHistory.vue` | 過去30日のSFI/SN/K指数チャート(電波伝搬コンディション) |
| `/search` | `SearchAnything.vue` | 統合検索(サミット・アクティベーター・GeoNames地名)。単一ヒット時は自動リダイレクト |
| `/settings` | `Settings.vue` | 単位(m/ft)、スポット/アラートのデフォルトコメント |
| `/about` | `About.vue` | クレジット・データソース・技術スタック表示 |

## 地図(Map.vue)関連の主要機能

- **地図タイプ切り替え**: MapTiler Outdoor/Winterのクラウドスタイルと、basemap.at・CalTopo・Norkart・swisstopo(通常/航空写真/ラスタ)・TopoSvalbardのローカルスタイルを選択可能(`mapstyle.js`)
- **地図オプション(`MapOptionsControl.vue`)**: リージョン境界、等高線、陰影起伏、アクティベーションゾーン(AZ)、傾斜クラス(SACハイキング難易度スケール T1/T2-3/T4-6)、積雪深(SLF、11月〜6月限定)、スキー/スノーシュールート、野生動物保護区、最近のスポット/アラートのハイライト(日数指定可)、非アクティブサミット表示、ウェブカメラ(Windy API、Daylight/Currentモード)。いずれもマップスタイルの `type` 別に対応可否が変わり(`mapTypes[mapType].xxx`)、地図言語もブラウザ言語に自動追従
- **地図フィルタ(`MapFilterControl.vue`)**: 登頂回数・ポイント・標高レンジ、特定コールサインによる「登頂済み/未登頂」(SOTA公式APIから動的にサミットコード集合を取得)、ログイン時のみ「Complete candidate(チェイスはしたがアクティベートしていないサミット)」フィルタ
- **ルート描画・GPX/KMLツール(`MapDraw.vue`)**: Mapbox GL Draw(`@mapbox/mapbox-gl-draw` フォーク)でポイント/ラインを描画、GPX/KMLインポート(`@tmcw/togeojson`)、選択したラインの標高プロファイル(`VITE_ELEVATION_API_URL` に100m間隔でサンプリング)をチャート表示、GPXエクスポート(`@dwayneparton/geojson-to-gpx`)
- **地図PNGダウンロード(`MapDownloadControl.vue`)**: 現在の地図表示をcanvasからPNGとして保存
- **ロングタッチ(`longtouch.js`)**: モバイルでの長押しで座標ポップアップ(`MapInfoPopup.vue`)を表示
- **サミットポップアップ(`SummitPopup.vue`)**: 標高・ポイント・登頂回数・直近スポット・次回アラートを表示、最小化可能
- **ウェブカメラ(`MapWebcams.vue`/`MapWebcam.vue`)**: Windy Webcams API、地図の移動/ズームをデバウンスして再取得、ズームレベルに応じたAPI制限回避ロジックあり

## サミット詳細ページ(Summit.vue)の機能

- カバー写真(自前アップロード優先、無ければWikipedia geosearchから自動取得)
- 座標・Maidenheadロケータ・方位/距離(ログイン時)
- 初登頂者情報、外部リソースリンク(SOTA Trails、Wikipedia、SAC-Tourenportal、Hikr.org、Camptocamp.org、Google検索、SOTA公式リソース、YouTube動画自動抽出)
- ルート(サミット登録ルート + SOTA Maps(SMP)のGPXトラックをマージ、距離/獲得標高/下降標高を自動計算)
- 写真ギャラリー(アップロード・並べ替え・編集・削除、FilePond経由、GPS/低解像度警告付き)
- 直近スポット/アラート、全アクティベーション履歴とチャート

## 投稿・認証まわりの機能

- **スポット投稿/編集(`EditSpot.vue`)**: コールサイン・サミットコード(近隣サミット候補表示 `NearbySummitsList`)・周波数/モード・QRT/Testタイプ、SOTAwatch APIへ投稿
- **アラート投稿/編集(`EditAlert.vue`)**: 日時(ローカル/UTC切り替え)・周波数-モードのタグ入力、iCal配信にも反映
- **写真アップロード(`PhotosUploader.vue`)**: FilePondベース、複数ファイル、GPS情報なし/低解像度の警告ダイアログ(初回のみ)
- **ログイン(`LoginButton.vue`)**: Keycloak SSO、`wantSso`フラグをlocalStorageに保持し次回訪問時に自動再開
- **Cloudflare Turnstile(`App.vue`)**: 未ログイン時にトークン取得し、MapTiler APIキー発行のボット対策に使用

## 地図レイヤーの仕組み(mapOptions とレイヤー可視化)

`src/mixins/mapstyle.js` が要:

- 地図スタイルは2種類:
  1. **Cloud styles**(`maptiler_outdoor` / `maptiler_winter`): MapTiler Cloud上のUUID指定スタイルをMapLibreが直接フェッチ。スタイル本体(レイヤー定義・ベクトルタイルソース)はこのリポジトリ外(MapTiler側)で管理されている。
  2. **Local styles**: `src/assets/*.json`(basemapat, caltopo, norkart, swisstopo等)をこのリポジトリで直接保持・パッチ。
- どちらのスタイルでも、レイヤーの `metadata['sotlas-map-option']` に `mapOptions` のキー名(例: `'az'`, `'snow_depth'`, `'contours'`)を仕込んでおくと、`mapstyle.js` の `updateLayers()` / `mapStyle` computed が `visibility: visible|none` を自動で切り替える汎用の仕組みになっている(`src/mixins/mapstyle.js:47-55`, `:126-134`)。
- つまり **UI側の「レイヤーON/OFF」機構は既に地域非依存で汎用化済み**。新しい地域のデータが追加されても、フロントエンド側のトグル機構自体に変更は不要。

## issue #2: アクティベーションゾーン(AZ)を日本のサミットにも追従

### 現状の理解

- AZ表示は `mapOptions.az` フラグ(`src/store.js:31`, 既定 `true`)でON/OFF。
- AZポリゴンの実データは **ベクトルタイルソース側(MapTiler Cloud上のスタイル)に地域別に事前計算されて焼き込まれている**。フロントエンドはトグルするだけで、ジオメトリを計算するロジックはこのリポジトリ内に存在しない。
- `src/components/MapOptionsControl.vue:207` のダイアログ文言に、AZ境界が **現在利用可能な地域を明示的に列挙**している:
  - `ER`(1秒角SRTM由来)
  - `HB/HB0`(swisstopo swissALTI3D, 0.5m解像度)
  - `OE`(BEV ALS DTM, 1m解像度)
  - `OM`(LiDAR DTM, 20m解像度)
  - `W7W`(Washington州DNR LiDAR)
  - `ZL`(LiDAR/NZSoSDEM 15m DEM)
  - **`JA` は現時点でこのリストに含まれていない = 日本のサミットのAZポリゴンはまだ計算・配信されていない**
- `src/prefix.js:1891` に `JA` プレフィックス自体は登録済み(サミットデータ自体は存在する)。欠けているのは地形データからのAZポリゴン生成・配信のみ。

### この issue の実質的なスコープ判断(重要)

- AZポリゴンの生成・ベクトルタイル化は、**このフロントエンドリポジトリの外(MapTilerスタイル/バックエンド側のデータパイプライン)** の作業であり、`sotlas-frontend` の PR だけでは完結しない可能性が高い。
- 外部の "Activation Zone Estimator" (`https://activation.zone/?summitRef=...`, `src/components/Coordinates.vue:455-461`) は完全に別サービスへのリンクであり、SOTLAS本体のAZ計算とは無関係。

#### 補足調査: "Activation Zone Estimator" (activation.zone) とは何か(2026-07-06調査)

SOTA/SOTLAS公式とは無関係な、個人開発の非公式サードパーティツール。以下、実際にJSバンドル解析・GitHubリポジトリ精査・API実行検証を行った結果。

- **構成**: GitHub `arkorobotics` アカウント配下の3リポジトリからなる(README記載のクレジットより、開発者本人は `@arkorobotics`、API実装協力に `@thedeltaflyer`、フロントエンド実装協力に `@eheinrich`)。
  - [`azgen`](https://github.com/arkorobotics/azgen): AZ計算アルゴリズムの原型(Jupyter Notebook, Python)。README曰く "Activation Zone Generator" で、SOTA公式サイトから取得した緯度/経度/標高を入力しAZポリゴンを算出する検証用ノートブック
  - [`azgen-api`](https://github.com/arkorobotics/azgen-api): 上記を本番化したFastAPIバックエンド。`https://api.activation.zone` としてホスティングされている
  - [`azgen-web`](https://github.com/arkorobotics/azgen-web): Vue製フロントエンド。`https://activation.zone` としてCloudflare Pagesでホスティング(SOTLAS本体の `Coordinates.vue` からのリンク先はここ)
- **計算方式**(`azgen-api` の `requirements.txt`・`azapi/endpoints.py`・`azgen.ipynb` から確認):
  1. フロントエンドが `summitRef` を受け取ると、SOTA公式API(`https://api2.sota.org.uk/api/summits/...`、JSバンドル内に文字列として存在)からそのサミットの緯度/経度/公式標高を取得
  2. それを `azgen-api` にPOST。バックエンドはPython `elevation` パッケージ(`eio clip`)経由でサミット周辺の**全球30m解像度SRTM DEM**をオンデマンドでダウンロード
  3. 「山頂から鉛直方向25m以内」という **SOTA公式ルール(2015年4月改定)をコード内コメントに明記した閾値** でDEMをマスクし、`alphashape` でポリゴン化してGeoJSON(または `/gpx` エンドポイントでGPX)を返す
  4. つまり、SOTLASの独自AZレイヤー(MapTilerスタイルに地域別に事前焼き込み、`ER`/`HB`/`OE`/`OM`/`W7W`/`ZL`のみ対応)とは全く別の実装であり、**特定地域のLiDAR等高精度データに依存しない**。SRTMがカバーする範囲(概ね北緯60度〜南緯56度)の全サミットに対して動的に計算できる
- **JA(日本)サミットでの動作を実機検証済み**(2026-07-06): SOTA公式APIから `JA/YN-001`(北岳, 標高3193m, 北緯35.6743/東経138.2388)の座標を取得し、`https://api.activation.zone/` に直接POSTしたところ HTTP 200 でAZポリゴンが正常に返った。**SOTLAS本体にJA用AZレイヤーが無い現状でも、activation.zoneは既に日本のサミットに対して(30m解像度なりの)AZ推定を提供できている**ことを確認した。
- **限界・注意点**:
  - 30m SRTMは、SOTLASが他地域で使っている高精度DEM(HB/HB0の0.5m、OEの1m等)に比べて粗く、急峻・複雑な地形(日本の山岳に多い)では実際のAZ形状との誤差が大きくなりうる
  - SOTA/SOTLAS公式のインフラではなく、個人運営の非公式ツール(可用性・継続性の保証なし)。SOTLAS内で「公式代替」として案内する場合はその位置づけを明示すべき
- **issue #2への示唆**: 「SOTLASにJA用AZレイヤーが無い」ことと「JAのAZを推定する手段が無い」ことは別問題であり、後者は既にactivation.zoneで(限定的にせよ)解決されている。issue #2のスコープを検討する際は、(a) 現状通り外部リンクを暫定策として案内する、(b) SOTLAS/upstream側で地域別高精度DEMの整備を進める、(c) activation.zone方式(全球SRTM+動的計算)に近いアプローチをSOTLAS自身に取り込む、の少なくとも3方向が選択肢になる。いずれもフロントエンドリポジトリ単独では完結しない判断を含むため、着手前にユーザー/upstreamとの方向性合意が必要な点は従来の判断から変わらない。
- **重要な誤解の回避**: activation.zone(arkorobotics)に「日本のサミットを対応してほしい」と依頼するのは筋違い。同ツールは既に全球30m SRTMベースでJAサミットに対しても動作する(上記で実証済み)ため、対応済み/対応不要。SOTLAS本体の地図にAZを表示するには、MapTilerクラウド上のスタイル(ベクトルタイル)側に地域別データを追加する必要があり、依頼すべき相手はupstream側(manuelkasperまたはSOTLASの地図スタイル管理者)。
- 着手前に確認すべき論点:
  1. 日本国内で使える高精度DEM(国土地理院 基盤地図情報数値標高モデル 5mメッシュ等)をAZ計算に使えるか、誰が計算・ホストするか
  2. AZポリゴン生成〜MapTilerスタイルへの反映は誰の権限か。**確認済み**: `manuelkasper` はupstreamリポジトリ(`github.com/manuelkasper/sotlas-frontend`)の所有者かつ`About.vue`記載の作者で、`vue-mapbox`等の主要依存も自身のGitHubアカウントでフォーク・パッチしており、SOTLASプロジェクト全体の実質的単独運営者と言える。**未確認**: MapTilerクラウド上のスタイル(UUID参照のみで所有者情報はコードから追えない)を彼が個人的に管理しているかどうかは推測の域を出ない。確実にするにはupstream issueで直接本人に確認するのが早い
  3. フロントエンド側で対応できる範囲があるとすれば、「AZデータが無い地域でのUI表現」(例: 現状ダイアログの文言更新、日本対応時の告知)程度に留まる可能性がある
- → **Plan Mode着手時は、まず「フロントエンドで完結するか、upstreamへのデータ提供依頼が必要か」を切り分けるところから始める**べき。実装計画より先に、この点をユーザーと確認する価値が高い。

## issue #3: 地図上に夜間帯(ターミネーター)を表示

### 現状の理解

- 太陽の位置・薄明・ターミネーター計算を行う既存ライブラリ(suncalc等)は `package.json` に **未導入**。
- 一方、`src/mixins/nowticker.js` が既に「現在時刻を1分ごとに更新する `this.now`(moment.js)」を提供しており、時刻に追従する動的レイヤー更新の土台として流用できる。
- 動的にGeoJSONソース/レイヤーを追加する実装例が既に存在する: `src/mixins/mapstyle.js:143-160` の積雪データ(`snowcover`, SLFの外部GeoJSON)を `map.addSource()` / `map.addLayer()` する箇所が良いテンプレートになる。
- レイヤーのON/OFFをmapOptionsの汎用トグル機構に乗せる場合、`mapOptions` に新規キー(例: `terminator`)を追加し、`store.js:28` の初期値・`MapOptionsControl.vue` にチェックボックスを追加する形が既存パターンと一貫する。

### この issue の実質的なスコープ判断

- issue #2 と異なり、**太陽位置・ターミネーターの計算は完全にクライアントサイドで完結可能**(外部データ配信やバックエンド変更が不要)。地形データ依存のissue #2よりも着手ハードルが低い。
- 検討事項:
  1. 計算ライブラリの選定(自前実装 vs `suncalc` 等の追加、依存追加は要相談)
  2. 更新頻度(`nowticker` の1分間隔で十分か、ターミネーターは秒単位で動くほど速くないため1分間隔で妥当と考えられる)
  3. 描画方法: 昼夜境界線(line)か、夜間側を塗る(fill, 薄明帯のグラデーション込み)か → UI要件をユーザーに確認
  4. `mapOptions` への統合(他のレイヤー同様トグル可能にするか、常時表示にするか)

## 参照した既存コード(要点のみ)

- `src/store.js:28-39`: mapOptions定義と初期値
- `src/mixins/mapstyle.js:47-55`, `:120-160`: レイヤー可視化の汎用トグル機構、動的ソース追加の実例(snowcover)
- `src/components/MapOptionsControl.vue:25-28`, `:203-210`: AZ トグルUIとAZ対応地域の説明ダイアログ(地域リストの一次情報)
- `src/components/Coordinates.vue:18-24`, `:452-461`: AZファイルダウンロードリンク、外部AZ計算サービスへのリンク
- `src/prefix.js:1891`: `JA` プレフィックス登録箇所
- `src/mixins/nowticker.js`: 1分間隔の時刻更新ミックスイン(moment.js)
