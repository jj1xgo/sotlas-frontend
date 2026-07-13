# コンテナ内 WebUI 検証環境の導入（Playwright MCP + ヘッドレス Chromium）

## Context

WebUI の動作確認は現在ホスト側（`npm run dev` + Claude in Chrome）に依存しており、コンテナ内では
lint/build/curl までしかできない。今後の Vue 3 移行作業（地図オプション位置ずれ調査・Phase 4 等）で
検証の往復を減らすため、コンテナ内で Claude が直接ブラウザを操作して動作確認できる環境を作る。

**ユーザー承認済みの方針**（AskUserQuestion で確定）:
- 導入範囲は **Playwright MCP による対話的検証のみ**（`@playwright/test` の回帰テスト基盤は導入しない）
- 外部ドメインは **実 API＋地図タイル（api.maptiler.com）まで許可**（モック化しない）

**主要な設計判断**（Fable 計画セッションで調査・Plan agent レビュー済み。根拠は実物裏取り済み）:
- **ブラウザは Debian の `chromium` を packages.txt で導入**し、MCP に `--executable-path /usr/bin/chromium`
  を渡す。理由: 実行時 apt 不可のため Playwright CDN 方式は共有ライブラリ約30個の手動列挙が必要になり脆い。
  apt なら依存解決で全部揃う。MCP が使う機能（CDP ナビゲーション・snapshot・screenshot・console）は
  長期安定 API で、Debian trixie の chromium は upstream stable にほぼ同期しており非互換リスクは小さい
- **`@playwright/mcp` は npx で完全バージョンピン（`@0.0.78`）**。`@latest` はレジストリ障害で起動不能・
  バージョン変動のリスク。完全ピンなら npx キャッシュでオフライン起動可。package.json は触らない
  （upstream PR 汚染回避）
- **claude-container 本体への変更リクエストは不要の見込み**。packages.txt / allowed-domains.txt は
  プロジェクト側ファイル。/dev/shm 63MB は Playwright 既定の `--disable-dev-shm-usage` で吸収、
  sandbox は `--no-sandbox` で吸収（閲覧対象は自前 dev サーバ＋allowlist 済み API のみ）。
  Session B で塞がった場合のみ report-container-issue skill で起票

## リビルドを挟む3フェーズ構成

コンテナ設定（packages.txt / allowed-domains.txt）はビルド時にしか反映されないため、
**Session A（設定投入・コミット）→ ホスト作業（`-b` リビルド）→ Session B（受け入れ検証）** に分割する。
本計画ファイルは Session B 完了まで削除せず、handover で引き継ぐ。

## Session A: 実装ステップ（本セッション、Sonnet 実装想定）

全て設定ファイル編集のみ。上位モデル委譲が必要なタスクはなし。

### 1. `.claude-container.d/packages.txt` — ブラウザ＋フォント追加

既存のコメント様式に合わせ、理由コメント付きで追加:

```
chromium          # Playwright MCP のヘッドレス検証用（実行時 apt 不可のためビルド時導入）
fonts-liberation  # スクリーンショットの豆腐化防止（欧文）
fonts-noto-core   # 同（ダイアクリティカルマーク等）
fonts-noto-cjk    # 同（JA/* サミット名等の日本語）
```

### 2. `.claude-container.d/allowed-domains.txt` — アプリ実行時ドメイン追加

用途コメント付きで追加（ワイルドカード非対応前提の個別列挙）:

| ドメイン | 用途（根拠） |
|---|---|
| challenges.cloudflare.com | Turnstile スクリプト（App.vue が未認証時に常時描画。トークン→`/mapkey/get`→MapTiler キーの連鎖の起点で、**無いと地図が一切描画されない**） |
| api.maptiler.com | 地図スタイル/タイル/グリフ/スプライト（mapstyle.js にハードコード） |
| sotl.as | API ベース（VITE_API_URL）・/tracks・/sprites |
| api-db2.sota.org.uk | SOTA DB API（16箇所ハードコード） |
| api-db.sota.org.uk | 同（1箇所） |
| photos.sotl.as | 写真サムネイル |
| sotlas-photos.s3.eu-central-003.backblazeb2.com | 写真オリジナル |
| elevation.sotl.as | 標高 API（summit 詳細で発火） |
| az.sotl.as | アクティベーションゾーン GeoJSON |
| secure.geonames.org | 検索機能 |
| api.windy.com | ウェブカム一覧（既定 OFF だが先回り） |

- `sso.sota.org.uk` は**追加しない**（Keycloak init は `wantSso` フラグ時のみ。SSO 検証は対象外）
- WebSocket 接続先は**不要**（vue-native-websocket は Vue2 専用で install 無効化済み。
  Phase 4 で復活させる際に接続先を allowlist 確認する旨をコメントで残す）
- 代替ベースマップ（swisstopo 等）・Windy サムネイル画像ホストは追加せず、必要になった検証時に
  `browser_network_requests` で実ホストを確認して追記する方針をコメントで残す

