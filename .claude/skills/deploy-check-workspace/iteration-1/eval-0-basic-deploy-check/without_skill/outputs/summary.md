# デプロイ前チェック サマリー

判定: **このままのデプロイは非推奨**（Blocker 2 件）だにゃ。ビルド自体は通るにゃ。

## チェック結果一覧

| チェック | 判定 | 問題数 |
|---------|------|--------|
| ESLint | PASS | 0 |
| stylelint | FAIL | 37 |
| TypeScript (tsc) | FAIL | 6 |
| 本番ビルド (astro build) | PASS | 0 |
| NGワードチェック | PASS | 0 |
| Prettier | FAIL | 1 ファイル |
| preview スモークテスト（port 4400） | FAIL | 404 ×2 |
| npm audit（本番依存） | FAIL | 6 件（high 3） |
| markuplint | SKIP | 未インストール |
| ビルド成果物検査 | WARN | 3 件 |

**合計: 問題 49 件 + 警告 3 件 + 実行不可 1 件**

## Blocker（デプロイ前に必須）

1. **リンク切れ**: トップページの `/about` と `/docs` が 404
   - `src/pages/index.astro:37` `<TextLink href="/about" text="詳細はこちら" />`
   - `src/pages/index.astro:41` `<TextLink href="/docs" text="ドキュメント" ... />`
   - → ページを作るか、リンク先修正 or 削除
2. **OGP がプレースホルダー + 画像なし**
   - `src/data/project.ts` の `projectUrl = 'https://example.com'` のまま
   - `Head.astro` が参照する `og.png` が `public/` に存在しない
   - → 本番 URL に変更し、`public/og.png` を配置

## 修正提案（src は未変更・提案のみ）

```bash
# 自動修正できるもの
npx stylelint "src/**/*.scss" --fix      # 37件中36件解消
npx prettier --write "src/styles/_develop/+.scss"
npm audit fix                            # vite/postcss の脆弱性6件
find public -name .DS_Store -delete      # dist への .DS_Store 混入防止
```

```ts
// src/components/All/Carousel/Carousel.ts:9 — OptionsType が未定義（型バグ）
import type { EmblaOptionsType } from 'embla-carousel';
const options: EmblaOptionsType = { containScroll: false };
```

```bash
# 型チェック環境の整備（tsc の残りエラー解消）
npm i -D @types/node @types/svg-sprite
# markuplint を動かすなら
npm i -D markuplint @markuplint/astro-parser
```

- reset.scss の `-webkit-text-size-adjust` 等は意図的なら `.stylelintrc.json` で `property-no-vendor-prefix` に ignore を追加する方がよいにゃ。
- CI に `astro check`（要 `@astrojs/check`）+ stylelint + リンクチェックを入れると再発防止になるにゃ。

## 備考

- スモークテストは port 4400 で実施、サーバーは停止済み（4321 は不使用）。
- Node v24.15.0 は `.node-version` と一致、git ワーキングツリーはクリーン。
- 詳細は同ディレクトリの `deploy-check-report.md` を参照。
