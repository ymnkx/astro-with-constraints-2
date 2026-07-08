# デプロイ前チェックレポート

- 実行日時: 2026-07-07 07:31 (JST)
- 対象コミット・ブランチ: なし（gitリポジトリ未初期化）
- 対象プロジェクト: `data/`（Astro 6.1.8, projectDirectory: `/`）
- ビルド: ✅ 成功（3ページ生成 + NGワードチェック通過）
- 検査対象: 3ページ（`/`, `/page2/`, `/page3/` — 全ページ検査、省略なし）
- プレビューサーバー: `http://localhost:4331`（ポート4321が使用中のため4331で実行、検査後に停止済み）

## 判定: ❌ 要修正

error 24件を検出したため、納品処理（`npm run delivery`）は実行していない。

## サマリー

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator（HTML構文） | ❌ | 16 | 0 |
| lighthouse（性能/SEO/BP） | ✅ 全ページ全カテゴリ100点 | 0 | 0 |
| accessibility（axe + 静的） | ❌ `/` スコア87 | 6 | 3 |
| link-integrity（リンク/アセット） | ❌ | 2 | 0 |
| project-specific（案件固有） | ⚪ 未設定（テンプレのまま） | 0 | 0 |
| **合計** | | **24** | **3** |

## 検出された問題（severity降順）

### E1. hidden-focusable — ナビゲーションの `aria-hidden` 配下にフォーカス可能要素（error 15件, 全3ページ）

- 検出: html-validate（recommended, severity: error）
- 対象: 全3ページ共通の `sample-navigation` コンポーネント。`.sample-navigation_contents` に `aria-hidden="true"` が付いたまま、内部の closeボタン・ナビリンク×3 がフォーカス可能。フォーカストラップ用 `button.sample-navigation_trap` 自体にも `aria-hidden="true"` が直接付与。
- 実害: キーボードユーザーが「支援技術には存在しない」要素にフォーカスできてしまう（WCAG的にNGパターン）。
- src: `data/src/components/All/Navigation/Navigation.astro` L11, L27 / `data/src/components/All/Navigation/Navigation.ts` L46-47, L83-85
- 修正案: `aria-hidden` を `inert` に置き換える（詳細は後述の修正提案 1）。共通コンポーネントなので修正1箇所で15件すべて解消。

### E2. カルーセルのドットボタンにアクセシブルネームなし（error, `/`, axe: button-name）

- 対象: `div.embla__dots > button.embla__dot` ×5（JSで動的生成）
- src: `data/src/components/All/Carousel/CarouselPagination.ts` L9
- 修正案: 生成時に `aria-label="Go to slide N"` を付与（修正提案 2）。

### E3. カルーセルのドットのタッチターゲットが12×12px（error, `/`, axe: target-size）

- 最小24×24px未満、隣接間隔8px。
- src: `data/src/components/All/Carousel/CarouselPagination.scss`（`.embla__dot`）
- 修正案: 見た目は12pxのまま、padding/擬似要素でヒット領域を24px以上に拡大（修正提案 3）。

### E4. `<summary>` の aria-label が可視テキストと不一致（error, `/`, axe: label-content-name-mismatch）

- 対象: `<summary ... aria-label="summary">`、可視テキストは「Accorion Label」。音声操作ユーザーが可視ラベルで操作不能。
- src: `data/src/components/All/Accordion/Accordion.astro` L8（+ `data/src/pages/index.astro` L50 に "Accorion" → "Accordion" のtypo）
- 修正案: `aria-label="summary"` を削除（修正提案 4）。

### E5. モーダルのトリガーが `<span>`（error, `/`, WCAG 2.1.1 静的検査）

- 対象: `<span data-modal-id="sample-modal" class="js-modal-button sample-button">OPEN MODAL</span>`。clickリスナーのみでフォーカス不可・role無し → キーボード/SR操作不能。
- src: `data/src/pages/index.astro` L57（`Button` コンポーネントのデフォルト `as='span'` が原因。`data/src/components/All/Button/Button.astro` L14）
- 修正案: `<Button as="button" type="button">` を明示（修正提案 5）。

