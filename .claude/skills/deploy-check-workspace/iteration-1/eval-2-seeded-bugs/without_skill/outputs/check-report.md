# 納品前チェック 詳細レポート

- 対象: `/Users/yamanaka_tomohiro/github/astro-with-constraints-2/data`（Astro プロジェクト）
- 実施日: 2026-07-07
- 制約: src は未変更（修正は提案のみ）／ポート4321は不使用（プレビューは4399で実施後、停止済み）

---

## 1. 実行した検査と判定

| # | 検査 | コマンド / 方法 | 判定 |
|---|------|----------------|------|
| 1 | ESLint | `npm run lint` (eslint src/ .astro,.ts) | PASS（0件） |
| 2 | stylelint | `npx stylelint "src/**/*.scss"` | FAIL（37 errors） |
| 3 | 本番ビルド | `npm run build`（astro build + check-ng-words） | PASS（3ページ生成） |
| 4 | NGワードチェック | `npm run check-ng-words` | PASS（ただし後述の注意あり） |
| 5 | 納品パイプライン | `npm run delivery`（build→copy→prettier→空行削除→filelist） | PASS（完走） |
| 6 | 内部リンク / アセット疎通 | `astro preview --port 4399` + curl 全URL | FAIL（404が4件） |
| 7 | HTML品質（id重複 / alt / TODO残存） | dist・build/htdocs を grep 検査 | FAIL（3件） |
| 8 | ビルドJSのデバッグコード | dist/assets/js を grep | FAIL（console.log 3箇所） |
| 9 | 納品物の不要ファイル | `find build/htdocs` | FAIL（.DS_Store 混入・未使用画像） |
| 10 | SVGスプライト整合性 | 使用シンボル6種 vs icons.svg | PASS（全て存在） |
| 11 | meta / OGP | dist HTML head 目視 + curl | 要修正（og.png 404、og:site_name 仕様疑義） |

---

## 2. 検出した問題（重要度順）

### [A] 納品ブロッカー（7件）

#### A-1. TODO・ダミー文言が本番HTMLに残存
- 場所: `data/src/pages/page2.astro:16` → `build/htdocs/page2/index.html` に出力
- 内容: `<p>TODO: 本番前にダミー画像を差し替える</p>` がそのまま納品物に含まれる。
- 修正案: 該当ブロックを本番用の画像・文言に差し替えて削除。

```astro
<!-- 削除 or 本番画像に差し替え -->
<p>TODO: 本番前にダミー画像を差し替える</p>
<img src="/favicon.svg" width="64" height="64" />
```

#### A-2. img に alt 属性なし（アクセシビリティ違反）
- 場所: `data/src/pages/page2.astro:17`
- 内容: `<img src="/favicon.svg" width="64" height="64" />` に `alt` がない。しかも中身がファビコンSVGの流用（ダミー）。
- 修正案: `<img src="/assets/image/xxx.webp" alt="○○の画像" width="64" height="64" />`

#### A-3. id 属性の重複（HTML仕様違反）
- 場所: `data/src/pages/page2.astro:15` と `:19`
- 内容: `id="dup-check-target"` が同一ページに2回出現。`getElementById` やアンカーの動作が不定になる。
- 修正案: 片方をリネーム（例: `dup-check-target-2`）するか、id 不要なら class に変更。

#### A-4. リンク切れ 3 URL（404 実測確認済み）
- `/about`（`data/src/pages/index.astro` TextLink サンプル）→ 404
- `/docs`（同上）→ 404
- `/recruit/`（`data/src/pages/page2.astro:20`）→ 404
- 修正案: 遷移先ページを用意する、正しいURLに差し替える、またはサンプルリンクなら `#` などプレースホルダーである旨をクライアントと合意する。

#### A-5. OGP画像 og.png が存在しない（404 実測確認済み）
- 場所: `data/src/components/Head.astro` が `https://example.com/og.png` を出力するが、`data/public/` に `og.png` がない。
- 修正案: `data/public/og.png` を配置する（推奨 1200x630）。

