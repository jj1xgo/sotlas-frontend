# Phase 3b 検証結果への対応: MiniMap unmount クラッシュ修正 + 検証クローズ

## Context

Phase 3b（自前統合層 src/mapgl）のホスト側ブラウザ検証（Claude in Chrome）で NG 2件・未確認数件が
報告された。原因調査（Explore 2系統 + コード監査）の結果:

1. **項目2「スタイル切替でフルリロード・ルート線消失」→ 回帰ではない（対応不要）**。
   `src/store.js:150-157` の `setMapType` が `window.location.reload()` を呼ぶのは master と
   一字一句同一の意図的実装（コメント "Force a reload now to avoid problems with layers added
   by draw etc."）。draw データはもともと永続化されておらず（master 同一）、reload で消えるのは
   既存挙動。オプションレイヤー設定は `localStorage('mapOptions')` で永続化されており標準経路では
   初期値に戻らない。`/mapsession` POST が切替毎に増えるのも reload 由来の既存挙動。
   検証項目2の前提（in-place setStyle）がアプリの実装と食い違っていた。src/mapgl の style.load
   再登録機構はアプリの UI からは到達しない（将来の in-place 切替・wrapper 契約として保持）
2. **項目4「MiniMap unmount クラッシュ」→ 本物の回帰バグ（本計画で修正）**。
   Vue は親の beforeUnmount を子より先に実行するため、`MglMap.dispose()`（MglMap.js:91-100）が
   `map.value = undefined` にした後、子 `MglGeoJsonSource` の `onBeforeUnmount` 先頭
   （MglGeoJsonSource.js:38）が **無条件に** `map.value.off('style.load', addSource)` を呼び
   TypeError。Vue Router が遷移を中断し MiniMap が白化する。ルート線（= MglGeoJsonSource）を
   持つ MiniMap ページからの遷移で必ず発生
3. 監査の結果、同種のガード欠落は他に無い: controls.js は `isInitialized`、layers.js は
   `isLoaded` で先に短絡（どちらも dispose が `map.value` 破棄前に false 化）、
   MglMarker/MglPopup は map 参照なし

### 追記: 1回目修正（`?.` 追加のみ）は対症療法止まりだった

1行修正（`map.value.off` → `map.value?.off`）を適用・コミット（`fa626b1`）したが、ホスト側
再検証で **別文言のエラーで再クラッシュ**（`Cannot destructure property 'type' of 'vnode' as it
is null`、`unmountComponent` 系スタック）。上位モデル（Fable）へのサブエージェント諮問で再調査した
結果（upstream 実物 `map.component.ts`/`useSource.ts` を GitHub raw + npm tarball から再取得し
比較、実際に `src/mapgl` の実コード + 実 vue-router + カスタムレンダラーで再現スクリプトを実行して
検証）:

- 真因は `MglMap.js` の `dispose()` が独自に追加した `map.value = undefined`。upstream の同等
  dispose は map 参照を undefined 化せず、子の「dispose 済み map への `.off()` 無条件呼び出し」
  という暗黙契約を守っている。SOTLAS 版がこの1行を足したことで契約が壊れていた
- 2回目検証の「vnode is null」は、本アプリに `app.config.errorHandler` が未登録のため、1回のエラー
  で unmount 中の vnode 木が不整合なまま残り、以降の**全ての**遷移で二次エラーが連鎖する症状
  （Vue 3.5.39 のソース上で実証済み）。検証がクリーンなセッション（フルリロード）でなかった疑いが
  濃厚（1回目修正自体は無害だが不十分ではなく、的外れではなかった）

## 修正内容

**`src/mapgl/MglMap.js` の `dispose()` から `map.value = undefined` を削除**（upstream 準拠）。
ただし `map.value` を永久に truthy にすると `if (!map.value) return` という多重 dispose ガードが
無効化されるため、ガード条件を `isInitialized.value` ベースに変更する:

```js
function dispose () {
  if (!isInitialized.value) return
  map.value.getCanvas().removeEventListener('webglcontextlost', restart)
  isInitialized.value = false
  isLoaded.value = false
  boundEvents.forEach(([type, handler]) => map.value.off(type, handler))
  boundEvents.length = 0
  map.value.remove()
}
```

1回目修正の `MglGeoJsonSource.js:38` の `?.` はそのまま残す（無害、対症療法として二重の安全網）。

## コミット

1. `fix: MiniMapアンマウント時のMglGeoJsonSourceクラッシュを修正`（`?.` 追加、済み・`fa626b1`）
2. `fix: MglMapのdispose処理でmap参照をundefined化しないよう修正`（本命の修正、新規コミット）

## 検証

**コンテナ内**: `npm run lint`（警告ゼロ）→ `npm run build`

**ホスト側**（**フルリロードしたクリーンなセッションで実施**すること。HMR越しや、同一タブで
先に一度クラッシュした後の状態で検証すると vnode 木汚染の残骸で誤判定しうる。Claude in Chrome は
MiniMap 検知が不安定な可能性の指摘あり + lessons 32 の合成イベント制約もあるため、ユーザー手動を
推奨）:
1. **クラッシュ再現シナリオの解消確認（必須）**: ブラウザを一度フルリロードしてから、ルート表示の
   ある Summit 詳細ページ（例 /summits/JA/YN-001）→ 別ページ（More > New Photos 等）へ遷移。
   コンソールに TypeError が出ず遷移が完了すること。ページロード時点からのコンソール全量を確認する
2. **Activator ページ「Show Map」（再確認）**: 前回「7秒スピナー」報告は検知アーティファクトの
   可能性あり。手動で /activators/OK2PDT 等の Show Map を開き、地図表示＋無限スクロールで地図が
   動かないことを確認
3. **残りの未確認項目（ユーザー判断で実施）**: GPX save/open・PNG ダウンロード（ダウンロードを
   伴うため手動）。オプションレイヤー初期化の報告は標準経路では説明できないため、再発したら
   その時の操作手順を記録

## 実装後（本修正とは別ステップ、handover 継続項目）

1. 検証 OK → `.claude/plans/breezy-pondering-candle.md` を `git rm`（Phase 3b 完了）
2. 削除後に Edit/Write が誤ブロックされないか確認 → dotclaude-ops#4 / sotlas-frontend#15 へ続報
3. upstream #44 完了報告（英語・非署名、内容はユーザーと相談）
4. **次タスク（優先度上げ済み・ユーザー要望）**: 地図オプションアイコンの展開時位置ずれ
   （MapOptionsControl.vue、C3 fragment render 由来疑い）の調査・修正
5. 本計画ファイルは完了時に `git rm`

## 実装体制

1行修正のため Sonnet 実装。実装フェーズ移行時に /model 切替を提案する。
