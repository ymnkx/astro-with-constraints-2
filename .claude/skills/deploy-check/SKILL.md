---
name: deploy-check
description: Astroプロジェクトをビルドし、ビルド前のsrcとビルド後の生成物(dist)の両方を役割別のsubagentで並列検査してデプロイ可否レポートと修正提案を出す。検査項目はHTML構文(html-validate)、パフォーマンス/SEO(Lighthouse)、アクセシビリティ(axe-core)、内部リンク/アセット整合性、案件固有チェックリスト、srcの静的検査(ESLint/stylelint/prettier)。ユーザーが「デプロイ前チェックをして」「デプロイとチェックをして」「デプロイして」「納品して」「納品前確認」「公開前チェック」「ビルドして検証して」「deploy check」「品質チェック」などと言ったとき、またはデプロイ・納品・ビルド成果物の検証という文脈のときは必ずこのスキルを使うこと。デプロイや納品だけを頼まれた場合もチェックを先に実行する（納品処理の自動実行はしない）。
---

# Deploy Check

Astroプロジェクトをビルドし、生成されたHTMLを複数の観点から並列検査して、デプロイ可否の判定レポートと修正提案を出すスキル。

## 実行環境の前提

- 作業ディレクトリは**プロジェクトルート**（`package.json` と `.node-version` がある、この `.claude/` の親ディレクトリ）。以降のコマンド・パスはすべてプロジェクトルート基準。
- Node.js は `.node-version` に書かれたバージョンを使う。nodenv がプロジェクトルート配下で自動適用するので、**コマンドは必ずプロジェクトルート（またはその配下）で実行する**こと。最初に `node --version` が `.node-version` の内容と一致するか確認し、不一致ならプロジェクト外で実行していないかを疑う。subagentにもこの確認を指示する。

## 全体フロー

1. **ビルド** — 失敗したらここで打ち切り、エラー内容を報告
2. **準備** — ページ一覧の収集とプレビューサーバー起動
3. **検査** — 役割別subagentを**1メッセージで並列起動**（ビルド前のsrcとビルド後のdistの両方を検査する）
4. **レポート** — 結果を集約してMarkdownレポートを出力
5. **修正提案** — 検出された問題をsrcファイルにマッピングして具体的な修正案を提示

納品処理（`npm run delivery`）はこのスキルでは**自動実行しない**。判定が ✅ のときにレポートの「次のアクション」で `npm run delivery` を案内する。ユーザーがデプロイ・納品まで明示的に求めていて判定が ✅ の場合のみ、実行してよいか確認してから実行する（⚠️/❌ では実行せず修正提案を提示して止まる）。

## Phase 1: ビルド

```bash
npm run build
```

- `npm run build` は `astro build` に加えて NGワードチェック(`check-ng-words`)も実行する。
- ビルドが失敗したら以降のフェーズには進まず、エラーを解析して原因のsrcファイルと修正案を報告して終了する。
- 出力先は `dist/<projectDirectory>`。`projectDirectory` は `src/data/project.ts` で定義されている（`/` ならdist直下）。

## Phase 2: 準備

1. `src/data/project.ts` を読んで `projectDirectory` を確認する。
2. 検査対象ページを列挙する: `find dist -name "*.html"`
3. プレビューサーバーをバックグラウンドで起動する（Lighthouse系の検査に必要）:
   ```bash
   npm run preview
   ```
   デフォルトURLは `http://localhost:4321`。起動ログから実際のポートを確認すること。
4. URLマッピング: `dist/<projectDirectory>/page2/index.html` → `http://localhost:4321<projectDirectory>page2/`
5. ページ数が多い場合（>5）は代表ページを選ぶ: トップ + テンプレート種別ごとに1ページ。省略したページは必ずレポートに明記する（黙って間引かない）。

## Phase 3: 役割別subagentによる並列検査

以下のsubagentを **同一メッセージ内で並列に** 起動する（Agentツール、general-purpose）。各subagentには「検査対象のHTMLファイル一覧 or URL一覧」を必ず伝える。

**結果の受け渡しはファイル経由にする**（subagentの完了通知は親に届かないことがあるため、通知に依存しない）:

- 各subagentに「結果を `<スクラッチパッド>/deploy-check-results/<検査名>.md` に必ず保存すること。冒頭に `status: done` と error/warning 件数を書くこと」と指示する
- 親は起動後、このディレクトリをポーリング（Bashで存在確認、60秒間隔目安）して6ファイル揃うのを待って集約する。10分待っても揃わない場合は、揃った分で集約し未完了の検査をレポートに明記する

各subagentへの共通指示: 「所感ではなく、検出した問題を `severity`(error/warning/info), `page`, `location`, `message`, `suggestion` の形で全件列挙すること。問題ゼロならその旨を明記すること。srcは変更しないこと。作業ディレクトリはプロジェクトルート（nodeバージョンが `.node-version` と一致することを確認）。」

### 1. html-validator（HTML構文チェック）

`references/html-validate.md` を読んでから実行するよう指示する。html-validate（純Node製、npxで実行）でdist内の全HTMLを検査する。

### 2. lighthouse（パフォーマンス + SEO）

`references/lighthouse.md` を読んでから実行するよう指示する。プレビューサーバーのURL一覧を渡す。performance / seo / best-practices の3カテゴリのスコアと、上位の改善項目（opportunities）を収集する。

### 3. accessibility（アクセシビリティ）

