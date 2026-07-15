# Phase 5 — Vue 3 移行 総仕上げ 実装計画

## Context

Vue 3 移行（feat/vue3-migration）の最終フェーズ。Phase 1〜4 は upstream PR #45〜47 として `vue3` ブランチへマージ済み（`e35af4e` で確認済み）。残作業は (1) `$parent.close()` 残存 6 箇所の解消、(2) 検証チェックリストの消化、(3) upstream issue #44 への人間向け移行総括コメント、(4) README 陳腐化修正の別小 PR（今セッションで「含める・別小PR」とユーザー確定）。テスト基盤の新規提案は #44 では行わず「残課題として言及のみ」（同じく確定）。

eslint（vue3-essential 警告ゼロ）と bulma 整合（bulma 1.0.4 + buefy 3.0.8）は解消済みのため、現状維持確認のみ。

## 設計判断（確定済み）

**T1 の方式: 子が `$emit('close')`、呼び出し元が `@close` でフラグを畳む。**

根拠（Explore で確認済みの実物契約）:
- 3 コンポーネントとも programmatic モーダルではなく `<b-modal>` の**スロット経由**で開かれている（`$buefy.modal.open` はリポジトリ内 0 件）
- Buefy 3 の `Modal.vue`（`node_modules/buefy/src/components/modal/Modal.vue`）はスロット経路では `@close` を自動配線せず、`close` をスコープドスロットプロパティとして渡すのみ。`$parent` が BModal に解決されるかは Vue 3 で未検証・保証なし
- 呼び出し元は既に `v-if` + フラグ（または `v-model:active`）で開閉状態を所有しており、`$emit('close')` 方式は状態の所有権を動かさない最小変更。ModalQSOList 型（自己完結型）への変更は状態所有権の移動を伴うため不採用

## タスク（実装は Sonnet。委譲想定タスクなし）

### T1: `$parent.close()` 解消（コード変更の本体）

子コンポーネント 3 ファイル:
- `src/components/EditAlert.vue` — template `@click="$parent.close()"` → `@click="$emit('close')"`、script `this.$parent.close()` → `this.$emit('close')`、`emits: ['close']` 追加
- `src/components/EditSpot.vue` — 同上
- `src/components/EditPhoto.vue` — 同上。ただし既存の未宣言 emit があるため `emits: ['close', 'photoEdited']`

呼び出し元 5 ファイル・7 箇所（子要素に `@close="<既存フラグ> = false"` を追加。フラグ名は各ファイルの実物で確認して合わせる）:
- `src/components/AlertsList.vue:73,76`（EditAlert / EditSpot）
- `src/views/Summit.vue:126,129`（EditAlert / EditSpot）
- `src/components/SpotsList.vue:75`（EditSpot）
- `src/views/Spots.vue:24`（EditSpot）
- `src/components/SummitPhotos.vue:16`（EditPhoto → `@close="isEditorActive = false"`）

`<b-modal>` 自体の `@close`（Escape キャンセル経路）は現状のまま温存する。

### T1b: `<b-modal>` の `v-model:active`/`:active="true"` 破損パターンの修正（T1検証中に発見・ユーザー承認済みの追加スコープ・2段階で発覚）

**発見内容（1段階目）**: Buefy 3 の `<b-modal>` は `active` prop を持たず `modelValue` のみ（`node_modules/buefy/src/components/modal/Modal.vue:75-177`、`props: { modelValue: Boolean, ... }`。`active` という名前の prop は grep で 0 件）。`destroyed: !(this.modelValue || this.renderOnMounted)` が初期値を決める。

**発見内容（2段階目・訂正）**: 6箇所を `v-model:active="X"` に修正後も実機で開かず再調査した結果、`v-model:active` という構文自体が誤りと判明。Vue 3 の `v-model:active` は `:active` prop + `@update:active` イベントへ展開されるが、Modal コンポーネントには `active` という名前の prop も `update:active` イベントも存在しない（`modelValue`/`update:modelValue` のみ）。正しくは **`v-model="X"`**（引数なし、デフォルトで `modelValue` にバインド）。`AlertsList.vue` で `v-model="isEditAlertActive"` に修正し実機（Playwright MCP screenshot）でモーダル表示・フォーム動作を確認済み。

**影響範囲**（`grep -rn '<b-modal' src` で全数確認済み、**10箇所全て**が `v-model:active` または `:active="true"` の誤用）:
- `src/components/AlertsList.vue:72,75`（EditAlert/EditSpot）
- `src/views/Summit.vue:125,128`（EditAlert/EditSpot）
- `src/components/SpotsList.vue:74`（EditSpot）
- `src/views/Spots.vue:23`（EditSpot）
- `src/components/SummitPhotos.vue:15`（EditPhoto）
- `src/components/ModalQSOList.vue:2`
- `src/components/SwisstopoInfo.vue:2`
- `src/components/BasemapAtInfo.vue:2`

