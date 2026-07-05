# FontAwesome Pro → free 自動フォールバック（upstream PR + issue #23 コメント）

## Context

- 自リポジトリ issue #4「upstream issue #23 へ FA-free 方式を共有するか検討」の実行計画。
- ユーザー方針: **「フォーク元オーナー（トークン保持者）の環境ではそのまま Pro で動き、Pro 未設定の人には free アイコンでそれなりに動く、誰にとっても嬉しいもの」** にしてから共有する。中身のない共有（現状の空白スタブ）は信頼を損ねるため先に実装を仕上げ、コメントと PR を首尾一貫させる。
- **メンテナ Manuel Kasper 自身が issue #23（2023-10）で「`NPM_FONTAWESOME_TOKEN` 未設定時に free へ自動フォールバックするビルドプロセスが理想」と発言済み**。本計画はまさにその実装であり、受け入れ見込みは高い。
- 先行者 kwesthaus の fork branch は「pro import の全コメントアウト」でアイコンが全消失する不完全解（PR 未提出）。本 PR ではコメント・PR 本文で先行の試みとしてクレジットする。

## 検証済みの事実（設計根拠）

- 根本原因: upstream `.npmrc` にチェックインされた `//npm.fontawesome.com/:_authToken=${NPM_FONTAWESOME_TOKEN}` は、変数未設定だと npm が config 展開エラーで **install 自体を即死させる**。
- pro から import している全アイコン（main.js が唯一の import 元、far 48種 + fas 31種、duotone/light 等は不使用）のうち、**free（5.15.4）に全く存在しないのは 8 種のみ**。他は free-regular または free-solid に同名で存在。
- Buefy は `defaultIconPack: 'far'`。テンプレートは `['far'|'fas', 'kebab-name']` 形式 → **prefix + iconName の登録名を維持すれば main.js・コンポーネントは一切無変更で済む**。
- `optionalDependencies` 案は不採用: npm (arborist) は依存ツリー構築時の packument 取得失敗（401）を optional でも許容しない（バージョンにより挙動不安定）。認証付きレジストリとの組み合わせは信頼できない。

## アーキテクチャ

**PR ブランチは `upstream/master` ベースの `feat/fontawesome-free-fallback`**（fork のローカルパッチを含めない。CLAUDE.md のブランチ運用どおり）。

1. **`.npmrc`**: FA 2行を削除（トークン未設定での install 即死を解消。トークン保持者のレジストリ設定は postinstall スクリプトが CLI 引数で渡すため不要になる）
2. **`package.json`**:
   - `dependencies` から `@fortawesome/pro-regular-svg-icons`・`pro-solid-svg-icons` を削除、`@fortawesome/free-regular-svg-icons: ^5.15.4` を追加
   - `"postinstall": "node tools/install-fontawesome-pro.mjs"` を追加
   - `package-lock.json` をトークンなしで再生成（pro の npm.fontawesome.com 参照が消える）
3. **`tools/install-fontawesome-pro.mjs`**（新規、既存の `tools/` ディレクトリに配置）:
   - 再帰ガード env が立っていれば即 exit 0
   - pro パッケージが resolve 可能なら exit 0（インストール済み）
   - `NPM_FONTAWESOME_TOKEN` 未設定なら「free フォールバックを使う」旨を1行 log して exit 0
   - トークンあり → `npm install --no-save --no-package-lock --no-audit --no-fund '@fortawesome/pro-regular-svg-icons@^5.15.4' '@fortawesome/pro-solid-svg-icons@^5.15.4'` を `--@fortawesome:registry=https://npm.fontawesome.com/` と `--//npm.fontawesome.com/:_authToken=...` の CLI config 付きで実行
   - **失敗したら exit 1 で大声で落ちる**（トークンがあるのに free へ黙って劣化させない。本番デプロイの見た目が無言で変わる事故を防ぐ）
4. **`src/fa-pro-fallback/regular.js` / `solid.js`**（新規）: pro パッケージと同じ export 名を持つ**実体入りシム**
   - free に同名がある → re-export（far 参照だが free-regular に無いものは free-solid の実体を `{ ...icon, prefix: 'far' }` で付け替え。solid スタイルになるが描画される）
   - free に無い 8 種 → 近似アイコンの実体を `prefix`/`iconName` 上書きで割り当て（下表）
5. **`vite.config.mjs`**: `createRequire(import.meta.url)` で `@fortawesome/pro-regular-svg-icons/package.json` の resolve を試み、**不可のときだけ** pro 2パッケージを上記シムへ alias（+ どちらのモードかを 1 行 log）。FA5 パッケージは exports map 非対応なので package.json 直接 resolve が確実
6. **`README.md`**: 「FontAwesome Pro はオプション。トークンがあれば自動で Pro、なければ free フォールバック」の短い節を追加

