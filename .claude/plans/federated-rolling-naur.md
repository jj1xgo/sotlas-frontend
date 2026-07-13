# Phase 3 PR 提出準備（vue3-phase3 ブランチへの Phase 3b 積み増し）

## Context

upstream #44 で Manuel 氏から Phase 3 PR の提出許可が出た（"Looks good, please go ahead with the next PR." 2026-07-12）。

調査の結果、CLAUDE.md 記載の一般則（`git rebase --onto upstream/master master feat/<slug>`）は今回適用できないと判明:

- **Phase 1+2 は既に PR #45 として upstream の `vue3` ブランチにマージ済み**（upstream/vue3 = 4e8646a）。Phase 3 PR のベースは `upstream/master` ではなく **`upstream/vue3`**
- 英語コミットメッセージで再構成済みの **`vue3-phase3` ブランチ（Phase 3 の9コミット、ベース 872139f = upstream/vue3 に含まれる）が前セッションで準備済み**。ただし **Phase 3b（`src/mapgl` 自前統合層 = #44 の "option 2"）を含んでいない**
- `feat/vue3-migration` を単純 rebase すると、ブランチ内に混在するローカル専用 docs コミット（`.claude/plans/*`・CLAUDE.md・best_practices 等）が upstream PR に混入する

**方針**: `vue3-phase3` の上に Phase 3b のコード系8コミットを英語メッセージで cherry-pick して PR 用ブランチを完成させる。

## 事前検証済みの事実（Plan agent レビュー + 直接裏取り済み）

- `git diff vue3-phase3 feat/vue3-migration`（`.claude`/`CLAUDE.md`/`.gitignore`/`.claude-container.d` 除外）のファイル集合が、下記8コミットの変更ファイル集合と**完全一致**。8コミットで最終形に到達できる
- **cherry-pick は構造的に衝突しない**: 各コミットの親のコード状態と適用先ツリーが blob 単位で一致（93ea65c のコード部分 = vue3-phase3、親チェーンは直列、間に挟まる 9ad224b は `.claude` のみ）
- 8コミット中、`.claude` 混在は `38071e1` のみ（`src/mapgl/MglMap.js` + `.claude/plans/piped-crafting-quail.md`）。素の cherry-pick だと modify/delete コンフリクトになるため部分適用が必須
- **PR ベースの健全性**: upstream/vue3 tip（4e8646a、PR #45 マージコミット）のツリーは vue3-phase3 のベース 872139f と完全同一（diff 空）。PR diff にノイズは出ない
- 5fed33f 時点の package-lock.json は最終形と同一 blob（d96879b）→ 最終形の `npm ci` が 5fed33f 以降の全中間状態を検証する
- worktree clean、`vue3-phase3` は未 push（origin に存在しない）。git user は既存 vue3-phase3 コミットの author と一致

## 対象コミット（feat/vue3-migration → vue3-phase3 へ、この順で）

| 元 | 種別 | 内容 |
|---|---|---|
| ab3265e | build | @maptiler/sdk 4.0.2 追加（旧ライブラリと共存段階） |
| 545dacf | feat | src/mapgl 自前統合層を追加 |
| ba3b689 | refactor | 消費側コンポーネントを src/mapgl へ切替、maptiler.js 削除 |
| 5fed33f | build | vue-maplibre-gl と直接依存 maplibre-gl を削除 |
| 133890e | refactor | 統合層で不要になった stableBounds ワークアラウンド削除 |
| 148a4b6 | docs | src/mapgl/README.md（設計ドキュメント） |
| fa626b1 | fix | MiniMap アンマウント時の MglGeoJsonSource クラッシュ修正 |
| 38071e1 | fix | dispose で map 参照を undefined 化しない修正（**.claude 混在 → コード部分のみ適用**） |

## 実装手順

### A. コンテナ内: ブランチ構築

1. **前提検証**: `git diff 93ea65c vue3-phase3 -- src package.json package-lock.json vite.config.mjs` が空であること（ab3265e の親 93ea65c と vue3-phase3 のコード部分が同一 = cherry-pick がクリーンに当たる前提）を確認
2. `git checkout vue3-phase3` → `git status` で状態確認
3. ab3265e〜fa626b1 の7コミットを1つずつ `git cherry-pick -n <hash>` → 下記の英語メッセージで `git commit`（1つずつ結果確認、コンフリクト時は停止して報告）
4. 38071e1 のみ: `git restore --source=38071e1 --staged --worktree -- src/mapgl/MglMap.js` → `git commit`（.claude 混在の除去。このファイルの全変更が 38071e1 由来のため安全）。コミット後 `git rev-parse HEAD:src/mapgl/MglMap.js` が `d36929a8b7f86920f69ad46e8ce98e4f96ac4b1a`（= feat/vue3-migration の同ファイル blob）であることを確認
5. **ツリー一致検証**: `git diff HEAD feat/vue3-migration -- . ':(exclude).claude' ':(exclude)CLAUDE.md' ':(exclude).gitignore' ':(exclude).claude-container.d'` が**空**であること
6. `npm ci && npm run build && npm run lint`（警告ゼロ）
7. 作業ブランチを `feat/vue3-migration` に戻す（コンテナ内の継続作業ブランチ。push 対象の vue3-phase3 はホスト側から参照可能）

