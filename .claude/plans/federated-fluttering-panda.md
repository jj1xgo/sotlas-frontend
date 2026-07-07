# upstream 同期による FontAwesome フォールバック正式版への移行

## Context

開発環境で Activation zones / Hiking difficulty 等の `info-circle` アイコンが表示されない。
原因はローカルパッチ `fe51909`（stub+alias 方式）の stub が **空 SVG パス**のプレースホルダーで
あるため（CLAUDE.md の「free アイコンで代替実装」という記述は実装と乖離していた）。

この問題は upstream（manuelkasper/sotlas-frontend）に **PR #43（`99a3d96`）としてマージ済み**の
正式実装（postinstall + `src/fa-pro-fallback/` の実 free アイコン）で解決されている。
トークン無し環境では postinstall がスキップされ vite alias で fallback に解決されるため、
コンテナの許可ドメイン追加も不要なことをスクリプト本文で確認済み。

よって fork を upstream に同期し、ローカルパッチ `fe51909` を廃止する。

## 事前確認済みの事実

- upstream 先行 4 コミット: PR #42（vue-filepond fix）+ PR #43（FA fallback）のマージ、いずれも本 fork 発
- ローカル 17 コミット中、アプリ本体ファイル（`.npmrc`/`package.json`/`package-lock.json`/
  `vite.config.mjs`/stub）を触るのは `fe51909` のみ。残り16は `.claude/`・`CLAUDE.md`・
  `.gitignore`・`.claude-container.d` のみで upstream 変更と非重複 → `fe51909` を落とせば衝突ゼロ見込み
- `feat/night-terminator` の 3 コミット + 未コミットの MapOptionsControl.vue 変更も upstream 変更と非重複

## 手順（実装: Sonnet。委譲条件に該当するタスクなし）

### 1. 作業中変更のコミット（feat/night-terminator 上）

未コミットの MapOptionsControl.vue（terminator トグルをオーバーレイ群へ移動）をコミット。

### 2. master の upstream 同期（fe51909 を除外した rebase）

```bash
git checkout master
OLD_MASTER=$(git rev-parse master)   # = f62efaf（feat ブランチ載せ替えで使用）
# fe51909 より前の2コミット（5515304, 3456968）を upstream/master へ（detached）
git rebase --onto upstream/master 5515304^ 3456968
NEW_BASE=$(git rev-parse HEAD)
# fe51909 を飛ばし、残り14コミットを載せて master を移動
git rebase --onto "$NEW_BASE" fe51909 master
```

同期検証（すべて満たすこと）:
- `git diff upstream/master master -- src/ package.json package-lock.json vite.config.mjs .npmrc README.md tools/` が**空**
- `src/fa-pro-*-stub.js` が存在しない、`src/fa-pro-fallback/` が存在する

### 3. ドキュメント整合（master 上、1コミット）

- `CLAUDE.md`: 「FontAwesome Pro 事情」節を upstream 機構（postinstall + fallback、詳細は
  README）の説明に書き換え。「ブランチ・PR 運用」のローカルパッチ列挙から stub+alias を除去
  （残るローカルパッチは `.claude/` 環境整備一式のみ）
- `git rm .claude/plans/synthetic-gliding-lecun.md`（PR #43 マージ済みのため完了扱い）

### 4. コンテナ内ビルド検証

```bash
rm -rf node_modules && npm install   # 「NPM_FONTAWESOME_TOKEN not set — using free icon fallback」のログを確認
npm run lint                          # 警告ゼロ
npm run build
```

### 5. feat/night-terminator の載せ替え

```bash
git rebase --onto master "$OLD_MASTER" feat/night-terminator   # 4コミット、衝突なし見込み
npm run lint && npm run build
```

### 6. ホスト側（ユーザー作業）

- `git push --force-with-lease origin master`（コンテナ PAT は push 不可のためホストで）
- `npm run dev` で確認: AZ / Hiking difficulty / Snow depth の i アイコンが表示されること、
  terminator トグルの新位置と動作、既存アイコン（カメラ等）の表示に退行がないこと
- （任意）GitHub 上で `origin/feat/fontawesome-free-fallback` を削除（upstream マージ済み。
  handover 持ち越し todo の解消）

### 7. 後始末

- lessons.md に記録: ドキュメント（CLAUDE.md「free アイコンで代替実装したスタブ」）と実装
  （空パス）の乖離が調査の起点を誤らせかけた件
- 本計画ファイルは完了後に `git rm`

## リスクと対処

- rebase で想定外の衝突が出た場合: 手順2の検証（diff 空）を満たすように解消。判断に迷う衝突は
  ユーザーに提示して停止
- `--force-with-lease` は並行 push があれば失敗して守ってくれる。push 前にユーザー確認済み
  （本計画の承認をもって確認とする。実行自体もユーザーがホストで行う）
