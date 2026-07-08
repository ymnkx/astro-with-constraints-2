# デプロイ前チェックレポート

- 実行日時: 2026-07-08
- 対象コミット・ブランチ: なし（git管理外ディレクトリ）
- 検査対象: 3ページ（`/` `/page2/` `/page3/` — 全ページ検査、省略なし）
- ビルド: `npm run build` 成功（NGワードチェック含む）／プレビュー: `http://localhost:4322`（4321は別プロセス使用中のため）

## 判定: ❌ 要修正

error 30件 / warning 53件 / info 約12件を検出。error の実体は重複原因を除くと **srcの修正箇所は約10箇所**。すべて修正提案付き（未適用）。

## サマリー

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator | ❌ | 18 | 0 |
| lighthouse | ⚠️ | 0 | 1 |
| accessibility | ❌ | 7 | 3 |
| link-integrity | ❌ | 4 | 11 |
| project-specific | ❌ | 1 | 0 |
| src-check | ⚠️ | 0 | 38 |
| **合計** | ❌ | **30** | **53** |

## 検出された問題（severity降順・根本原因ごとに集約）

### error

#### E1. page2 のダミーブロック一式（TODO文言・alt欠落・id重複・リンク切れ）— 4検査で検出

`src/pages/page2.astro` 15〜20行目に集中。**納品物として最も危険**な問題群。

- **開発用文言の残存**（project-specific）: `dist/page2/index.html:111` に `<p>TODO: 本番前にダミー画像を差し替える</p>` がそのまま出力
- **img の alt 欠落**（html-validate `wcag/h37` / axe `image-alt`）: `<img src="/favicon.svg" width="64" height="64">`。page2 の SEOスコアが 91 に低下した唯一の原因でもある
- **id 重複**（html-validate `no-dup-id`）: `<div id="dup-check-target">` が同一ページに2つ（14行目と19行目相当）。HTML不正
- **内部リンク切れ `/recruit/`**（link-integrity）: `<a href="/recruit/">採用情報</a>` の遷移先ページが存在しない

修正案（`src/pages/page2.astro`）:

```diff
- <div id="dup-check-target">
-   <p>TODO: 本番前にダミー画像を差し替える</p>
-   <img src="/favicon.svg" width="64" height="64" />
- </div>
+ <div id="dup-check-target">
+   <img src="/path/to/production-image.png" alt="（画像内容の説明）" width="64" height="64" />
+ </div>
  <div id="dup-check-target">   ← idを "recruit-link" 等にリネーム（重複解消）
-   <a href="/recruit/">採用情報</a>
+   <a href="/recruit/">採用情報</a>  ← src/pages/recruit.astro を作成 or リンク先変更 or 削除
  </div>
```

#### E2. `aria-hidden` 配下にフォーカス可能要素（html-validate `hidden-focusable` ×15 / 全3ページ）

- 対象: 全3ページのナビゲーション（closeボタン・ナビリンク×3・trapボタン）
- 場所: `.sample-navigation_contents[aria-hidden="true"]` 内、および `<button class="sample-navigation_trap" aria-hidden="true">`
- 内容: SRユーザーに「名前のない不可視要素」へフォーカスが当たる
- 修正案（src）: `aria-hidden` トグルを `inert` に置き換え（15件が1箇所の設計変更で全解消）

```diff
# src/components/All/Navigation/Navigation.astro（11行目・27行目）
- <div class="sample-navigation_contents" data-role="contents" aria-hidden="true">
+ <div class="sample-navigation_contents" data-role="contents" inert>
- <button class="sample-navigation_trap" type="button" data-role="trap" aria-hidden="true"></button>
+ <div class="sample-navigation_trap" tabindex="0" data-role="trap"></div>

# src/components/All/Navigation/Navigation.ts（46-47行目 / 83-85行目）
- elements.bg?.setAttribute('aria-hidden', 'true');
- elements.contents?.setAttribute('aria-hidden', 'true');
+ elements.bg?.setAttribute('inert', '');
+ elements.contents?.setAttribute('inert', '');
- elements.contents?.setAttribute('aria-hidden', 'false');
+ elements.contents?.removeAttribute('inert');
- elements.bg?.setAttribute('aria-hidden', 'false');
+ elements.bg?.removeAttribute('inert');

# src/components/All/Navigation/Navigation.scss（26行目 / 42行目）※同時変更必須
- &[aria-hidden='false']
+ &:not([inert])
- &[aria-hidden='true']
+ &[inert]
```