**vue3-phase3 checkout 中の注意（Plan agent レビュー指摘）**:
- `.claude/`（settings.json・hooks 含む）・`CLAUDE.md` はこのブランチに存在せず、checkout でディスクから消える（正当なブランチ内容差。git status には出ない）。**この間は git 操作のみ行い、Write/Edit を伴う作業はしない**（hook スクリプト不在で失敗するため）
- vue3-phase3 の `.gitignore` は `.claude` を無視しないため、未追跡の `.claude/plans/` 等が untracked に現れる。**`git add -A` / `git commit -a` は使用禁止**（cherry-pick -n がステージした index のみをコミットする）

### B. 英語コミットメッセージ（8件）

既存 vue3-phase3 の9コミットは `(x/9)` 連番済みのため、**書き換えず**、新規8件は連番なしの `Vue 3 migration Phase 3 - <summary>` 形式とする（方針転換は #44 スレッドで合意済みのため番号の不揃いは許容。既存9コミットの履歴書き換えリスクを避ける）。
既存 vue3-phase3 コミットに合わせ **Co-Authored-By trailer は付けない**（upstream 提出用ブランチの前例に従う。ハーネス既定からの意図的逸脱）。

1. `build: Vue 3 migration Phase 3 - add @maptiler/sdk 4.0.2 as the map engine`
   （#44 option 2 の準備、旧ライブラリと共存でビルド維持）
2. `feat: Vue 3 migration Phase 3 - add src/mapgl, an in-repo Vue integration layer on the MapTiler SDK`
   （vue-maplibre-gl のビルド前 TS ソースを移植元に、SOTLAS が使う10コンポーネント種のみ実装。popup DOM マウント・style.load 再登録・mapSymbol load 前解決の契約は移植元と同一）
3. `refactor: Vue 3 migration Phase 3 - switch map components from vue-maplibre-gl to src/mapgl`
   （6コンポーネントは import 変更のみ。Map/MiniMap は transformRequest 撤去・getMaptilerSessionId() 経由へ。maptiler.js は SDK 内蔵 transform の完全下位互換のため削除）
4. `build: Vue 3 migration Phase 3 - remove @indoorequal/vue-maplibre-gl and the direct maplibre-gl dependency`
5. `refactor: Vue 3 migration Phase 3 - drop the MiniMap stableBounds workaround`
   （MglMap の bounds watcher が同値ガード内蔵のため不要化）
6. `docs: Vue 3 migration Phase 3 - add a design doc for src/mapgl`
7. `fix: Vue 3 migration Phase 3 - guard MglGeoJsonSource teardown against a disposed map`
8. `fix: Vue 3 migration Phase 3 - keep the map reference alive through dispose()`
   （upstream vue-maplibre-gl の dispose 契約に合わせ、undefined 化せず isInitialized で管理）

※ 本文は元コミットの日本語本文を英訳して付ける。実装時に全文を組み立てる。

### C. ホスト側（ユーザー作業）

8. `git push origin vue3-phase3`（新規ブランチ、force 不要）
9. GitHub Web UI で PR 作成: `manuelkasper/sotlas-frontend` の **base: `vue3`** ← `jj1xgo:vue3-phase3`
   - タイトル案: `Vue 3 migration - Phase 3 (map library replacement on the MapTiler SDK)`（PR #45 のタイトルスタイルに準拠）
   - 本文はこちらで下書きを用意しユーザー確認後に使用（upstream 宛のため非署名、#44 スレッドに実在する用語のみ使用）

### D. PR 作成後

10. sotlas-frontend issue #7 へ状況更新コメント（PR URL 付き。文面レビュー→承認後に投稿。署名 `— <実行モデル名>`）

## 検証（完了条件）

- A-5 のツリー一致 diff が空（PR 内容 = Manuel に見せた compare のコード部分、の実物証明）
- A-6 の build / lint 成功（警告ゼロ）
- PR 作成後、GitHub 上の Files changed が A-5 で確認した22ファイルと一致することを目視確認

## リスクと対処

- **cherry-pick コンフリクト**: blob 検証済みのため理論上クリーン。万一発生したら止まって報告（自動解決しない）
- **vue3-phase3 checkout 中の環境変化**: `.claude/` 消失・untracked 出現は上記「注意」のとおり運用で吸収（異常ではない — この現象を環境異常と誤認しない）
- **npm ci の失敗**: `postinstall`（install-fontawesome-pro.mjs）は `NPM_FONTAWESOME_TOKEN` 未設定時 free フォールバックで成功する設計。失敗した場合は PR 内容起因か環境要因かを切り分けてから報告

## 実装担当

全タスク Sonnet（機械的な git 操作・定型検証・文面英訳）。コンフリクト等の判断が発生した場合のみ Fable サブエージェントへ委譲。