### E6. page2 / page3 に h1 がない（error 2件, 静的検査）

- 見出しが h2 から始まる（`Heading` コンポーネントのデフォルトが h2）。
- src: `data/src/pages/page2.astro` L14 / `data/src/pages/page3.astro` L9
- 修正案: `<Heading as="h1">` を明示（修正提案 6）。

### E7. モーダルの closeボタンに type 属性なし（error, `/`, html-validate: no-implicit-button-type）

- 対象: `#sample-modal` 内 `<button autofocus data-role="close">close</button>`
- src: `data/src/components/All/Modal/Modal.astro` L11
- 修正案: `type="button"` を追加（修正提案 7）。

### E8. 内部リンク切れ ×2（error, `/`, link-integrity）

- `href="/about"`（「詳細はこちら」）と `href="/docs"`（「ドキュメント」）の遷移先がdistに存在しない → デプロイ後404。TextLinkコンポーネントのショーケース用ダミーリンクとみられる。
- src: `data/src/pages/index.astro` L37, L41
- 修正案: 実在パス（`/page2/` 等）か `#` に変更、または該当ページを追加（修正提案 8）。

### W1. `/` の Lighthouse accessibility スコアが 87（warning, 閾値90未満）

- E2〜E4 の修正で90以上に回復する見込み。

### W2. `/` の見出し順序が h2 → h1 と逆行（warning, 静的検査）

- `main` 冒頭の h2「Button」「Heading」が h1「Heading 1」より前に出現。コンポーネントカタログ用サンプルの可能性が高い。
- src: `data/src/pages/index.astro`（ページ先頭に h1 を置くか、サンプル見出しを div 等に変更）

### W3. リンクテキスト「詳細はこちら」が単体で遷移先不明（warning, 静的検査）

- src: `data/src/pages/index.astro` L37。「○○の詳細を見る」のように対象を含めるか `aria-label` で補足。

### info（参考・判定に影響なし）

- `target="_blank"` リンクに「新しいタブで開く」ことを伝えるテキストなし（`/` L186相当、TextLink外部リンクサンプル）
- 装飾用インラインSVG（`.sample-icon` 等）に `aria-hidden="true"` 未付与
- Lighthouse: クリティカルリクエストチェーン最長がGoogle Fonts CSS（115ms、preconnect済みで実害小。詰めるならRobotoのself-host化）

## Lighthouseスコア一覧

| Page | Performance | SEO | Best Practices | Accessibility |
|---|---|---|---|---|
| `/` | 100 | 100 | 100 | **87** ⚠️ |
| `/page2/` | 100 | 100 | 100 | 100 |
| `/page3/` | 100 | 100 | 100 | 100 |

Core Web Vitals（ローカル計測のため参考値）: 全ページ LCP ≈ 1.43s / CLS 0 / TBT 0ms。

## 案件固有チェック結果

`.claude/skills/deploy-check/checks/project-specific.md` が「（例）」テンプレのままのため **案件固有チェックは未設定**。案件に合わせてチェックリストを編集すると次回から自動検証される。

---

## 修正提案（すべて src 側、diff形式）

> distを直接直しても次のビルドで消えるため、修正はすべてsrc側。適用はユーザー承認後。

### 1. Navigation: `aria-hidden` → `inert`（E1, 15件解消）

`data/src/components/All/Navigation/Navigation.astro`:

```diff
-  <div class="sample-navigation_contents" data-role="contents" aria-hidden="true">
+  <div class="sample-navigation_contents" data-role="contents" inert>
```

```diff
-    <button class="sample-navigation_trap" type="button" data-role="trap" aria-hidden="true"></button>
+    <button class="sample-navigation_trap" type="button" data-role="trap" tabindex="-1" aria-hidden="true"></button>
```

（trapボタンはフォーカストラップ機構に必要なら `tabindex="-1"` 追加ではなく、`inert` 化に伴い focusin 監視ベースへ変更するのが理想。最小修正なら閉状態では祖先の `inert` が効くため、trap自体の `aria-hidden` を外して開状態の挙動を維持する形でも可）

`data/src/components/All/Navigation/Navigation.ts`:

