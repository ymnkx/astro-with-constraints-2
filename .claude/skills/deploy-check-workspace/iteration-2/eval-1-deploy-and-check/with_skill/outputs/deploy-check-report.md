# デプロイ前チェックレポート

- 実行日時: 2026-07-07
- 対象コミット・ブランチ: `21c0194` / `develop`
- 検査対象: 3ページ（`/`, `/page2/`, `/page3/` — 全ページ検査、省略なし）
- ビルド: `npm run build` 成功（astro build + NGワードチェック通過）
- プレビュー: `http://localhost:4322`（4321は別プロセス使用中のため4322で実施）

## 判定: ❌ 要修正

error 25件（html-validator 16 / accessibility 6 / link-integrity 3）を検出。修正後の再チェックを推奨。

## サマリー

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator | ❌ | 16 | 0 |
| lighthouse | ✅ | 0 | 0 (info 3) |
| accessibility | ❌ | 6 | 3 (info 3) |
| link-integrity | ❌ | 3 | 11 |
| project-specific | ✅ | 0 | 0 |
| src-check | ⚠️ | 0 | 38 |
| **合計** | ❌ | **25** | **52** |

## 検出された問題（severity降順）

### error

#### E1. Navigation: `aria-hidden` 配下にフォーカス可能要素（html-validate `hidden-focusable` ×15）

- 対象: 全3ページ共通（closeボタン / ナビリンク×3 / trapボタン。3ページ×5箇所 = 15件）
- 場所: `.sample-navigation_contents[aria-hidden="true"]` 内の `<button data-role="close">`・`<a class="common-navi_link">`、および `<button class="sample-navigation_trap" aria-hidden="true">`
- 内容: `aria-hidden` はフォーカス可能要素（およびその祖先）に使えない。SRユーザーには「名前のない不可視要素」にフォーカスが当たる状態。
- 修正案（src）: `src/components/All/Navigation/Navigation.astro` + `src/components/All/Navigation/Navigation.ts` — `aria-hidden` トグルを `inert` 属性に置き換える（15件が一括解消）

```diff
# Navigation.astro
- <div class="sample-navigation_contents" data-role="contents" aria-hidden="true">
+ <div class="sample-navigation_contents" data-role="contents" inert>
  ...
- <button class="sample-navigation_trap" type="button" data-role="trap" aria-hidden="true"></button>
+ <div class="sample-navigation_trap" tabindex="0" data-role="trap"></div>
```

```diff
# Navigation.ts（setCloseEnd / open）
- elements.contents?.setAttribute('aria-hidden', 'true');
+ elements.contents?.setAttribute('inert', '');
- elements.contents?.setAttribute('aria-hidden', 'false');
+ elements.contents?.removeAttribute('inert');
- elements.bg?.setAttribute('aria-hidden', 'true');
+ elements.bg?.setAttribute('inert', '');
- elements.bg?.setAttribute('aria-hidden', 'false');
+ elements.bg?.removeAttribute('inert');
```

- 注意: `src/components/All/Navigation/Navigation.scss` の 26行目・42行目が `[aria-hidden="false"/"true"]` セレクタに依存しているため、**同時に `[inert]` ベースのセレクタへ変更しないと開閉表示が壊れる**。

#### E2. 内部リンク切れ: `/about`（link-integrity）

- 対象: `/`（dist/index.html）
- 場所: `<a href="/about">詳細はこちら</a>` → src: `src/pages/index.astro:37`
- 内容: `/about` が dist に存在しない（`src/pages/about.astro` が無い）
- 修正案: リンク先を既存ページに差し替えるか、`src/pages/about.astro` を作成

#### E3. 内部リンク切れ: `/docs`（link-integrity）

- 対象: `/`（dist/index.html）
- 場所: `<a href="/docs">` → src: `src/pages/index.astro:41`
- 内容: `/docs` が dist に存在しない
- 修正案: E2と同様

