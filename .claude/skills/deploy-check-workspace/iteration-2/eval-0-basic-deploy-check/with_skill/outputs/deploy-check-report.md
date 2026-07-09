# デプロイ前チェックレポート

- 実行日時: 2026-07-07 13:33〜13:45 (JST)
- 対象コミット・ブランチ: `develop` / `21c0194`（未コミットの変更あり）
- 検査対象: 3ページ（`/`, `/page2/`, `/page3/`）— 全ページ検査、省略なし
- ビルド: `npm run build` 成功（astro build + NGワードチェックともにパス）
- プレビュー: `http://localhost:4322`（4321 は別プロセス使用中のため 4322 を使用）

## 判定: ❌ 要修正

error 25件 / warning 52件 / info 12件。errorがあるためデプロイ不可。
ただし error の大半は少数のsrcファイル修正で一括解消できる（下記参照）。

## サマリー

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator | ❌ | 16 | 0 |
| lighthouse (perf/seo/bp) | ✅ | 0 | 0 |
| accessibility | ❌ | 6 | 3 |
| link-integrity | ❌ | 3 | 11 |
| project-specific | ✅ | 0 | 0 |
| src-check | ⚠️ | 0 | 38 |
| **合計** | ❌ | **25** | **52** |

## 検出された問題（severity降順）

### error（25件 → 実質7つの修正で解消）

#### E1. Navigation の aria-hidden 配下にフォーカス可能要素（html-validate `hidden-focusable` ×15、全3ページ）
- 対象: 全ページ共通ナビ（closeボタン / ナビリンク×3 / trapボタン）
- 場所: `dist/*/index.html` の `.sample-navigation_contents[aria-hidden="true"]` 内
- 原因src: `src/components/All/Navigation/Navigation.astro`（11行目のコンテナ、27行目のtrapボタン）+ `src/components/All/Navigation/Navigation.ts`（46-47, 83-85行目のトグル処理）
- 修正案: `aria-hidden` トグルを `inert` 属性に置換。**この1コンポーネント修正で15件すべて解消。**

```diff
# Navigation.astro
- <div class="sample-navigation_contents" data-role="contents" aria-hidden="true">
+ <div class="sample-navigation_contents" data-role="contents" inert>
  ...
- <button class="sample-navigation_trap" type="button" data-role="trap" aria-hidden="true"></button>
+ <div class="sample-navigation_trap" tabindex="0" data-role="trap"></div>

# Navigation.ts（close時）
- elements.bg?.setAttribute('aria-hidden', 'true');
- elements.contents?.setAttribute('aria-hidden', 'true');
+ elements.bg?.setAttribute('inert', '');
+ elements.contents?.setAttribute('inert', '');

# Navigation.ts（open時）
- elements.contents?.setAttribute('aria-hidden', 'false');
+ elements.contents?.removeAttribute('inert');
- elements.bg?.setAttribute('aria-hidden', 'false');
+ elements.bg?.removeAttribute('inert');
```

※ `Navigation.scss` が `[aria-hidden]` セレクタに依存していないか要確認（依存していれば `[inert]` に変更）。

#### E2. 内部リンク切れ `/about` `/docs`（link-integrity ×2）
- 対象: `/`（index.html）
- 原因src: `src/pages/index.astro:37` `<TextLink href="/about" text="詳細はこちら" />`、`index.astro:41` `<TextLink href="/docs" ... />`
- 修正案: リンク先を既存ページ（例 `/page2/`）に差し替えるか、`src/pages/about.astro` / `docs.astro` を作成。

#### E3. `.DS_Store` が納品物に混入（link-integrity ×1）
- 対象: `dist/assets/.DS_Store`（混入元は `public/assets/.DS_Store`。リポジトリ内に計10件存在）
- 修正案:
  ```bash
  find . -name .DS_Store -not -path './node_modules/*' -delete
  ```
  `.gitignore` に `.DS_Store` を追加。恒久対策として build スクリプトに `find dist -name .DS_Store -delete` を足すのも有効。

#### E4. カルーセルのドットボタン（accessibility ×2: `button-name` + `target-size`）
- 対象: `/` の `.embla__dot` ×5（アクセシブルネームなし、12×12pxで24×24px未満）
- 原因src: `src/components/All/Carousel/CarouselPagination.ts:9`、`CarouselPagination.scss:10`
- 修正案:
  ```ts
  .map((_, index) => `<button class="embla__dot" type="button" aria-label="スライド${index + 1}へ移動"></button>`)
  ```
  SCSS側は `::before` で24×24pxの当たり判定を追加（またはサイズ自体を拡大）。選択中ドットへの `aria-current="true"` 付与も推奨。

#### E5. h1 が存在しない（accessibility ×2）
- 対象: `/page2/`, `/page3/`
- 原因src: `src/pages/page2.astro:14`、`src/pages/page3.astro:9`（`<Heading>` のデフォルトが h2）
- 修正案: `<Heading as="h1">Page2</Heading>` / `<Heading as="h1">Page3</Heading>` に変更。