```diff
   const setCloseEnd = () => {
     states.isOpen = false;
     states.isMoving = false;
     elements.bg?.setAttribute('aria-hidden', 'true');
-    elements.contents?.setAttribute('aria-hidden', 'true');
+    elements.contents?.setAttribute('inert', '');
     _scrollController.release();
     elements.openButton?.focus();
   };
```

```diff
   const open = () => {
     states.isMoving = true;
     states.isOpen = true;
     _scrollController.lock();
-    elements.contents?.setAttribute('aria-hidden', 'false');
+    elements.contents?.removeAttribute('inert');
     elements.contents?.animate([getState().start, getState().end], animationSettings);
```

※ `inert` 配下はフォーカス自体が不能になるので、CSSの `visibility`/`pointer-events` 制御とも整合する。`bg` は非フォーカス要素のみなので `aria-hidden` のままで問題なし。

### 2. カルーセルドットに aria-label（E2）

`data/src/components/All/Carousel/CarouselPagination.ts`:

```diff
-      .map(() => '<button class="embla__dot" type="button"></button>')
+      .map((_, index) => `<button class="embla__dot" type="button" aria-label="Go to slide ${index + 1}"></button>`)
```

### 3. ドットのタッチターゲット拡大（E3）

`data/src/components/All/Carousel/CarouselPagination.scss`（`.embla__dot` の実寸に合わせて調整）:

```diff
 .embla__dot {
+  position: relative;
+
+  // ヒット領域を24x24px以上に拡大（見た目は変えない）
+  &::before {
+    position: absolute;
+    inset: 50%;
+    width: 24px;
+    height: 24px;
+    content: '';
+    translate: -50% -50%;
+  }
 }
```

### 4. Accordion: aria-label 削除（E4）

`data/src/components/All/Accordion/Accordion.astro`:

```diff
-  <summary class="sample-accordion_summary" data-role="summary" aria-label="summary">
+  <summary class="sample-accordion_summary" data-role="summary">
```

あわせて `data/src/pages/index.astro` L50 のtypo:

```diff
-      <span>Accorion Label</span>
+      <span>Accordion Label</span>
```

### 5. モーダルトリガーを button に（E5）

`data/src/pages/index.astro` L57:

```diff
-  <Button class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>
+  <Button as="button" type="button" class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>
```

### 6. page2 / page3 の h1（E6）

`data/src/pages/page2.astro` L14:

```diff
-  <Heading>Page2</Heading>
+  <Heading as="h1">Page2</Heading>
```

`data/src/pages/page3.astro` L9:

```diff
-  <Heading>Page3</Heading>
+  <Heading as="h1">Page3</Heading>
```

### 7. Modal closeボタンに type（E7）

`data/src/components/All/Modal/Modal.astro` L11:

```diff
-      <button autofocus data-role="close">close</button>
+      <button type="button" autofocus data-role="close">close</button>
```

### 8. リンク切れ修正（E8, W3）

`data/src/pages/index.astro` L37, L41（ショーケース用途なら実在パスへ）:

```diff
-    <TextLink href="/about" text="詳細はこちら" />
+    <TextLink href="/page2/" text="Page2の詳細を見る" />
```

```diff
-    <TextLink href="/docs" text="ドキュメント" iconName="check" iconPosition="left" />
+    <TextLink href="/page3/" text="ドキュメント" iconName="check" iconPosition="left" />
```

（`/about` `/docs` ページを実際に追加する予定があるならそちらでも可）

---

## 環境メモ（推測フラグ付き）

- html-validate最新版は Node 20.10.0 では `styleText` 未実装で起動不能（検査は Node 24.16.0 で実施）。CIでhtml-validateを使う場合は devDependency でのバージョン固定か Node 20.12+ を推奨。

## 次のステップ

1. 上記修正提案 1〜8 の承認可否を判断（1, 2, 4〜8 はいずれも数行の変更）
2. 承認後に適用 → `npm run build` → 該当検査（html-validate / axe / check-links）のみ再実行
3. 判定 ✅ になったら `cd data && npm run delivery` で納品物生成
4. 任意: `.claude/skills/deploy-check/checks/project-specific.md` を案件用に編集