#### E3. 内部リンク切れ `/about` `/docs`（link-integrity ×2 / index）

- 修正案（src）: `src/pages/index.astro:37,41` — `<TextLink href="/about" text="詳細はこちら" />` と `<TextLink href="/docs" text="ドキュメント" ... />`。ページ作成（`src/pages/about.astro` 等）、実在ページへの変更、または削除。

#### E4. 納品物に `.DS_Store` 混入（link-integrity ×1）

- 場所: `dist/assets/.DS_Store`（由来: `public/assets/.DS_Store`）
- 修正案: `find . -name .DS_Store -delete` 後に再ビルド。src配下にも4ファイル存在（distには出ないが同時掃除推奨）。

#### E5. カルーセルのドットボタンにアクセシブルネームがない（axe `button-name` / index）

- 修正案（src）: `src/components/All/Carousel/CarouselPagination.ts:9`

```diff
- .map(() => `<button class="embla__dot" type="button"></button>`)
+ .map((_, index) => `<button class="embla__dot" type="button" aria-label="スライド${index + 1}へ移動"></button>`)
```

あわせて `toggleDotBtnsActive` で選択中ドットに `aria-current="true"` 付与推奨。

#### E6. ドットボタンのタッチターゲットが 24px 未満（axe `target-size` / index）

- 実測 12×12px（WCAG 2.5.8）
- 修正案（src）: `src/components/All/Carousel/CarouselPagination.scss`（`--dot-size: #{rem(12)}`）

```scss
.embla__dot {
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: rem(-6); /* 12 + 6*2 = 24px */
  }
}
```

#### E7. `summary` の `aria-label` が可視テキストと不一致（axe `label-content-name-mismatch` / index）

- `aria-label="summary"` が可視テキスト「Accorion Label」を上書き（WCAG 2.5.3）
- 修正案（src）: `src/components/All/Accordion/Accordion.astro:8` の `aria-label="summary"` を削除するだけ。

#### E8. page2 / page3 に h1 がない（見出し階層 ×2）

- 修正案（src）: `src/pages/page2.astro` / `src/pages/page3.astro` の `<Heading>` を `<Heading as="h1">` に変更（Heading.astro のデフォルトが h2）。

#### E9. モーダルを開くトリガーが `span` でキーボード操作不能（index）— WCAG 2.1.1

- 修正案（src）: `src/pages/index.astro:57`

```diff
- <Button class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>
+ <Button as="button" type="button" class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>
```

（Button.astro のデフォルト `as='span'` 自体の見直しも検討）

#### E10. モーダル close ボタンに `type` 未指定（html-validate `no-implicit-button-type` / index）

- 修正案（src）: `src/components/All/Modal/Modal.astro:11` — `<button type="button" autofocus data-role="close">close</button>`

### warning

#### W1. OGP がプレースホルダーのまま（×9 / 全3ページ）

- `og:url` / `og:image` / `twitter:image` が `https://example.com` のまま
- 修正案（src）: `src/data/project.ts:3` の `projectUrl` を本番ドメインへ（1箇所で9件解消）。参照先の `public/og.png` が未配置な点にも注意（info参照）。

#### W2. 本番JSに `console.log` 残存（×3）

- `dist/assets/js/common.js` ×1、`dist/assets/js/second.js` ×2
- 修正案（src）: `src/scripts/common.ts:3` / `src/scripts/second.ts:3` / `src/components/Second/SecondBlock/SecondBlock.ts:1` を削除。恒久対策: `astro.config.mjs` に `vite: { esbuild: { drop: ['console', 'debugger'] } }`。

#### W3. Lighthouse スコア 90 未満

