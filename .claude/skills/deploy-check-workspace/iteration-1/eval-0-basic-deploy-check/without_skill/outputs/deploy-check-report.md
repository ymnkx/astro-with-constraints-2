# デプロイ前チェック 詳細レポート

- 実施日: 2026-07-06
- 対象: /Users/yamanaka_tomohiro/github/astro-with-constraints-2/data（Astro v6.1.8 / static build）
- 環境: Node v24.15.0（.node-version 24.15.0 と一致）/ npm 11.12.1
- ブランチ状態: ワーキングツリー クリーン（HEAD: 21c0194 develop へのマージ）

## 実行したチェックと判定

| # | チェック | コマンド | 判定 | 問題数 |
|---|---------|---------|------|--------|
| 1 | ESLint | `npm run lint` | PASS | 0 |
| 2 | stylelint | `npx stylelint "src/**/*.scss"` | **FAIL** | 37 エラー |
| 3 | TypeScript 型チェック | `npx tsc --noEmit` | **FAIL** | 6 エラー |
| 4 | 本番ビルド | `npm run build`（astro build） | PASS | 0（3ページ生成） |
| 5 | NGワードチェック | `check-ng-words`（build に含む） | PASS | 0 |
| 6 | Prettier フォーマット | `npx prettier --check "src/**/*.{astro,ts,scss}"` | **FAIL** | 1 ファイル |
| 7 | preview スモークテスト | `astro preview --port 4400` + HTTP 検査 | **FAIL** | 404 ×2 |
| 8 | npm audit（本番依存） | `npm audit --omit=dev` | **FAIL** | 6 件（high 3） |
| 9 | markuplint | 実行不可 | **SKIP** | 設定はあるが未インストール |
| 10 | ビルド成果物検査 | dist/ 内容・OGP・不要ファイル確認 | **WARN** | 3 件 |

サーバーはポート 4400 で起動し、チェック後に停止済み（ポート 4321 は未使用）。

---

## 詳細

### 1. ESLint — PASS
`src/` の .astro / .ts にエラーなし。

### 2. stylelint — FAIL（37 エラー、うち 36 は --fix で自動修正可）
- `scss/load-partial-extension` ×33: `@forward` に `.scss` 拡張子を付けている
  - `src/components/+.scss`（17件）、`src/components/All/+.scss`（15件）、`src/components/Second/+.scss`（1件）
- `src/styles/_base/reset.scss`:
  - 13:5, 14:5 `property-no-vendor-prefix`（`-moz-text-size-adjust` / `-webkit-text-size-adjust`）
  - 66:12 `value-keyword-case`（`currentColor` → `currentcolor`）
  - 73:5 `order/properties-order`（`display` を `max-width` より前へ）
- 注: reset.scss の text-size-adjust ベンダープレフィックスは意図的な可能性が高い。ルール除外（stylelint-disable か .stylelintrc の ignoreProperties）を検討。

### 3. TypeScript（tsc --noEmit）— FAIL（6 エラー）
- `src/components/All/Carousel/Carousel.ts:9` — `OptionsType` が未定義（**実質バグ**。esbuild が型を剥がすためビルドは通るが型安全でない）
  - 修正案: `import type { EmblaOptionsType } from 'embla-carousel';` して `const options: EmblaOptionsType = ...`
- `plugins/svg-sprite.ts` — `node:fs` / `node:path` の型が見つからない（`@types/node` 未インストール）、`svg-sprite` の型宣言なし、暗黙 any ×2
  - 修正案: `npm i -D @types/node @types/svg-sprite`
- 注: `@astrojs/check` 未導入のため `astro check` は実行不可。CI で型検査するなら導入推奨。

### 4-5. ビルド + NGワード — PASS
- 3 ページ生成（/, /page2/, /page3/）、907ms。
- checkNgWords: dist にエラーなし。

### 6. Prettier — FAIL（1 ファイル）
- `src/styles/_develop/+.scss` が未フォーマット。`npx prettier --write` で解消。

### 7. preview スモークテスト — FAIL（リンク切れ 2 件）
ページ HTTP ステータス:
- `/` 200, `/page2/` 200, `/page3/` 200
- CSS/JS/SVGスプライト/favicon すべて 200
- **`/about` → 404**（`src/pages/index.astro:37` の `<TextLink href="/about" ...>`）
- **`/docs` → 404**（`src/pages/index.astro:41` の `<TextLink href="/docs" ...>`）

該当ページが存在しない。ページ作成・リンク先変更・リンク削除のいずれかが必要。

### 8. npm audit（--omit=dev）— FAIL
- 6 件（high 3 / moderate 2 / low 1）
- vite 7.0.0–7.3.3（astro 経由）: launch-editor NTLMv2 ハッシュ漏えい、`server.fs.deny` バイパス（いずれも Windows 起点・開発サーバー系）
- postcss: `</style>` 未エスケープ XSS
- 静的ビルドの成果物自体への直接影響は限定的だが、`npm audit fix` で解消可能。

### 9. markuplint — SKIP
- `.markuplintrc` は存在するが `markuplint` / `@markuplint/astro-parser` が devDependencies に無く実行不可。
- 修正案: `npm i -D markuplint @markuplint/astro-parser` して `npx markuplint "src/**/*.astro"` を lint スクリプトに追加。

### 10. ビルド成果物検査 — WARN（3 件）
1. **`dist/assets/.DS_Store` が混入**。元は `public/assets/.DS_Store`（gitignore 済みだが実ファイルが存在し、public 経由で dist にコピーされる）。`find public -name .DS_Store -delete` を build/delivery 前に実行するか copyDirectory.js で除外。
2. **OGP がプレースホルダー**: `src/data/project.ts` の `projectUrl = 'https://example.com'` のまま。og:url / og:image / twitter:* が example.com を指す。
3. **og.png が存在しない**: `Head.astro:8` が `{projectUrl}/og.png` を参照するが `public/og.png` が無い。デプロイ先で OGP 画像が 404 になる。

### その他の確認事項（問題なし）
- `projectDirectory = '/'`、base/outDir 整合 OK
- `lang="ja"`、title / meta description あり
- Node バージョン一致、git ワーキングツリー クリーン