#### E4. 納品物に `.DS_Store` 混入（link-integrity）

- 対象: `dist/assets/.DS_Store`
- 内容: 混入元は `public/assets/.DS_Store`（リポジトリ内に計10件の `.DS_Store` あり）
- 修正案:
  - `find . -name .DS_Store -not -path './node_modules/*' -delete`
  - `.gitignore` に `.DS_Store` を追加
  - 恒久対策: build スクリプトに `find dist -name .DS_Store -delete` を追加

#### E5. カルーセルのドットボタンにアクセシブルネームがない（axe `button-name`）

- 対象: `/`
- 場所: `.embla__dots` 内の `<button class="embla__dot">` ×5（JS動的生成）
- 修正案: `src/components/All/Carousel/CarouselPagination.ts:9`

```diff
- .map(() => `<button class="embla__dot" type="button"></button>`)
+ .map((_, index) => `<button class="embla__dot" type="button" aria-label="スライド${index + 1}へ移動"></button>`)
```

（あわせて選択中ドットに `aria-current="true"` 付与を推奨）

#### E6. `summary` の `aria-label` が可視テキストと不一致（axe `label-content-name-mismatch`、WCAG 2.5.3）

- 対象: `/`
- 場所: `<summary ... aria-label="summary">`（可視テキストは「Accorion Label」）
- 修正案: `src/components/All/Accordion/Accordion.astro:8` の `aria-label="summary"` を削除（slotの可視テキストがアクセシブルネームになる）

#### E7. カルーセルドットのタッチターゲットが小さい（axe `target-size`、WCAG 2.5.8）

- 対象: `/`
- 場所: `.embla__dot` ×5（実測 12×12px）
- 修正案: `src/components/All/Carousel/CarouselPagination.scss:10` — 疑似要素で当たり判定を24×24pxに拡大（見た目維持）

```scss
.embla__dot {
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: 50%;
    translate: -50% -50%;
    width: 24px;
    height: 24px;
  }
}
```

#### E8. page2 に h1 がない（見出し階層）

- 対象: `/page2/`
- 修正案: `src/pages/page2.astro:14` — `<Heading as="h1">Page2</Heading>` に変更（Headingのデフォルトがh2）

#### E9. page3 に h1 がない（見出し階層）

- 対象: `/page3/`
- 修正案: `src/pages/page3.astro:9` — `<Heading as="h1">Page3</Heading>` に変更

#### E10. モーダルを開くトリガーが `span` でキーボード操作不能（WCAG 2.1.1）

- 対象: `/`
- 場所: `<span data-modal-id="sample-modal" class="js-modal-button sample-button">OPEN MODAL</span>`
- 修正案: `src/pages/index.astro:57` — `<Button as="button" type="button" class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>` に変更（`Button.astro` のデフォルト `as='span'` の見直しも検討）

#### E11. モーダルcloseボタンの `type` 未指定（html-validate `no-implicit-button-type`）

- 対象: `/`（dist/index.html 229:8）
- 修正案: `src/components/All/Modal/Modal.astro:11` — `<button type="button" autofocus data-role="close">close</button>`（暗黙の `type="submit"` は `<dialog>`+form時に意図しない挙動を招く）

### warning

#### W1. OGPがプレースホルダーURLのまま（link-integrity ×9）

- 対象: 全3ページの `og:url` / `og:image` / `twitter:image`（`https://example.com/...`）
- 修正案: `src/data/project.ts:3` の `projectUrl = 'https://example.com'` を本番ドメインに変更（**1箇所で9件すべて解消**）。あわせて `public/og.png` が存在しないため、本番で og:image が404になる可能性あり — og.png の配置を確認すること。

#### W2. 本番JSに `console.log` 残存 ×3（link-integrity）