#### A-6. console.log がビルド後JSに残存
- 出力先: `dist/assets/js/common.js`（1箇所）、`dist/assets/js/second.js`（2箇所）
- ソース:
  - `data/src/scripts/common.ts:3` … `console.log('common.ts');`
  - `data/src/scripts/second.ts:3` … `console.log('second.ts');`
  - `data/src/components/Second/SecondBlock/SecondBlock.ts:1` … `console.log('SecondBlock.ts');`
- 修正案: 3行を削除。恒久対策として vite の `esbuild: { drop: ['console', 'debugger'] }` を `astro.config.mjs` に追加するか、ESLint に `no-console` を追加。

#### A-7. .DS_Store が納品物に混入
- 場所: `build/htdocs/assets/.DS_Store`（コピー元は `dist/assets/.DS_Store` ← `public/assets/.DS_Store`）
- 注意: `build/filelist.txt`（tree-node-cli）にはドットファイルが表示されないため、納品リスト上は見えないのに実体は入っている。
- 修正案: `scripts/copyDirectory.js` の copySync に filter を追加。

```js
fse.copySync(directory.from, directory.to, {
  filter: (src) => !src.endsWith('.DS_Store'),
});
```

- あわせて `find . -name .DS_Store -delete` で public/src 配下の既存 .DS_Store を掃除。

### [B] 要確認・軽微（6件）

#### B-1. stylelint 37 errors
- `src/styles/_base/reset.scss`: 4件
  - 13-14行: `-moz-text-size-adjust` / `-webkit-text-size-adjust`（property-no-vendor-prefix。リセットCSS由来なら ignore 設定推奨）
  - 66行: `currentColor` → `currentcolor`（value-keyword-case）
  - 73行: `display` は `max-width` より前に（order/properties-order）
- `+.scss` 3ファイル: `@forward "xxx.scss"` の拡張子付き指定 33件（scss/load-partial-extension）。プロジェクト慣習なら `.stylelintrc.json` でルール無効化、そうでなければ `--fix` で一括修正可能。
- 補足: stylelint は npm scripts に組み込まれておらず、CIゲートになっていない。`"lint:css": "stylelint 'src/**/*.scss'"` の追加を推奨。

#### B-2. NGワードチェックが実質機能していない
- `data/scripts/checkNgWords.js` の ngWords がプレースホルダー（`NG_WORD1` / `NG_WORD2`）のまま。
- 今回 A-1 の「TODO」「ダミー」が素通りした。修正案:

```js
const ngWords = [
  { word: 'TODO', message: 'TODOコメントが残っています' },
  { word: 'FIXME', message: 'FIXMEが残っています' },
  { word: 'ダミー', message: 'ダミーテキストが残っています' },
  { word: 'localhost', message: '開発URLが残っています' },
];
```

#### B-3. typo「Accorion Label」
- 場所: `data/src/pages/index.astro`（Accordion サンプルの label）
- `Accorion` → `Accordion`。

#### B-4. 未使用画像 200x200.png が納品物に含まれる
- `public/assets/image/200x200.png` はどのHTML/CSS/JSからも参照されていない（grep で0件）。ダミー画像なら削除、A-1の差し替えに使う予定なら使用する。

#### B-5. project.ts の本番値確認
- `data/src/data/project.ts`: `projectUrl = 'https://example.com'` のまま。OGP の og:url / og:image がすべて example.com になる。納品先の本番URLに更新が必要か確認。

#### B-6. og:site_name にページタイトルが入っている
- `data/src/components/Head.astro` で `og:site_name` に `_title`（「Page2 | サイト名」）を出力。og:site_name はサイト名固定が仕様どおり。修正案: `content={projectName}` に変更。
- 参考（軽微）: `data/src/components/All/Modal/Modal.ts` の Props 名 `butonSelector` は typo（動作影響なし）。また buttonごとに window keydown リスナーを追加しており、モーダルが多いページでは無駄なリスナーが増える。

---

## 3. 検査ログ要約

- ESLint: エラーなし
- astro build: 3ページ生成成功（index / page2 / page3）
- npm run delivery: 完走。build/htdocs + filelist.txt 生成
- URL疎通（preview :4399）:
  - 200: `/` `/page2/` `/page3/` all.css second.css common.js second.js embla-carousel chunk icons.svg favicon.svg
  - 404: `/about` `/docs` `/recruit/` `/og.png`
- プレビューサーバーは検査後に停止済み（ポート4399解放確認済み）