- index の accessibility 87（原因は E5〜E7、修正で回復見込み）
- page2 の SEO 91 は閾値内だが唯一の減点が E1 の alt 欠落（修正で100に回復）

#### W4. index の見出し順序が不正（h1 より先に h2 が出現）

- コンポーネントカタログページのため意図的の可能性あり。ページ先頭に `<Heading as="h1">` を置き、サンプル見出しは表示用に隔離推奨（`src/pages/index.astro`）。

#### W5. リンクテキスト「詳細はこちら」単体でリンク先不明（WCAG 2.4.4）

- `src/pages/index.astro:37` — 具体的な文言にするか visually-hidden 補足を追加。

#### W6. stylelint 37件 + prettier 1件（src-check）

- stylelint 37件中 36件は自動修正可: `npx stylelint "src/**/*.scss" "src/**/*.astro" --fix`
  - 内訳: `@forward` の不要な `.scss` 拡張子 ×33、vendor prefix ×2、`currentColor` 小文字化 ×1、プロパティ順 ×1
  - 注意: vendor prefix 2件（`reset.scss` の `text-size-adjust`）は Safari 互換のため `--fix` 非推奨。stylelint-disable コメントかルール除外を推奨
- prettier: `src/styles/_develop/+.scss` 1ファイル（実体はCRLF改行）→ `npx prettier --write` + `.gitattributes` に `*.scss text eol=lf` 追加を推奨
- ESLint は指摘ゼロ。実行時バグを示唆する指摘なし。

### info（任意対応・抜粋）

1. `og.png` の実体が public/ に存在しない（W1修正時に404になる）→ `public/og.png`（1200×630）を配置
2. src配下の `.DS_Store` ×4 → 削除
3. Google Fonts CSS がレンダリングブロック（約650ms改善余地）→ `src/components/Head.astro:36` を preload 化 or Roboto 700 セルフホスト
4. `all.css` / `second.css` のレンダリングブロック（軽微）→ `build: { inlineStylesheets: 'always' }` で解消可
5. embla-carousel の2段動的importチェーン（軽微）→ `modulepreload` or 遅延import
6. `target="_blank"` の新規タブ告知がSRに伝わらない → `src/components/All/TextLink/TextLink.astro` に visually-hidden 補足
7. 装飾SVGに `aria-hidden` なし → `src/components/All/Icon/Icon.astro` に `aria-hidden="true" focusable="false"`
8. `Modal.astro` の `aria-modal="true"` は `showModal()` 使用時は冗長（削除推奨）
9. 案件固有チェックリストがテンプレ既定例のまま → 案件固有の観点（GTM/canonical/計測タグ等）の追記を推奨

## Lighthouseスコア一覧

| ページ | performance | seo | best-practices | accessibility |
|---|---|---|---|---|
| / | 100 | 100 | 100 | **87** ⚠️ |
| /page2/ | 100 | **91** | 100 | 93 |
| /page3/ | 100 | 100 | 100 | 100 |

※ ローカル計測のためネットワーク由来指標は本番より良く出る点に注意。

## 案件固有チェック結果

| 項目 | 結果 |
|---|---|
| 開発用の文言（TODO/FIXME/ダミー/localhost）が本番HTMLに残っていない | ❌ page2 で「TODO: 本番前にダミー画像を差し替える」を検出 |
| 全ページに `<title>` が設定され空でない | ✅ |

## 次のアクション

1. **最優先: E1（page2 のダミーブロック）** — TODO文言・ダミー画像・id重複・`/recruit/` リンク切れを整理
2. E2〜E10 の修正（すべて上記diff案あり、実ファイルは約10箇所）
3. warning のうち W1（OGP）と W2（console.log）は納品前に対応推奨、W6 は自動修正コマンドでほぼ解消
4. 修正後に `npm run build` + 該当検査の再実行で確認
5. 判定が ✅ になったら `npm run delivery` で納品物を生成できます（このチェックでは未実行）

※ 本チェックでは src / dist への変更は一切行っていません（すべて提案のみ）。
