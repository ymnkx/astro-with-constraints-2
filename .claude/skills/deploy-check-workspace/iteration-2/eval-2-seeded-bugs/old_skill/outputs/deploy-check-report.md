# デプロイ前チェックレポート

- 実行日時: 2026-07-06 〜 07-07（JST） / git管理外のためコミット・ブランチ情報なし
- 検査対象: 3ページ（`/` `/page2/` `/page3/` — dist内全HTML。省略ページなし）
- ビルド: `npm run build` 成功（astro build + check-ng-words ともにパス）
- プレビュー: ポート4321が使用中のため `http://localhost:4322` で実施

## 判定: ❌ 要修正

error が合計 14件（重複排除後 12件）検出されたため、このまま納品・デプロイは不可。すべてsrc側の軽微な修正で解消可能。

## サマリー

| 検査 | 結果 | error | warning |
|---|---|---:|---:|
| html-validator（HTML構文） | ❌ | 3 | 0 |
| lighthouse（performance/seo/best-practices） | ⚠️ | 0 | 1 |
| accessibility（axe-core + 静的） | ❌ | 6 | 4 |
| link-integrity（リンク/アセット） | ❌ | 3 | 0 |
| project-specific（案件固有） | ❌ | 2 | 0 |
| **合計** | ❌ | **14** | **5** |

※ 検査間で重複して検出された問題（page2のalt欠落、id重複）を1件に数えると **実質 error 12件 / warning 3件**。

## 検出された問題（severity降順・重複統合済み）

### error

1. **開発用プレースホルダーが本番HTMLに残存**（project-specific ①②）
   - 対象: /page2/ — `<p>TODO: 本番前にダミー画像を差し替える</p>`（dist/page2/index.html:111）
   - src: `data/src/pages/page2.astro:16`
   - 修正案: 本番コンテンツに差し替えて当該行を削除

2. **img に alt 属性なし**（html-validator wcag/h37 + Lighthouse image-alt + axe image-alt の3検査で検出）
   - 対象: /page2/ — `<img src="/favicon.svg" width="64" height="64">`（dist/page2/index.html:112）。page2のSEOスコアを91に下げている唯一の要因でもある
   - src: `data/src/pages/page2.astro:17`
   - 修正案: 本番画像への差し替え時に内容を表す `alt` を付与（装飾なら `alt=""`）

3. **id 重複 `dup-check-target`**（html-validator no-dup-id + axe静的 + link-integrity補足の3検査で検出）
   - 対象: /page2/ — 同一idのdivが2箇所（dist/page2/index.html:110, 114）
   - src: `data/src/pages/page2.astro:15,19`
   - 修正案: 一方をリネームまたは削除（JS参照・aria参照・アンカーが壊れる実害あり）

4. **内部リンク切れ `/about`**
   - 対象: / — `<a href="/about">詳細はこちら</a>`（dist/index.html:168）
   - src: `data/src/pages/index.astro:37`（TextLinkサンプル）
   - 修正案: 実在ページへの差し替え、ページ追加、またはサンプルならダミーURL化

5. **内部リンク切れ `/docs`**
   - 対象: / — `<a href="/docs">ドキュメント</a>`（dist/index.html:175）
   - src: `data/src/pages/index.astro:41`
   - 修正案: 同上

6. **内部リンク切れ `/recruit/`**
   - 対象: /page2/ — `<a href="/recruit/">採用情報</a>`（dist/page2/index.html:115）
   - src: `data/src/pages/page2.astro:20`
   - 修正案: `/recruit/` ページ追加、またはリンク削除・差し替え

7. **モーダル close ボタンに type 属性なし**（html-validate no-implicit-button-type）
   - 対象: / — `<button autofocus data-role="close">close</button>`（dist/index.html:229）
   - src: `data/src/components/All/Modal/Modal.astro:11`
   - 修正案: `type="button"` を追加

8. **カルーセルのドットボタンにアクセシブルネームなし**（axe button-name）
   - 対象: / — `.embla__dot` ボタン5個、テキスト・aria-labelとも空
   - src: `data/src/components/All/Carousel/CarouselPagination.ts:9`（ドット生成JS）
   - 修正案: 生成時に `aria-label="Go to slide N"` を付与

9. **ドットボタンのタッチターゲット過小**（axe target-size）
   - 対象: / — `.embla__dot` が12×12px（最小24×24px未満、間隔も不足）
   - src: `data/src/components/All/Carousel/CarouselPagination.scss:11`（`--dot-size: rem(12)`）
   - 修正案: サイズ拡大 or paddingでヒット領域を24px以上に

10. **アコーディオンの可視ラベルとアクセシブルネーム不一致**（axe label-content-name-mismatch）
    - 対象: / — summary の可視テキスト「Accorion Label」に対し `aria-label="summary"`
    - src: `data/src/components/All/Accordion/Accordion.astro:8`
    - 修正案: `aria-label="summary"` を削除（可視テキストがそのまま名前になる）。※「Accorion」は「Accordion」のtypoの可能性あり（使用側ページ）

11. **/page2/ に h1 なし**（静的: 見出し階層）
    - 対象: /page2/ — 見出しは h2 のみ
    - src: `data/src/pages/page2.astro:14`（`<Heading>` はデフォルト h2、`data/src/components/All/Heading/Heading.astro`）
    - 修正案: `<Heading as="h1">Page2</Heading>` に変更