#### E6. モーダル開閉トリガーが span でキーボード操作不能（accessibility ×1、WCAG 2.1.1）
- 対象: `/` の `<span class="js-modal-button">OPEN MODAL</span>`
- 原因src: `src/pages/index.astro:57`（Button.astro のデフォルト `as='span'`）
- 修正案: `<Button as="button" type="button" class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>`

#### E7. その他（accessibility ×1 + html-validate ×1）
- `summary` の `aria-label="summary"` が可視テキスト「Accorion Label」と不一致（WCAG 2.5.3）→ `src/components/All/Accordion/Accordion.astro:8` の `aria-label` を削除
- モーダル close ボタンの `type` 未指定（`no-implicit-button-type`）→ `src/components/All/Modal/Modal.astro:11` に `type="button"` を追加

### warning（52件）

#### W1. 本番JSに console.log 残存 ×3（link-integrity）
- `dist/assets/js/common.js`（1箇所）/ `second.js`（2箇所）
- 原因src: `src/scripts/common.ts:3`、`src/scripts/second.ts:3`、`src/components/Second/SecondBlock/SecondBlock.ts:1`
- 修正案: 該当行を削除。恒久対策として `astro.config.mjs` に `vite: { esbuild: { drop: ['console', 'debugger'] } }` を追加。

#### W2. OGPプレースホルダー ×9（link-integrity、全3ページ × og:url / og:image / twitter:image）
- 原因src: `src/data/project.ts:3` の `projectUrl = 'https://example.com'` **1箇所**
- 修正案: 本番ドメインに変更すれば9件すべて解消。ただし `public/og.png` が存在しないため、URLを直しても og:image は404になる → `public/og.png` の追加が必要。

#### W3. stylelint 37件 + prettier 1件（src-check）
- `@forward` の不要な `.scss` 拡張子 ×33（`src/components/+.scss`, `All/+.scss`, `Second/+.scss`）
- `src/styles/_base/reset.scss` ×4（vendor-prefix ×2 / `currentColor` 小文字化 / プロパティ順）
- `src/styles/_develop/+.scss` フォーマット不一致 ×1
- 修正案: 36件は `npx stylelint "src/**/*.scss" "src/**/*.astro" --fix`、1件は `npx prettier --write src/styles/_develop/+.scss` で自動修正可能。vendor-prefix はSafari互換のため維持するなら `stylelint-disable-line` 推奨。

#### W4. accessibility の残りwarning ×3
- `/` の Lighthouse accessibility スコア 87（E4/E7修正で回復見込み）
- `/` の見出し順序不正（h1より先にh2、h1はサンプル表示用）→ `src/pages/index.astro:16-26` にページタイトル用 h1 を追加検討
- 「詳細はこちら」だけのリンク（WCAG 2.4.4）→ `src/pages/index.astro:37` の `text` を具体的な文言に

### info（12件・参考）

- Google Fonts CSSがレンダリングブロック（推定FCP/LCP -650ms）→ `src/components/Head.astro:36` を preload+onload 化 or Roboto 700 のセルフホスト化（×3ページ）
- `all.css` レンダリングブロック（3KB・軽微）、embla-carousel チャンクの2段チェーン（modulepreloadで短縮可）
- `target="_blank"` の新規タブ告知がSR非伝達（`src/components/All/TextLink/TextLink.astro`）
- 装飾SVGに `aria-hidden` なし（`src/components/All/Icon/Icon.astro:7` → `aria-hidden="true" focusable="false"` 追加推奨）
- `Modal.astro:5` の `aria-modal="true"` は `showModal()` 使用時は冗長（削除推奨）
- `src/pages/index.astro:45` に外部リンクサンプル `https://example.com` 残存（差し替え推奨）

## Lighthouseスコア一覧

| ページ | performance | seo | best-practices | accessibility |
|---|---|---|---|---|
| / | 100 | 100 | 100 | **87** ⚠️ |
| /page2/ | 100 | 100 | 100 | 100 |
| /page3/ | 100 | 100 | 100 | 100 |

実測（ローカル計測のため参考値）: LCP ≈1.4s / CLS 0 / TBT 0ms（全ページ）

## 案件固有チェック結果

| 項目 | 結果 |
|---|---|
| 開発用の文言（TODO/FIXME/ダミー/localhost）が本番HTMLに残っていないこと | ✅ 全ページ0件 |
| 全ページに `<title>` が設定され空でないこと | ✅ 3ページとも設定済み |

## 次のアクション

判定 ❌ のため `npm run delivery` は実行不可。優先度順の修正手順:

1. **Navigation の inert 化**（E1、error 15件解消）— `Navigation.astro` + `Navigation.ts`
2. **リンク切れ2件の解消**（E2）— `src/pages/index.astro:37,41`
3. **.DS_Store 削除 + .gitignore 追加**（E3）
4. **アクセシビリティerror修正**（E4〜E7）— CarouselPagination / page2・page3 の h1 / モーダルトリガー / Accordion / Modal
5. console.log 削除 + esbuild drop 設定（W1）
6. `projectUrl` を本番URLに変更 + `public/og.png` 追加（W2）
7. `stylelint --fix` + `prettier --write`（W3、自動修正）

修正適用後は再ビルド + 該当検査の再実行で確認すること。修正はユーザー承認後に実施（本チェックでは src を一切変更していない）。
