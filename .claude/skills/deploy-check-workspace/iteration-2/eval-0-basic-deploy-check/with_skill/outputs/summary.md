# デプロイ前チェック 最終サマリー

## 判定: ❌ 要修正（error 25 / warning 52 / info 12）

ビルドは成功（3ページ、NGワードチェックもパス）だけど、errorがあるので `npm run delivery` はまだ実行できないにゃ。
詳細はプロジェクトルートの `deploy-check-report.md` を見てにゃ。

## 検査結果一覧

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator（HTML構文） | ❌ | 16 | 0 |
| lighthouse（perf/seo/bp） | ✅ 全ページ・全カテゴリ100点 | 0 | 0 |
| accessibility（axe + 静的） | ❌ indexスコア87 | 6 | 3 |
| link-integrity（リンク/アセット/dist衛生） | ❌ | 3 | 11 |
| project-specific（案件固有2項目） | ✅ | 0 | 0 |
| src-check（ESLint/stylelint/prettier） | ⚠️ | 0 | 38 |

検査対象: `/`, `/page2/`, `/page3/` の全3ページ（省略なし）。プレビューは port 4322 使用（4321は別プロセス使用中）。

## 修正提案（優先度順・すべてsrc側、適用は承認後）

### 1. Navigation を aria-hidden → inert に（error 15件を一括解消）

`src/components/All/Navigation/Navigation.astro` + `Navigation.ts`:

```diff
- <div class="sample-navigation_contents" data-role="contents" aria-hidden="true">
+ <div class="sample-navigation_contents" data-role="contents" inert>
- <button class="sample-navigation_trap" type="button" data-role="trap" aria-hidden="true"></button>
+ <div class="sample-navigation_trap" tabindex="0" data-role="trap"></div>

# Navigation.ts: close時 setAttribute('inert','') / open時 removeAttribute('inert') に変更
```

### 2. 内部リンク切れ（error 2件）

`src/pages/index.astro:37,41` の `/about` `/docs` → 既存ページに差し替え or ページ作成。

### 3. .DS_Store 混入（error 1件）

`find . -name .DS_Store -not -path './node_modules/*' -delete` + `.gitignore` に追加（dist/assets に混入中、リポジトリ内に10件）。

### 4. アクセシビリティ error（6件）

- カルーセルのドット: `CarouselPagination.ts:9` に `aria-label="スライドNへ移動"` 追加 + `CarouselPagination.scss:10` で当たり判定24px化
- `page2.astro:14` / `page3.astro:9`: `<Heading as="h1">` に変更（h1不在）
- `index.astro:57`: モーダルトリガーを `<Button as="button" type="button">` に（spanでキーボード操作不能）
- `Accordion.astro:8`: `aria-label="summary"` を削除（可視テキストと不一致）
- `Modal.astro:11`: close ボタンに `type="button"` 追加

### 5. console.log 残存 3箇所（warning）

`src/scripts/common.ts:3` / `src/scripts/second.ts:3` / `src/components/Second/SecondBlock/SecondBlock.ts:1` を削除。
恒久対策: `astro.config.mjs` に `vite: { esbuild: { drop: ['console', 'debugger'] } }`。

### 6. OGPプレースホルダー 9件（warning）

`src/data/project.ts:3` の `projectUrl = 'https://example.com'` を本番URLに変更すれば全件解消。
ただし `public/og.png` が存在しないので画像の追加も必要にゃ（現状だと本番で og:image 404）。

### 7. stylelint/prettier 38件（warning・自動修正可）

```bash
npx stylelint "src/**/*.scss" "src/**/*.astro" --fix   # 36/37件が自動修正可
npx prettier --write src/styles/_develop/+.scss
```

reset.scss の vendor-prefix 2件は互換維持なら `stylelint-disable-line` 推奨。

## 次のアクション

1〜4（error）を修正 → 再ビルド + html-validator / accessibility / link-integrity を再実行 → ✅ になったら `npm run delivery` で納品物生成、の流れにゃ。修正はどれから適用するか指示してほしいにゃ。