12. **/page3/ に h1 なし**（静的: 見出し階層）
    - src: `data/src/pages/page3.astro`（同様にHeadingのデフォルトh2）
    - 修正案: `<Heading as="h1">Page3</Heading>` に変更

### warning

13. **リンクテキストが文脈非依存でない**: / の「詳細はこちら」（`data/src/pages/index.astro:37`）。「○○の詳細はこちら」等に変更推奨
14. **モーダル開閉トリガーが span**: / の「OPEN MODAL」（`data/src/pages/index.astro:57` — `Button` コンポーネントのデフォルトが `as="span"`）。`as="button"` 指定推奨（キーボード操作不可のため実質errorに近い）
15. **/ の見出し順序**: 最初の見出しがh2で、サンプル用h1が文中に出現。ページタイトルをh1で先頭に置く構成を推奨

### info

- Google Fonts CSSのクリティカルチェーン（全ページ、~107ms）: `preconnect` 済みだが自己ホスト化も検討可
- `target="_blank"` の外部リンクに「新しいタブで開く」の非視覚的告知なし（/）

## Lighthouseスコア一覧

| ページ | performance | seo | best-practices | accessibility |
|---|---:|---:|---:|---:|
| / | 100 | 100 | 100 | 87 |
| /page2/ | 100 | 91 | 100 | 93 |
| /page3/ | 100 | 100 | 100 | 100 |

- 90未満: `/` の accessibility 87（warning閾値90未満）
- page2 の seo 91 は alt欠落が原因。修正で100に戻る見込み
- ローカル計測のためネットワーク系指標は本番より良く出る点に注意

## 案件固有チェック結果

| 項目 | 結果 |
|---|---|
| 開発用の文言が本番HTMLに残っていないこと（TODO/FIXME/ダミー/localhost） | ❌ page2に `TODO` `ダミー` 残存 |
| 全ページに `<title>` が設定され空でないこと | ✅ 3ページとも設定済み |

## 問題なしだった項目

- CSS/JS/画像などの参照アセット欠落: なし
- アンカー(#)切れ: なし
- ページ間ナビ（/ ↔ /page2/ ↔ /page3/）: すべて解決
- `<html lang="ja">`: 全ページあり
- NGワードチェック（build内）: パス

## 修正提案（src側diff）

distを直接直しても次のビルドで消えるため、すべてsrc側の修正案。**適用はユーザー承認後**。

### data/src/pages/page2.astro（問題1,2,3,6を一括解消）

```diff
   <Heading>Page2</Heading>
-  <div id="dup-check-target">
-    <p>TODO: 本番前にダミー画像を差し替える</p>
-    <img src="/favicon.svg" width="64" height="64" />
-  </div>
-  <div id="dup-check-target">
-    <a href="/recruit/">採用情報</a>
-  </div>
+  <div id="intro-image">
+    <img src="/favicon.svg" alt="サイトロゴ" width="64" height="64" />
+  </div>
+  <div id="recruit-link">
+    <a href="/recruit/">採用情報</a>
+  </div>
```

※ 画像・リンク先は本番用の実体が必要。`/recruit/` ページを作らないならリンクごと削除。h1化するなら `<Heading as="h1">Page2</Heading>`。

### data/src/components/All/Modal/Modal.astro（問題7）

```diff
-      <button autofocus data-role="close">close</button>
+      <button type="button" autofocus data-role="close">close</button>
```

### data/src/components/All/Carousel/CarouselPagination.ts（問題8）

```diff
     dotsNode.innerHTML = emblaApi
       .scrollSnapList()
-      .map(() => '<button class="embla__dot" type="button"></button>')
+      .map((_, index) => `<button class="embla__dot" type="button" aria-label="スライド${index + 1}へ移動"></button>`)
       .join('');
```

### data/src/components/All/Carousel/CarouselPagination.scss（問題9）

```diff
 .embla__dot {
-  --dot-size: #{rem(12)};
+  --dot-size: #{rem(24)};
```

（見た目を12pxのまま維持したい場合は疑似要素で描画し、実要素を24pxにする方法もある）

### data/src/components/All/Accordion/Accordion.astro（問題10）

```diff
-  <summary class="sample-accordion_summary" data-role="summary" aria-label="summary">
+  <summary class="sample-accordion_summary" data-role="summary">
```

### data/src/pages/index.astro（問題4,5,13,14）

```diff
-    <TextLink href="/about" text="詳細はこちら" />
+    <TextLink href="/page2/" text="Page2の詳細はこちら" />
```

```diff
-    <TextLink href="/docs" text="ドキュメント" iconName="check" iconPosition="left" />
+    <TextLink href="/page3/" text="ドキュメント" iconName="check" iconPosition="left" />
```

（サンプル表示が目的なら、実在ページへの差し替えでなくデモ用URLへの変更でも可。要ユーザー判断）

```diff
-  <Button class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>
+  <Button as="button" type="button" class="js-modal-button" data-modal-id="sample-modal">OPEN MODAL</Button>
```

### data/src/pages/page3.astro（問題12）

```diff
-  <Heading>Page3</Heading>
+  <Heading as="h1">Page3</Heading>
```

## 次のステップ

1. 上記修正の承認可否を確認（特にリンク切れ3件は差し替え先の判断が必要）
2. 修正適用 → `cd data && npm run build` で再ビルド
3. 該当検査（html-validate / link-integrity / axe / project-specific）のみ再実行して解消を確認
4. 判定 ✅ になったら `npm run delivery` で納品物生成
