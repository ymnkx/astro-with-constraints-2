---
name: deploy-check
description: Astroプロジェクトをビルドし、ビルド前のsrcとビルド後の生成物(dist)の両方を複数観点で検査してデプロイ可否レポートと修正提案を出す。検査項目はHTML構文(html-validate)、パフォーマンス/SEO(Lighthouse)、アクセシビリティ(axe-core)、内部リンク/アセット整合性、dist衛生(不要ファイル/console.log/OGP)、案件固有チェックリスト、srcの静的検査(ESLint/stylelint/prettier)。決定的チェックはメインループでスクリプト実行しトークンを節約、ブラウザ検査のみsubagent。全体を見るfullモードとmain差分だけ見るquickモードがある。ユーザーが「デプロイ前チェックをして」「デプロイとチェックをして」「デプロイして」「納品して」「納品前確認」「公開前チェック」「ビルドして検証して」「変更したところをチェック」「deploy check」「品質チェック」などと言ったとき、またはデプロイ・納品・ビルド成果物の検証という文脈のときは必ずこのスキルを使うこと。デプロイや納品だけを頼まれた場合もチェックを先に実行する（納品処理の自動実行はしない）。
---

# Deploy Check

Astroプロジェクトをビルドし、生成されたHTMLを複数の観点から並列検査して、デプロイ可否の判定レポートと修正提案を出すスキル。

## 実行環境の前提

- 作業ディレクトリは**プロジェクトルート**（`package.json` と `.node-version` がある、この `.claude/` の親ディレクトリ）。以降のコマンド・パスはすべてプロジェクトルート基準。
- Node.js は `.node-version` に書かれたバージョンを使う。nodenv がプロジェクトルート配下で自動適用するので、**コマンドは必ずプロジェクトルート（またはその配下）で実行する**こと。最初に `node --version` が `.node-version` の内容と一致するか確認し、不一致ならプロジェクト外で実行していないかを疑う。subagentにもこの確認を指示する。

## モード（トークン節約）

チェック範囲を2モードから選ぶ。デフォルトはユーザーの言い回しで判断する。

- **quick（差分モード）**: `main` ブランチとの差分ファイルだけに検査を絞る。「変更したところをチェック」「軽く確認」「作業中の確認」や、明らかに小さな変更のあとの確認はこちら。トークン・時間が大幅に減る。
- **full（全体モード）**: 全ファイル・全ページを検査。「納品前チェック」「公開前チェック」「全体をチェック」「デプロイして／納品して」など、リリースがかかる場面はこちら。**判断に迷ったら full**（見落としのリスクを避ける）。

quickモードでも、共通部品（components/layouts/styles/scripts/data）が変更されていれば HTML系検査は自動的に全ページへ広がる（`static-checks.mjs` が判定する）。差分の基準を変えたい場合はユーザーに確認する。

## 全体フロー

1. **ビルド** — 失敗したらここで打ち切り、エラー内容を報告
2. **準備** — ページ一覧の収集とプレビューサーバー起動
3. **静的検査（メインループで直接実行）** — `static-checks.mjs` 1本で決定的チェック5種をまとめて実行（subagentを使わない＝トークン節約）
4. **ブラウザ検査（subagent 2本だけ並列）** — Lighthouse と アクセシビリティ。ページに影響する変更が無ければ省略
5. **レポート** — 結果を集約してMarkdownレポートを出力
6. **修正提案** — 検出された問題をsrcファイルにマッピングして具体的な修正案を提示

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
3. **quickモードなら先に静的検査（Phase 3）を回して `targetPages`（影響ページ）を確定させる**。影響ページが 0（HTMLに影響しない変更のみ）なら Phase 4 のブラウザ検査は丸ごと省略できる。
4. ブラウザ検査が必要なら、プレビューサーバーをバックグラウンドで起動する:
   ```bash
   npm run preview
   ```
   デフォルトURLは `http://localhost:4321`。起動ログから実際のポートを確認すること。
5. URLマッピング: `dist/<projectDirectory>/page2/index.html` → `http://localhost:4321<projectDirectory>page2/`
6. fullモードでページ数が多い場合（>5）は代表ページを選ぶ: トップ + テンプレート種別ごとに1ページ。省略したページは必ずレポートに明記する（黙って間引かない）。

## Phase 3: 静的検査（メインループで直接実行、subagent不要）