### 3. `.mcp.json`（新規・プロジェクトルート）

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@0.0.78",
        "--browser", "chromium",
        "--executable-path", "/usr/bin/chromium",
        "--headless",
        "--no-sandbox",
        "--isolated",
        "--viewport-size", "1280,800",
        "--caps", "vision",
        "--output-dir", ".claude/playwright-mcp"
      ]
    }
  }
}
```

- `--isolated`: 毎回クリーンプロファイル（再現性・プロファイルロック残留回避。localStorage は毎回リセット）
- `--caps vision`: 地図は canvas 描画で snapshot に載らないため座標ベース操作用
- `--viewport-size` の引数形式（`1280,800` か `1280x800` か）は Session B の warmup 時に `--help` で確認して合わせる

### 4. `.gitignore` — `.claude/playwright-mcp/` を追加（MCP の出力先）

### 5. `.claude/settings.json` — `"enableAllProjectMcpServers": true` を追加

新セッションごとの .mcp.json 承認プロンプトを回避（コミット済み settings.json はローカルパッチ範囲）。

### 6. `CLAUDE.md` 更新

- 「検証方法」節: コンテナ内 headless 検証（dev サーバ background 起動→ MCP 操作）を第一手段に昇格。
  ホスト側 `npm run dev` + Claude in Chrome は補助手段（ヘッドフル確認・Turnstile 不通過時）として存置
- 「コンテナ開発」節: 「ポート非公開なのでブラウザ確認はホスト」の記述を「ポートは非公開だが、
  dev サーバとブラウザを両方コンテナ内で動かすため支障なし」に更新
- MCP バージョン更新手順（.mcp.json の版数を手動更新→動作確認）を一行追記
- chromium ゾンビプロセス掃除（`pkill -f chromium`）を検証節に一行
- ホスト側で claude を起動した場合 `/usr/bin/chromium` が無くブラウザ起動エラーになる旨を注記

### 7. コミット＆リビルド依頼

- 本計画ファイル＋上記変更をローカルパッチとして日本語コミット（feat/vue3-migration 上）
- ユーザーに依頼: 「コンテナを終了し、ホスト側で `../claude-container/claude-container -b ~/sota/sotlas-frontend`
  を実行して再入場してください」

## Session B: 受け入れチェックリスト（リビルド後の新セッション）

1. **環境確認**: `chromium --version` / `fc-list | grep -ci Noto`（フォント）
2. **allowlist スモーク**: 追加ドメイン各々へ `curl -sI --max-time 8`（ブラウザ検証前にブロックを早期検知。
   リビルドループ最小化のため）
3. **npx warmup**: `npx -y @playwright/mcp@0.0.78 --help`（初回 DL 数十MBの MCP 起動タイムアウト回避＋
   `--viewport-size` 引数形式の確認）
4. **MCP 接続確認**: Playwright MCP ツールが見えること
5. **dev サーバ**: `npm run dev` を run_in_background 起動、`Local: http://localhost:5173` 確認
6. **トップページ** `/`: snapshot でスポット/アラート一覧描画（VITE_API_URL 疎通）、console エラーの
   ベースライン採取、screenshot
7. **summit 詳細**（写真ありサミット）: 属性（api-db2）・写真サムネ・座標/標高・
   **ミニマップ描画（Turnstile→mapkey→maptiler の全連鎖の統合確認）**。`browser_network_requests` で
   失敗リクエスト（=allowlist 漏れ）を列挙
8. **地図ページ** `/map`: タイル描画待ち→screenshot で canvas 非ブランク確認（WebGL/SwiftShader の確認点）
9. **記録**: 正常時にも残る無害な console エラーをベースラインとして lessons.md へ記録。
   問題なければ本計画ファイルを `git rm` して完了

## リスクとフォールバック

| リスク | 対処 |
|---|---|
| **Turnstile がヘッドレスブラウザを弾く**（bot 検知の本業。allowlist では解決不能） | 発生時は非地図ページのフル検証＋地図は DOM（コントロール類）まで、にスコープ縮小。地図検証はホスト側継続。恒久策（dev 用キー注入等）は結果を見て別 issue 化。ヘッドフル切替は X サーバが無く不可 |
| 地図 canvas が真っ黒（SwiftShader の WebGL 初期化失敗） | MCP の `--config` で `browser.launchOptions.args` に `--enable-unsafe-swiftshader` を追加する構成へ切替 |
| Debian chromium と playwright-core の CDP 非互換 | allowed-domains に `cdn.playwright.dev` / `playwright.download.prss.microsoft.com` を追加し Playwright 管理 chromium へ移行（apt chromium の依存ライブラリがそのまま流用できるため追加ライブラリ不要） |
| allowlist ドメイン漏れ | `browser_network_requests` で検知→追記→再リビルド依頼（スモークで最小化） |
| MapTiler セッション課金 | 検証のたびにセッション消費する点をユーザー了承済み。無駄な地図リロードを避ける運用 |

## 検証（観測可能性）

- 受け入れの成否はスクリーンショット実物＋ console/network の実データで判定（「動いたはず」で終わらせない）
- 地図タイルの描画には数秒かかる（SwiftShader はさらに遅い）ため、screenshot 前に明示的な待機を入れる