**修正方法**: 全箇所を `v-model:active="X"` → `v-model="X"` に置換（`v-if` + `:active="true"` 型だった6箇所は既にT1bの初回修正で `v-if` 削除・`v-model:active` 化済みのため、残作業は `v-model:active` → `v-model` の引数除去のみ）。子コンポーネント側の `@close="X = false"`（T1で追加済み）はそのまま維持。

### T2: チェックリスト消化・更新（`.claude/research/vue3-verify-checklist.md`）

1. **陳腐化記述の更新**: X6（vue-match-media）・S5（vue-lazy-youtube-video）は Phase 1 で前倒し置換済みの示唆あり（同ファイル 169 行目のメモ）。コード実物（package.json・import 箇所）で置換済みを確認してから「完了」へ更新
2. **コンテナ内消化**: 非地図ページ（G1〜G9・R1〜R21 の大半・S 系・B5/B6 回帰確認）を Playwright MCP で消化。T1 の動作検証（モーダル開く → Cancel で閉じる）もここに含める
3. **ホスト側依頼分**: 地図ページ（M 系、Turnstile 制約）・SSO ログイン必須機能（Alert/Spot の実投稿、G5）・X7 再接続は、コンテナから検証不能な項目としてユーザーへ依頼する。依頼時は「コンテナで通る可能性もあるがTurnstile/SSO制約で不確実」と不確実性を明示する（グローバル原則18）

### T3: 機械的チェックの現状維持確認

`npm run lint`（警告ゼロ）と `npm run build`（成功）を T1 後に実行。

### T4: Phase 5 PR 提出準備

- base は **upstream `vue3` ブランチ**（PR #47 まで実マージ済みを `git log upstream/vue3` で確認済み。lesson 46/47 に従い実装時にも再確認）
- `feat/vue3-migration` にはローカル専用 docs コミットが混在するため、単純 rebase でなく **Phase 5 のコード変更コミットのみを cherry-pick** した PR 用ブランチを作る
- コミットメッセージ: 既存進行中ブランチ `feat/vue3-migration` 上は日本語継続、PR 用ブランチへの cherry-pick 時もコミット内容はコードのみなので、upstream 提出分は英語で書き直す（Phase 1〜4 PR と同じ運用）
- push・PR 作成はホスト側（ユーザー作業）。`git push` が出力する fork 基準 URL を案内し、base を `vue3` へ明示切替（lesson 48）

### T5: upstream issue #44 への移行総括コメント（PR 提出後）

- 内容: 何が変わったか（自前モジュール一覧・`src/mapgl/README.md` の場所）／何が変わっていないか（Options API・構造維持）／既知の残課題（**自動テスト不在は事実として言及のみ**、基盤提案はしない）／リポジトリ内ドキュメント追加の要否をメンテナに尋ねる
- 投稿前に `gh issue view 44 -R manuelkasper/sotlas-frontend` で実文面を確認し、スレッドに実在する用語のみ使う（内部呼称「Phase 5」等の流用禁止、lesson 45）。upstream 投稿のため非署名
- **文面はユーザー承認必須**。コンテナ PAT は upstream への書込不可の可能性が高いため、承認済み文面を提示しホスト側で手動投稿してもらう（fail-closed）

### T6: README 陳腐化修正の別小 PR（upstream/master ベース）

- `master` から `feat/readme-refresh`（仮）を新規に切る（新規ブランチのため**英語コミット**規約を適用）
- 修正内容: `npm run test` 節の削除（scripts に実在しない）／`npm run serve` の説明を `vite preview` の実態に合わせ修正し `npm run dev` を追記／vue-cli Configuration Reference リンクの削除
- 提出前に `git rebase --onto upstream/master master feat/readme-refresh` 相当でローカルパッチ除去（ただし master 直下から切るので通常は不要。実データで確認）
- push・PR 作成はホスト側（ユーザー作業）

## 実施順序

T1 → T3 → T2（T1 検証込み）→ T4 → T5 → T6（T6 は独立のため隙間時間でも可）

## 検証（原則2・9）

- `npm run lint` / `npm run build` がクリーン
- Playwright MCP（コンテナ内）: `/alerts`・`/spots`・summit 詳細ページで各モーダルを開き、Cancel クリックで閉じることをスクリーンショットで確認。EditPhoto は summit 詳細の写真編集経路（要ログインなら開閉のみホスト依頼へ回す）
- 送信 → 自動クローズ経路（`this.$emit('close')` 側）は SSO ログインが要るため、コンテナで不能ならホスト側検証項目としてチェックリストの依頼分に含める
- チェックリスト更新結果はファイル diff で確認

## 計画ファイル運用

承認後・実装着手前に本ファイルをコミット（日本語コミット、ローカルパッチ扱い）。Phase 5 完了時に `git rm`。