決定的チェック5種（HTML構文 / ESLint / stylelint / prettier / リンク整合性+dist衛生）は、LLMのsubagentを使わず**1本のスクリプトをメインループで直接実行**する。これがトークン節約の主眼。

```bash
# full モード（全ファイル）
node .claude/skills/deploy-check/scripts/static-checks.mjs

# quick モード（main との差分だけ。基準refは引数で変更可）
node .claude/skills/deploy-check/scripts/static-checks.mjs --base main
```

スクリプトは結果JSONを stdout に出す。**サマリー（`summary`）だけをまず読む**（各検査の error/warning 件数）。詳細（`checks.*.issues`）は、レポートで具体的に触れる問題や修正提案を書くときに必要な分だけ参照する（全文をコンテキストに載せない）。

出力JSONの要点:
- `mode` / `base` / `changedSrc` / `allPagesAffected` / `targetPages` — モードと差分の情報。`targetPages` は次のPhase 4でLighthouse/a11yに渡す対象ページ。
- `summary.<検査>` — `{ error, warning, skipped }` の件数。
- `checks.<検査>.issues[]` — `severity` / `page` or `file` / `location` / `rule` / `message`。
- `checks.stylelint.fixableCount` — `--fix` で自動修正できる件数。

severityの考え方（スクリプトが付与済み）: ビルドは通っている前提なので lint 系は基本 **warning**。html-validate の `no-dup-id`・不正ネスト、リンク切れ・アセット欠落・`.DS_Store` 混入・`debugger` 残存は **error**。stylelint の大量指摘は 1 件ずつ列挙せず件数 + `fixableCount` で報告する。

もし `checks.<検査>.error`（toolError）が入っていたらそのツールが正しく動いていない（多くはNodeバージョン違い）。`node --version` を確認して対処する。

## Phase 4: ブラウザ検査（subagent 2本だけ並列）

ブラウザが要る2検査だけを **同一メッセージ内で並列に** subagentで起動する（Agentツール、general-purpose）。**影響ページ（Phase 3 の `targetPages`）が空なら丸ごと省略**してよい。quickモードでは `targetPages` のURLだけを渡す（全ページに広がっている場合を除く）。

**結果はファイル経由で受け渡す**（subagentの完了通知は親に届かないことがあるため）:
- 各subagentに「結果を `<スクラッチパッド>/deploy-check-results/<検査名>.md` に保存。冒頭に `status: done` と error/warning 件数」と指示する
- 親はこのディレクトリをポーリング（Bashで存在確認、60秒間隔目安）して2ファイル揃うのを待つ。10分揃わなければ揃った分で集約し未完了を明記する

各subagentへの共通指示: 「所感ではなく、検出した問題を `severity`(error/warning/info), `page`, `location`, `message`, `suggestion` の形で全件列挙。問題ゼロならその旨を明記。srcは変更しない。作業ディレクトリはプロジェクトルート（nodeバージョンが `.node-version` と一致することを確認）。」

### A. lighthouse（パフォーマンス + SEO）

`references/lighthouse.md` を読んでから実行するよう指示。渡された対象ページURLに対し performance / seo / best-practices のスコアと上位の改善項目を収集する。

### B. accessibility（アクセシビリティ）

`references/accessibility.md` を読んでから実行するよう指示。Lighthouseのaccessibilityカテゴリ（内部でaxe-coreが動く）+ 機械検査で拾えない静的チェック（見出し階層・altの質・lang属性など）。

## Phase 4.5: 案件固有チェック

`checks/project-specific.md` のチェックリストを読み、各項目をdistのHTML実物に対して検証する。項目が grep で機械的に確認できるものばかりなら**メインループで直接**確認してよい（subagent不要）。判断が要る項目が多い場合のみ軽いsubagentに回す。ファイルが空またはテンプレのままなら「案件固有チェックは未設定」とレポートに記載する。

## Phase 5: レポート出力

プレビューサーバーを停止してから、静的検査（Phase 3）+ ブラウザ検査（Phase 4）+ 案件固有（Phase 4.5）の結果を `.report/` 配下のレポートファイルに集約する。チャットにはサマリーだけを書き、詳細はレポートファイルに書く。

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
（6検査分の行。静的検査=html-validate / eslint / stylelint / prettier / link-integrity はstatic-checks.mjsの結果、ブラウザ検査=lighthouse / accessibility はsubagentの結果、加えてproject-specific。モードと省略ページもここに明記する）

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

## Phase 6: 修正提案

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
