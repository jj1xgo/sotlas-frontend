# Turnstile コンテナ内検証バイパス（issue #18）

## Context

コンテナ内 Playwright MCP による WebUI 検証で、Cloudflare Turnstile（`challenges.cloudflare.com`）が
ヘッドレスブラウザの bot 検知で通過できず、Turnstile → `/mapkey/get` → MapTiler キー取得という連鎖が
成立しないため、地図が絡むページ（`/map`、summit 詳細の埋め込みミニマップ）が常に空白のまま検証でき
ない（`jj1xgo/sotlas-frontend#18`）。

調査の結果、以下が判明済み:
- Cloudflare のテスト用サイトキー／Turnstile モックはいずれもバックエンド（`manuelkasper/sotlas-api`、
  fork 管理外、本番 secret key 固定）側の対応が必須で、フロントエンド単独では実現不可
- 一方、`src/mixins/mapstyle.js` の `updateMapTilerApiKey()` には既に
  `if (this.$store.state.mapTilerApiKey || this.$store.state.mapTilerApiKeyLoading) return` という
  ガードがあり、**Vuex の初期値として MapTiler キーを直接注入しておけば、Turnstile／`/mapkey/get` の
  実行経路自体を素通りできる**
- 地図タイル自体は本物の `api.maptiler.com` に実リクエストするため、既承認方針「外部ドメインは実 API・
  地図タイルまで許可、モック化しない」と矛盾しない

Fable によるレビューで以下を確定済み:
- **実装ブランチ**: `master` から新規ブランチを切る（この修正は Options API のみで Vue 2.7/Vue 3 の
  どちらでも同一に動き、Vue3 移行に技術的依存が無いため）。検証には `.mcp.json`（`feat/vue3-migration`
  にのみ存在）が必要なので、検証セッション中だけ一時的にコピーする（コミットしない）
- **upstream には出さずローカルパッチとして扱う**（claude-container 検証専用機能で upstream に対応
  文脈が無く、Turnstile 迂回コードパスは受理コストが高いため）。付随して CLAUDE.md の「ローカルパッチ」
  定義を `src/` への変更も含む形に更新する
- Turnstile ウィジェット自体も非表示にする（表示したままだと `Error callback: 600010` が今後の全検証
  セッションで console ノイズになり、本物のエラーを埋もれさせるため）
- `.claude-container.d/env` は既存の `*_FILE` サフィックス解決機構（`GH_TOKEN_FILE` → `GH_TOKEN` で
  実証済み）を転用し、`VITE_MAPTILER_DEV_KEY_FILE=<path>` 形式で注入する（コード側の追加ロジック不要）

## 実装内容

### 1. `src/store.js` — MapTiler キーの初期値に二重ガードを追加

```js
mapTilerApiKey: (import.meta.env.DEV && import.meta.env.VITE_MAPTILER_DEV_KEY) || null,
```

- `import.meta.env.DEV`: Vite 標準組み込み変数。`vite build`（本番ビルド）では常に `false` なので
  コード上不可逆に無効化される
- `import.meta.env.VITE_MAPTILER_DEV_KEY`: コンテナの `.claude-container.d/env` にのみ存在する変数。
  ホスト側 `.env` には追加しないため、ホスト側 `npm run dev` は従来どおり本物の Turnstile フローのまま
- これ以外（`mapstyle.js`・`api.js`）は無改修

### 2. `src/App.vue` — Turnstile ウィジェットの非表示化

```js
computed: {
  siteKey () {
    return import.meta.env.VITE_TURNSTILE_SITE_KEY
  },
  devMapKeyPreseeded () {
    return import.meta.env.DEV && !!import.meta.env.VITE_MAPTILER_DEV_KEY
  }
}
```

テンプレート: `v-if="!authenticated && !devMapKeyPreseeded"` に変更。既存の `!$store.state.mapTilerApiKey`
条件は使わない（本番 UX ではキー取得後もウィジェットが残る現行挙動を変えないため、判定は env ベースに限定）。

### 3. `.claude-container.d/env`（gitignore 対象、git 管理外）

```
VITE_MAPTILER_DEV_KEY_FILE=<検証専用 MapTiler キーが書かれたファイルへのパス>
```

- 事前準備としてユーザーが MapTiler で検証専用 API キーを新規発行する（オリジン制限をコンテナの
  `http://localhost:<port>` に対応させる。MapTiler 側が localhost を許容しない場合は制限なし＋
  クォータ監視で運用）
- **実機検証必須**: `*_FILE` サフィックス解決機構が汎用的かどうかは今回初めて実証する。動かない場合は
  `VITE_MAPTILER_DEV_KEY=<値>`（直接値）へフォールバックする

### 4. `CLAUDE.md` の「ローカルパッチ」節を更新

現状の列挙（`.claude/` 配下・`.claude-container.d/`・`.gitignore`・CLAUDE.md 自身）に、今回追加する
`src/store.js`・`src/App.vue` の devバイパスパッチを含める形に一文追記する。

### 5. `.claude/lessons.md` に記録

- `.claude-container.d/env` の `*_FILE` 解決機構が汎用的だったか（または直接値へフォールバックしたか）
- Turnstile ウィジェット非表示化の判断理由

## ブランチ運用

1. `git checkout master && git checkout -b feat/turnstile-dev-bypass`
2. 上記 1〜4 を実装・コミット（日本語コミット、ローカルパッチのため）
3. 検証時のみ `git show feat/vue3-migration:.mcp.json > .mcp.json`（未追跡ファイルとして配置、コミットしない）
4. 検証完了後 `.mcp.json` を削除し `git status` で未追跡ファイルが残っていないことを確認
5. `master` へ統合（fast-forward merge、または `master` に切り替えて同内容をコミットし直す）

## 検証手順

1. `.claude-container.d/env` 変更を反映するためコンテナを `-b`（リビルド）で再起動
2. `npm run dev` を `run_in_background` で起動
3. Playwright MCP で `/map`・summit 詳細ページ（埋め込みミニマップ）へ `navigate`
4. スクリーンショットで地図タイルが実際に描画されることを確認
5. console/network ログで Turnstile 関連の `600010` エラーが出ていないこと（ウィジェット非表示化により）
6. `npm run lint` で警告ゼロを確認

## issue #18 へのコメント

実装着手前に、確定した設計（c 案＋ローカルパッチ運用＋ブランチ戦略）を issue #18 にコメントする。