`references/accessibility.md` を読んでから実行するよう指示する。Lighthouseのaccessibilityカテゴリ（内部でaxe-coreが動く）+ 機械検査では拾えない項目の静的チェック（見出し階層、altの内容の妥当性、lang属性など）。

### 4. link-integrity（リンク/アセット整合性 + dist衛生）

バンドル済みスクリプトを実行させる:

```bash
node .claude/skills/deploy-check/scripts/check-links.mjs dist
```

検出対象: 内部リンク切れ / 参照CSS・JS・画像の欠落 / アンカー切れ / 納品物への不要ファイル混入（`.DS_Store` 等）/ 本番JSの `console.log`・`debugger` 残存 / OGPのプレースホルダーURL・og:image欠落。静的納品で最も事故が起きやすい項目群なので必ず実行する。スクリプトの結果に加えて、subagentは各issueに対応するsrc側の修正提案を付けて報告する。

### 5. project-specific（案件固有チェック）

`checks/project-specific.md` のチェックリストを読み、各項目をdistのHTML実物に対して検証させる。チェックリストは案件ごとに編集して拡張する運用（詳細はそのファイル冒頭に記載）。ファイルが空またはテンプレのままなら「案件固有チェックは未設定」とレポートに記載する。

### 6. src-check（ビルド前データの静的検査）

distだけでなくビルド前のsrcも検査する。ブラウザ不要なので軽い。実行するもの:

```bash
npm run lint                                      # ESLint (.astro/.ts)
npx stylelint "src/**/*.scss" "src/**/*.astro"    # SCSS/スタイル
npx prettier --check "src/**/*.{astro,ts,scss}"   # フォーマット
```

severityの割り当て: ビルドは通っている前提なので基本は **warning**（コード品質）。ただし実行時バグを示唆するもの（未定義変数の参照、存在しないimport、ESLintのerrorレベル指摘など）は **error** に格上げする。stylelintの大量指摘は `--fix` で自動修正可能かどうかを添えて件数ベースで報告する（1件ずつ列挙しない）。

## Phase 4: レポート出力

プレビューサーバーを停止してから、全subagentの結果を `.report/` 配下のレポートファイルに集約する。チャットにはサマリーだけを書き、詳細はレポートファイルに書く。

レポートの保存先とファイル名:

- 保存先ディレクトリは**プロジェクトルート直下の `.report/`**（無ければ作成する。`.gitignore` 済みの一時成果物）。
- ファイル名は `deploy-check-report-<yyyymmdd>-<連番>.md` 形式にする（例: `deploy-check-report-20260708-1.md`）。
  - `<yyyymmdd>` はチェック実行日。
  - `<連番>` は同じ日付の既存レポートを見て決める。`.report/deploy-check-report-<yyyymmdd>-*.md` が無ければ `1`、あれば既存の最大番号 + 1。同じ日に複数回チェックしても上書きせず追記されていくようにする。

レポートは必ずこの構成にする:

```markdown
# デプロイ前チェックレポート

- 実行日時 / 対象コミット・ブランチ（gitがあれば）
- 検査対象: Nページ（省略したページがあれば明記）

## 判定: ✅ デプロイ可 / ⚠️ 条件付き可 / ❌ 要修正

## サマリー
| 検査 | 結果 | error | warning |
|---|---|---|---|
（6つのsubagent分の行: html-validator / lighthouse / accessibility / link-integrity / project-specific / src-check）

## 検出された問題（severity降順）
各問題: 対象ページ / 場所 / 内容 / 修正案（対応するsrcファイル付き）

## Lighthouseスコア一覧
ページ×カテゴリの表

## 案件固有チェック結果
チェックリスト項目ごとの ✅/❌
```

判定基準: error が1件でもあれば ❌、warningのみなら ⚠️、どちらもなければ ✅。Lighthouseスコアは performance/seo/accessibility いずれかが 90 未満で warning 扱い（閾値は `checks/project-specific.md` で上書き可能）。

## 納品処理（delivery）の扱い

このスキルは検査までが仕事で、`npm run delivery`（`build/htdocs` への納品物生成）は自動実行しない。

- 判定 ✅ → レポートの「次のアクション」に「`npm run delivery` で納品物を生成できます」と案内する
- ユーザーが「納品して」「デプロイして」のように納品まで明示的に求めていた場合: 判定 ✅ ならユーザーに実行確認を取ってから delivery を実行、⚠️/❌ なら実行せず修正提案を提示して止まる
- このプロジェクトに外部サーバーへのアップロード工程はない（`delivery` = 納品物生成まで）。それ以上のデプロイ手段を求められたらユーザーに確認すること

## Phase 5: 修正提案

レポート内の各問題について、**distではなくsrc側の修正**を提案する。distを直接直しても次のビルドで消えるため。

- dist内のHTMLの問題 → 該当する `src/pages/` `src/components/` `src/layouts/` のファイルを特定して具体的な修正コード（diff形式）を示す
- どのsrcファイル由来か特定するには、distのHTML内の特徴的なクラス名やテキストで `src/` をgrepする
- 修正は提案止まりにして、ユーザーの承認を得てから適用する
- 修正を適用した場合は再ビルド + 該当検査のみ再実行して、直ったことを確認する

## トラブルシューティング

- `npm run preview` が起動しない → `npx serve dist -l 4321` で代替
- Lighthouseがchromeを見つけられない → `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` を付けて実行
- npxの初回ダウンロードが遅い → 正常。タイムアウトを長め(300s+)に設定する
- node のバージョンが `.node-version` と一致しない → プロジェクトルート外で実行している可能性が高い。プロジェクトルートに移動してから再実行する