→ **main.js と全コンポーネントは 1 行も変更しない**。オーナーは env にトークンがあるので `npm ci && build` の見た目が現状と完全一致。トークンなしは install が通り free アイコンで描画される。

### 欠落8アイコンの代替（使用箇所を確認済み）

| pro アイコン | 用途（実使用箇所） | free 代替（fas 実体を prefix/iconName 上書き） |
|---|---|---|
| faMountains (far/fas) | サミット数表示・検索見出し | faMountain（単峰） |
| faExchange (far) | QSO 数表示 | faExchangeAlt（ほぼ同形） |
| faArrowsH (far) | 近隣サミット距離 | faArrowsAltH（ほぼ同形） |
| faExpandArrows (far) | ポップアップ「More」 | faExpandArrowsAlt（ほぼ同形） |
| faLocation (far/fas) | GPS トラックリンク | faLocationArrow |
| faBookUser (far) | Callbooks ボタン | faAddressBook |
| faCameraHome (fas) | Webcams（地図オプション・マーカー） | faVideo |
| faVolume (fas) | 音量 ON（faVolumeMute と対） | faVolumeUp |

## 実装ステップ

**今セッション（実装と機械的検証まで）**:

1. `git fetch upstream` → `feat/fontawesome-free-fallback` を `upstream/master` から作成
2. 上記 1〜6 を実装（シムは現行 master の `src/fa-pro-*-stub.js` の export リストを流用して書き直す）
3. トークンなしで `package-lock.json` 再生成
4. 検証（下記「検証（コンテナ内）」）・コミット
5. 自リポジトリ issue #4 へ経過コメントを投稿（署名 `— <モデル名>`）: 実装済みブランチ名・検証結果・**残作業（ユーザーのホスト側ブラウザ確認 → PR 文案・#23 コメント文案の作成 → push・PR 作成・コメント投稿）**を明記し、後続セッションが再開できる記録にする

**ユーザーのホスト側動作確認後（別途指示を受けてから）**:

6. PR 説明文（英語）と issue #23 コメント文案（英語・**署名なし**）を作成しユーザーへ提示
7. ユーザーがホスト側で push → GitHub Web UI で upstream へ PR 作成 → #23 へコメント投稿（コンテナ PAT は外部 repo へ投稿不可のため、いずれもユーザー操作）
8. 自リポジトリ issue #4 へ完了コメント。クローズは PR の帰趨が出てから

## 検証（コンテナ内）

- `rm -rf node_modules && npm ci`（トークンなし）→ postinstall がフォールバック通知を出して成功すること
- `npm run build` 成功・`npm run lint` 警告ゼロ
- `node tools/install-fontawesome-pro.mjs` を `NPM_FONTAWESOME_TOKEN=dummy` で実行 → **明示的に exit 1 で失敗する**こと（fail-loud の確認。コンテナの egress 制限で npm.fontawesome.com に届かない場合もエラー経路の検証にはなる）
- シム export と全テンプレート参照（`['far'|'fas', '...']`・b-icon）の突き合わせ grep で取りこぼしゼロを確認
- ビルド成果物（dist）に代替アイコンの SVG パスが入っていることを spot check
- **ホスト側（フェーズ間ゲート）**: ユーザーが `npm run dev` でブラウザ確認（代替8種と far→solid 劣化の見た目が許容範囲か）。**この確認が済むまでステップ6以降（PR 文案・#23 コメント）には進まない**
- **検証できないこと（PR に正直に明記）**: 実トークンでの Pro 取得経路。メカニズム（CLI config での install）は公開 registry で検証するが、npm.fontawesome.com への実認証はトークン保持者（メンテナ）に確認を依頼する

## PR / コメントの整合性

- コメントは「#23 で Manuel が望んだ automagic fallback を実装した。PR #xx を参照。free に無い 8 アイコンは近似で代替、トークンがあれば従来どおり Pro」と PR 内容だけを述べる（誇張しない・未検証事項を明記）
- kwesthaus の先行ブランチに言及しクレジット
- upstream への投稿は**署名なし**（CLAUDE.md ルール）

## 補足

- fork の `master` に乗っている現行 stub パッチは本 PR とは独立に温存。PR がマージされたら `master` を upstream に rebase してローカルパッチを廃止
- 計画承認後、実装フェーズは Sonnet へ復帰可能（設計判断は本計画で完了。実装中に設計変更が必要になったら再委譲）
