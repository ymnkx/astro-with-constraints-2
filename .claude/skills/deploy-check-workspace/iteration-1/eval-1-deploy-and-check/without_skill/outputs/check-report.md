# チェック結果レポート

- 実施日: 2026-07-06
- 対象: /Users/yamanaka_tomohiro/github/astro-with-constraints-2/data （Astro 6 静的サイト）
- 方針: src は変更せず、検査と修正提案のみ実施

## 実行した検査と判定

| # | 検査 | コマンド | 判定 | 検出数 |
|---|------|----------|------|--------|
| 1 | ESLint | `npm run lint`（eslint src/ --ext .astro,.ts） | PASS | 0 |
| 2 | ビルド | `npm run build`（astro build） | PASS | 0（3ページ生成: /, /page2/, /page3/） |
| 3 | NGワードチェック | `npm run check-ng-words`（build に内包） | PASS | 0 |
| 4 | Stylelint | `npx stylelint "src/**/*.scss" "src/**/*.astro"` | **FAIL** | **37 errors** |
| 5 | プレビュー表示確認 | `astro preview --port 4330` + curl | PASS | 全3ページ + アセット（CSS/JS/SVG/favicon）200 OK |
| 6 | 内部リンク検査 | dist 内 href/src を全件 HTTP 検証 | **FAIL** | **2件の404**（/about, /docs） |
| 7 | Prettier フォーマット | `npx prettier --check "src/**/*.{astro,ts,scss}"` | **FAIL** | **1ファイル** |

補足: `astro check`（型チェック）は `@astrojs/check` 未インストールのため未実施（依存追加が必要になるためスキップ。導入を推奨）。

## 検出した問題の詳細

### 問題1: 内部リンク切れ（404）— 重要度: 高

ビルドされたページに存在しないルートへのリンクがある。

- `src/pages/index.astro:37` → `<TextLink href="/about" text="詳細はこちら" />` … `/about` ページが存在しない
- `src/pages/index.astro:41` → `<TextLink href="/docs" text="ドキュメント" iconName="check" iconPosition="left" />` … `/docs` ページが存在しない

プレビューサーバーで両URLとも 404 を確認済み。
（注: バックエンド組み込み後にこれらのルートが提供される設計であれば問題なし。要確認）

### 問題2: Stylelint エラー 37件 — 重要度: 中

- `scss/load-partial-extension` × 33件: `@forward` に `.scss` 拡張子を付けている
  - `src/components/+.scss`（17件）
  - `src/components/All/+.scss`（15件）
  - `src/components/Second/+.scss`（1件）
- `src/styles/_base/reset.scss` × 4件:
  - 13:5 `property-no-vendor-prefix`（`-moz-text-size-adjust`）
  - 14:5 `property-no-vendor-prefix`（`-webkit-text-size-adjust`）
  - 66:12 `value-keyword-case`（`currentColor` → `currentcolor`）
  - 73:5 `order/properties-order`（`display` を `max-width` より前に）

37件中36件は `--fix` で自動修正可能。

### 問題3: Prettier 未フォーマット 1ファイル — 重要度: 低

- `src/styles/_develop/+.scss` … 改行コードが CRLF（Prettier 期待は LF）

## クリーンだった項目

- ESLint: 指摘なし
- NGワード: dist 内に検出なし
- 全3ページ・全アセット（all.css / second.css / common.js / second.js / icons.svg / favicon.svg）HTTP 200
- SVGスプライト生成正常

## 実行環境メモ

- プレビューはポート 4330 を使用（4321 は他プロセス使用中のため回避）。検査終了後に停止済み。