- 対象: `dist/assets/js/common.js`（1）、`dist/assets/js/second.js`（2）
- 修正案: `src/scripts/common.ts:3` / `src/scripts/second.ts:3` / `src/components/Second/SecondBlock/SecondBlock.ts:1` の `console.log` を削除。恒久対策として `astro.config.*` に `vite: { esbuild: { drop: ['console', 'debugger'] } }` を追加推奨。

#### W3. Lighthouse accessibility スコア 87（`/` のみ、閾値90未満）

- 原因は E5〜E7。修正で回復見込み（page2/page3 は100）。

#### W4. 見出し順序が不正（`/`）

- h1（「Heading 1」＝サンプル表示用）より先にh2が出現。コンポーネントカタログページのため意図的の可能性あり。
- 修正案: `src/pages/index.astro:16-26` — ページ先頭に `<Heading as="h1">Components</Heading>` 等を置き、サンプル見出しはプレビュー枠に隔離。

#### W5. リンクテキスト「詳細はこちら」単体でリンク先不明（WCAG 2.4.4）

- 修正案: `src/pages/index.astro:37` — `text="◯◯の詳細"` など具体的な文言に。

#### W6. stylelint 37件（src-check）

- 内訳: `@forward` の不要な `.scss` 拡張子 ×33、`reset.scss` のvendor prefix ×2、`currentColor` 小文字化 ×1、プロパティ順 ×1
- 36件は自動修正可: `npx stylelint "src/**/*.scss" "src/**/*.astro" --fix`（未実行・提案のみ）

#### W7. Prettier不整合 1ファイル（src-check）

- `src/styles/_develop/+.scss` — `npx prettier --write src/styles/_develop/+.scss` で修正可（未実行・提案のみ）

### info（参考）

- Google Fonts CSSがレンダリングブロック（FCP/LCP推定約650ms遅延）→ `src/components/Head.astro:36` を preload+onload 方式にするか、Roboto 700 をセルフホスト化（推奨）
- `all.css`（3KB）のレンダリングブロック → 実害軽微、現状許容
- embla-carousel チャンクの2段動的importチェーン → `<link rel="modulepreload">` 追加で短縮可（優先度低）
- `target="_blank"` リンクの新規タブ告知がSRに伝わらない → `src/components/All/TextLink/TextLink.astro` に visually-hidden テキスト追加
- 装飾SVGアイコンに `aria-hidden` なし → `src/components/All/Icon/Icon.astro:7` に `aria-hidden="true" focusable="false"` 追加
- `src/pages/index.astro:45` に `https://example.com` の外部リンクサンプル残存 → 納品前に実URLへ差し替え推奨

## Lighthouseスコア一覧

| ページ | performance | seo | best-practices | accessibility |
|---|---|---|---|---|
| / | 100 | 100 | 100 | **87** ⚠️ |
| /page2/ | 100 | 100 | 100 | 100 |
| /page3/ | 100 | 100 | 100 | 100 |

※ローカル計測のためネットワーク由来の指標は本番より良く出る点に注意。

## 案件固有チェック結果

| 項目 | 結果 |
|---|---|
| 開発用の文言（TODO/FIXME/ダミー/localhost）が本番HTMLに残っていないこと | ✅ |
| 全ページに `<title>` が設定され空でないこと | ✅ |

## 納品処理（npm run delivery）の扱い

判定が ❌ のため **実行していない**。上記 error の修正 → 再ビルド → 該当検査の再実行で ✅ になってから `npm run delivery` を実行すること。

## 次のアクション（推奨順）

1. E1（Navigation `inert` 化）— 1コンポーネントの修正で error 15件解消
2. E2/E3（リンク切れ）と E4（.DS_Store）— 納品事故に直結
3. E5〜E11（a11y/HTML構文）— 各1〜2行の修正
4. W1（`project.ts` の本番URL設定）+ og.png 配置、W2（console.log削除）
5. W6/W7 は `--fix`/`--write` で一括自動修正可
6. 再ビルド + 再チェック → ✅ 後に `npm run delivery`
