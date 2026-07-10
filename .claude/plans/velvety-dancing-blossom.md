# Phase 3 PR用ブランチ準備（vue3-phase3）

## Context

Vue 3移行はPhase 1-2まで英語コミット化済みの`vue3-phase1-2`ブランチとしてupstream #45へPR提出済み（マージ待ち）。
Phase 3（地図ライブラリ vue-mapbox → @indoorequal/vue-maplibre-gl 移行）は`feat/vue3-migration`上で完了し、
upstream #44へ完了報告済み。次のPRとして提出できるよう、`vue3-phase1-2`の上にPhase 3のコード変更のみを
英語コミットでcherry-pickした`vue3-phase3`ブランチを用意する（fork越しのスタックPRができないため、
実際のPR提出は#45マージ後だが、ブランチ準備自体は先行してよいと決定済み＝直前handover記載）。

このタスクは新規実装や設計判断を伴わない、既存コミット群の選別・cherry-pick・メッセージ英語化という
機械的なgit操作だが、対象コミットが多く複数ファイルにまたがるため計画化した（コードベース探索は
`git log`/`git show --stat`で完結しており、Explore/Planサブエージェントは不要と判断）。

## 対象コミットの選別（確認済み）

`git log --oneline 89bd351..feat/vue3-migration --reverse`（Phase 2完了コミットの次からHEADまで）で
19コミットを洗い出し、各コミットの`git show --stat`で触っているパスを確認した結果、コード変更9件と
`.claude/`・`CLAUDE.md`のみのdocs/ローカルパッチ10件に完全分離できた（パスの混在なし、Phase1-2と同じ構造）。

**PR対象（9件、cherry-pick順=元のコミット順）**:

| # | hash | 内容 |
|---|------|------|
| 1 | `8fea59a` | MapTilerクラウドスタイルをUUID→完全URL化（C1） |
| 2 | `5452cf5` | vue-mapbox → @indoorequal/vue-maplibre-gl 本体スワップ（C2） |
| 3 | `906e449` | MapDrawをmapSymbol経由でload前addControl（draw初期化競合解消） |
| 4 | `a50e942` | 標高取得失敗時にローディングスピナーが閉じないバグ修正 |
| 5 | `150fd68` | 標高API呼び出しにtimeout追加（永久ハング防止） |
| 6 | `fbee667` | `$buefy.loading.open()`に空オブジェクトを渡しクラッシュ防止 |
| 7 | `5956f8c` | AttributionControl compact表示のリサイズ追従バグ修正 |
| 8 | `7f734ce` | MglMap fragment renderに伴うclass継承・レイアウト対応（C3） |
| 9 | `7977570` | MapDownloadControl非公開API解消・MiniMap bounds不要再フィット解消（C4） |

**除外（ローカルパッチ・docs、10件）**: `a10d6f9` `64f0f76` `643e462` `3048c6b` `81d4304` `c98c5a2`
`58c8a8b` `53d28f2` `db0b757` `4dac3ed` — いずれも`.claude/`（plans/research/lessons由来のbest_practices）
または`CLAUDE.md`のみを触るコミットで、upstream PRには不要。

## 手順

1. `git checkout -b vue3-phase3 vue3-phase1-2`
2. 9件を元の順序で1件ずつ`git cherry-pick <hash>`し、都度`git commit --amend`でコミットメッセージを
   英語化する（`vue3-phase1-2`の既存コミットに合わせ `fix:`/`feat: Vue 3 migration Phase 3 (N/9) - ...`
   の形式に統一）。英語メッセージ案:
   1. `feat: Vue 3 migration Phase 3 (1/9) - switch MapTiler cloud style reference from UUID to full URL`
   2. `feat: Vue 3 migration Phase 3 (2/9) - replace vue-mapbox with @indoorequal/vue-maplibre-gl`
   3. `fix: Vue 3 migration Phase 3 (3/9) - fix MapDraw init race by injecting mapSymbol before map load`
   4. `fix: Vue 3 migration Phase 3 (4/9) - fix loading spinner staying open on elevation fetch failure`
   5. `fix: Vue 3 migration Phase 3 (5/9) - add timeout to elevation API call to prevent indefinite hang`
   6. `fix: Vue 3 migration Phase 3 (6/9) - pass empty object to $buefy.loading.open() to prevent crash on close`
   7. `fix: Vue 3 migration Phase 3 (7/9) - fix AttributionControl compact mode not tracking window resize`
   8. `fix: Vue 3 migration Phase 3 (8/9) - fix class inheritance and layout from MglMap's fragment render`
   9. `fix: Vue 3 migration Phase 3 (9/9) - replace private API in MapDownloadControl, avoid unnecessary MiniMap bounds refit`

   本文（body）は元コミットの技術的説明を英訳して引き継ぐ（Co-Authored-Byは既存`vue3-phase1-2`コミットに
   倣い削除 — Phase1-2の英語コミットも同様に外している）。
3. 検証: `git diff vue3-phase3 feat/vue3-migration -- src package.json package-lock.json vite.config.mjs`
   が空であること（コード内容がPhase3完了時点のfeat/vue3-migrationと完全一致 = 除外したdocsコミットの
   差分だけが残る）
4. コンテナ内で`vue3-phase3`をチェックアウトした状態のまま `npm run lint` と `npm run build` を実行し
   単独ブランチとして警告ゼロ・ビルド成功を確認
5. `feat/vue3-migration`へ戻る（`git checkout feat/vue3-migration`）
6. push・PR提出は行わない（コンテナ内PATはpush不可、かつ#45マージ待ちのゲーティング対象のためこの
   セッションでは実施しない。ブランチはローカルに用意した状態で次回以降の作業に引き継ぐ）

## 検証

- `git diff vue3-phase3 feat/vue3-migration --stat` で残る差分が除外10コミット由来の`.claude/`/`CLAUDE.md`
  のみであることを確認
- `npm run lint`（警告ゼロ）・`npm run build`（成功）を`vue3-phase3`チェックアウト状態で実行
- `git log vue3-phase3 --oneline` で9コミットが英語メッセージになっていることを目視確認
