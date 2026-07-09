# デプロイ前チェックレポート

- 実行日時: 2026-07-06 21:40 (JST)
- 対象コミット・ブランチ: なし（gitリポジトリ未初期化）
- プロジェクト: Astro With Constraints2（`data/` 配下、`projectDirectory: '/'`）
- 検査対象: 3ページ（全ページ検査、省略なし）
  - `/` (dist/index.html)
  - `/page2/` (dist/page2/index.html)
  - `/page3/` (dist/page3/index.html)
- ビルド: ✅ 成功（`npm run build` = astro build + check-ng-words、NGワード検出なし）
- プレビューサーバー: port 4322 で実行（4321使用中のため）、検査後に停止済み

## 判定: ❌ 要修正

error 23件 / warning 2件 / info 4件。errorが1件以上あるためデプロイ不可。
ただし error の大半は2種類の原因（ナビゲーションの `aria-hidden` 設計、リンク先未作成）に集約される。

## サマリー

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator（HTML構文） | ❌ | 16 | 0 |
| lighthouse（perf/SEO/best-practices） | ✅ 全カテゴリ100点 | 0 | 0 |
| accessibility | ❌ | 5 | 2 |
| link-integrity（リンク/アセット） | ❌ | 2 | 0 |
| project-specific（案件固有） | ➖ 未設定 | 0 | 0 |
| **合計** | | **23** | **2** |

## 検出された問題（severity降順）

### E1. [error ×15] hidden-focusable — 閉状態ナビ内にフォーカス可能要素（全3ページ）

- 対象: 全3ページ / index.html line 50, 60, 64, 68, 75（page2: 53, 63, 67, 71, 78 / page3: 50, 60, 64, 68, 75）
- 内容: 閉状態の `.sample-navigation_contents[aria-hidden="true"]` 内に close ボタン・page1/page2/page3 リンク・trap ボタンが存在し、`aria-hidden` な要素がフォーカス可能（html-validate: hidden-focusable）
- src: `data/src/components/All/Navigation/Navigation.astro`（開閉制御は `Navigation.ts`）
- 修正案:
  - 案A（推奨）: `aria-hidden` の代わりに `inert` 属性で閉状態を表現する（フォーカスもARIAも一括で隠せる）
  - 案B: `Navigation.ts` の開閉処理で内部フォーカス可能要素に `tabindex="-1"` を付け外しする
  - 注意: trap ボタン（line 75）は `aria-hidden` 直付けのため、フォーカストラップの設計自体を見直すこと

```diff
# 案A: Navigation.astro
- <div class="sample-navigation_contents" aria-hidden="true" ...>
+ <div class="sample-navigation_contents" inert ...>

# Navigation.ts の開閉トグルも aria-hidden → inert の付け外しに変更
- contents.setAttribute('aria-hidden', String(!isOpen))
+ isOpen ? contents.removeAttribute('inert') : contents.setAttribute('inert', '')
```

### E2. [error ×5] アクセシビリティ違反（index）

1. **[axe: button-name]** `/` カルーセルのドットボタン×5にアクセシブルネームがない
   - src: emblaカルーセルのドット生成JS。初期化時に `aria-label` を付与する
   ```diff
   + dotNode.setAttribute('aria-label', `スライド${index + 1}へ移動`)
   ```
2. **[axe: label-content-name-mismatch]** index line 199: `summary` の `aria-label="summary"` が可視テキスト「Accorion Label」と不一致
   - src: Accordionコンポーネント。`aria-label` を削除（可視テキストで十分）
3. **[axe: target-size]** ドットボタンが12×12pxで最小タップ領域24×24px未満
   - src: カルーセルのCSS。`min-width/min-height: 24px` か padding で拡大
4. **[静的]** index line 216: モーダルトリガーが `<span class="js-modal-button">` でキーボード操作不能
   - src: `data/src/components/All/Modal/Modal.astro`（トリガー側）。`<button type="button">` に変更
5. **[静的]** page2 / page3 に `h1` が存在しない（h2のみ）
   - src: `data/src/pages/page2.astro` `page3.astro`（またはレイアウト）。ページタイトルを `h1` に

### E3. [error ×2] 内部リンク切れ（index）

1. index.html line 168: `<a href="/about">`（「詳細はこちら」）→ dist に存在せず404
   - src: `data/src/pages/index.astro` line 37 `<TextLink href="/about">`
2. index.html line 175: `<a href="/docs">`（「ドキュメント」）→ dist に存在せず404
   - src: `data/src/pages/index.astro` line 41
- 修正案: ページを作成する / 正しい遷移先（`/page2/` 等）に変更する / リンクを削除する。デモ用サンプルの可能性があるが、公開すれば404になるのは事実なので要判断。

### E4. [error ×1] no-implicit-button-type（index）

- 対象: index.html line 229、モーダル閉じるボタンに `type` 属性なし（暗黙の `type="submit"`）
- src: `data/src/components/All/Modal/Modal.astro`
```diff
- <button class="...">
+ <button type="button" class="...">
```

### W1. [warning] indexの `h1` が本文中盤に出現し文書アウトラインが不自然
- src: `data/src/pages/index.astro` の見出し構成を見直し（h1をページ先頭領域へ）

### W2. [warning] 「詳細はこちら」リンクが単体で遷移先不明（リンクテキストの具体化推奨）
- src: `data/src/pages/index.astro` line 37 付近。「◯◯の詳細を見る」等に

### info（対応任意）
- 全ページで Google Fonts (Roboto) がレンダーブロッキング（約858ms、推定節約530〜700ms）→ `preconnect` + `display=swap` か自己ホスト化
- `all.css`（3KB）はインライン化検討
- `target="_blank"` の新タブ告知がスクリーンリーダー非対応
- 装飾SVGに `aria-hidden="true"` なし

## Lighthouseスコア一覧

| ページ | performance | seo | best-practices | accessibility |
|---|---|---|---|---|
| `/` | 100 | 100 | 100 | **87** |
| `/page2/` | 100 | 100 | 100 | 100 |
| `/page3/` | 100 | 100 | 100 | 100 |

参考（ローカル計測値）: `/` LCP 1463ms / CLS 0 / TBT 0ms、`/page2/` LCP 1436ms、`/page3/` LCP 1435ms

## 案件固有チェック結果

`checks/project-specific.md` がテンプレートのままのため **案件固有チェックは未設定**（検証実施なし）。案件要件が固まったらチェックリストを追記すること。Lighthouseスコア閾値の上書きもなし（デフォルト90）。

## 検査環境の注記

- Node v20.10.0 のため html-validate@11（Node 22+必須）が動かず、**html-validate@8系** で検査した
- Lighthouse系はプレビューサーバー port 4322（4321が使用中だったため）に対して実行

## 次のアクション

1. E1〜E4 のsrc修正（提案のみ、未適用。承認後に適用 → 再ビルド → 該当検査のみ再実行）
2. `/about` `/docs` リンクの扱い（作成 / 差し替え / 削除）をユーザー判断
3. 修正後に `deploy-check` を再実行し ✅ を確認してから `npm run delivery`
