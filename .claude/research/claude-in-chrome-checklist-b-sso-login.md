# Claude in Chrome 向け指示書 B — SSOログイン一式

Vue 3移行のうち、SSOログイン状態が前提の項目をまとめた指示書。ログインを1回行い、ログインした
まま以下を順番に確認できる（毎回ログインし直さずに済む構成）。

## 前提・注意事項

1. `http://localhost:5173/` にアクセスできる状態にする（ホスト側 `npm run dev`）
2. G5はCLAUDE.md記載の既知制約により、**`sotl.as`本番ドメインでのみログイン可能**
   （メンテナ提供のサブパス環境が必要、issue #44で合意済み）。ローカル`localhost:5173`では
   「Loginボタンが表示されクリックでリダイレクトが発生する」ところまでしか確認できない
3. **⚠️ 実データ投稿への注意**: 3・4番のAdd Spot/Add Alertは、実行すると**本番のSOTAwatch
   データベースに実際に投稿され、他のSOTA運用者に公開されます**。フォームの入力・バリデーション・
   エラー表示の確認は問題ありませんが、最終的な送信ボタン（Add Spot/Add Alert）を押すかどうかは
   慎重に判断してください。押す場合はコメント欄に「TEST」等テスト投稿と分かる文言を入れることを
   推奨します（削除可能かも事前に確認してください）
4. **⚠️ 5番の写真アップロードも同様**、実行すると本番のサミットページに写真が公開されます

## 項目一覧

### 1. G5: ログイン→ログアウト

- 手順: NavBar右上の「Login」ボタンをクリック
- 期待結果: Keycloak（SSO）のログイン画面へリダイレクトされる。ログイン完了後、`/`（またはログイン
  前にいたページ）へ戻り、NavBarのLoginボタンがコールサイン表示のドロップダウンに変わる
- ドロップダウンを開いて確認:
  - 「My activator page」リンク → `/activators/<自分のコールサイン>` へ遷移するか
  - 「Manage account」→ Keycloakのアカウント管理画面が開くか
  - 「Logout」→ ログアウトされ、再度Loginボタン表示に戻るか（ログアウトはこの手順の最後、
    8番の後に実施してください）

### 2. R11 / S9: Activation詳細のQSOList（ログイン後）

- 手順: 任意のActivator詳細ページ（例: `/activators/OK2PDT`）→ Logged activationsテーブルの
  QSOs列の数字をクリック
- 期待結果: 未ログイン時は「Please log in to view QSOs.」ダイアログが出ることをコンテナ内で確認済み。
  ログイン時は代わりに`ModalQSOList`モーダルが開き、そのアクティベーションのQSO一覧（コールサイン・
  周波数・モード・時刻等）が表示されることを確認してください
- モーダルはCancel/閉じるボタンで正常に閉じることも確認

### 3. B3 / S9: EditSpotのFrequencyInput・投稿フォーム

- 手順: `/spots/sotawatch` → 右上「Add」ボタン → EditSpotモーダルが開く
- 確認項目:
  - Callsignにログイン中のコールサインが自動入力されるか
  - Summit reference欄に `JA/NN-001` 等と入力→サミット名が下に表示されるか（Nearbyドロップダウンも
    位置情報許可があれば動作確認）
  - Frequency欄（FrequencyInput、周波数手入力）に `144.30` 等と入力→値が正しく反映されるか
    （B2/B3で修正した`modelValue`/`update:modelValue`契約の確認ポイント）
  - QRT/Testボタンを押すとFrequency/Mode欄が無効化されるか
  - Modeボタン群（CW/SSB/FM等）が選択できるか
  - 「Add Spot」ボタンの活性化条件（Callsign・Summit・Frequency・Mode全て入力で活性化）
  - **送信するかは上記「注意事項」参照**。送信した場合は一覧に反映されるか、Cancelでモーダルが
    閉じるかも確認

### 4. B4 / S9: EditAlertのfreqModeタグ入力・投稿フォーム

- 手順: `/alerts` → 右上「Add」ボタン → EditAlertモーダルが開く（モーダル自体の開閉は
  コンテナ内で確認済み）
- 確認項目:
  - Frequency-Mode(s)欄に `7.030-cw` と入力してEnter/カンマ→タグとして追加されるか
    （b-taginputの`update:model-value`契約の確認ポイント）
  - `7.030-cw, 14.250-ssb` のようにカンマ区切りで一度に入力→複数タグに分割されるか
    （`onFreqModeInput`のsplit処理）
  - タグのサジェスト（周波数入力後にモード候補が出るか）
  - Activation date（datepicker）・ETA（Local/UTC切替）の入力
  - 「Add Alert」ボタンの活性化条件
  - **送信するかは上記「注意事項」参照**

### 5. X2: 写真アップロード（EditPhoto/PhotosUploader）

- 手順: 自分が投稿したアクティベーションのあるSummitページ、または`/summits/<自分の関連サミット>`の
  写真セクションからアップロードUIを開く（vue-filepond、ログイン時のみ表示）
- 確認項目:
  - ファイル選択・ドラッグ&ドロップでプレビューが表示されるか
  - アップロード進捗表示、完了後にギャラリーへ反映されるか
  - アップロード後、写真をクリックしてEditPhotoモーダルを開き、Description・Date/Time・
    Latitude/Longitude・Direction・「Use as cover photo」チェックボックスが編集・保存できるか
  - **実行するかは上記「注意事項」参照**

### 6. G6（補足）: ログイン中はTurnstileが表示されないこと

- 確認項目: ログイン済み状態では画面下部にTurnstileウィジェットが表示されない
  （`v-if="!authenticated && ..."`の条件通り）

### 7. B6（補足）: ログイン関連のダイアログ・トースト

- Alert/Spotの削除確認ダイアログ、投稿失敗時のエラーダイアログ（`$buefy.dialog.alert`）が
  正しく表示されるか（意図的にエラーを起こす場合は無効な値を試す等）

### 8. G5: ログアウト

- 手順: 1番で確認したドロップダウンの「Logout」を押す
- 期待結果: ログアウトされNavBarがLoginボタンに戻る。再度ページをリロードしてもログイン状態が
  残っていないこと（`wantSso`のlocalStorage/sessionStorageクリアの確認）

## 完了後

結果メモを`.claude/research/`配下か会話で報告してください。コンテナ内セッションが
`vue3-verify-checklist.md`へ反映します。
