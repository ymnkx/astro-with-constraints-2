# デプロイ前チェック サマリー

## 判定: ❌ 要修正（error 23件 / warning 2件）

ビルドは成功（NGワードなし）、全3ページを検査。詳細は `deploy-check-report.md` 参照。

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator | ❌ | 16 | 0 |
| lighthouse (perf/seo/best-practices) | ✅ 全ページ100点 | 0 | 0 |
| accessibility | ❌ (/=87, page2/3=100) | 5 | 2 |
| link-integrity | ❌ | 2 | 0 |
| project-specific | ➖ 未設定（テンプレのまま） | 0 | 0 |

error 23件だが、原因は実質4グループに集約される。

## 修正提案（srcのみ、未適用 — 承認後に適用します）

### 1. ナビの `aria-hidden` → `inert` 化（error 15件を一括解消）

`data/src/components/All/Navigation/Navigation.astro` + `Navigation.ts`
閉状態の `.sample-navigation_contents[aria-hidden="true"]` 内にフォーカス可能要素（closeボタン・リンク・trapボタン）が15箇所。

```diff
- <div class="sample-navigation_contents" aria-hidden="true" ...>
+ <div class="sample-navigation_contents" inert ...>
```
`Navigation.ts` の開閉トグルも `aria-hidden` の付け外し → `inert` の付け外しに変更。trapボタンはフォーカストラップ設計自体の見直しが必要。

### 2. リンク切れ2件（`/about` `/docs` が404）

`data/src/pages/index.astro` line 37 / 41 の `<TextLink href="/about">` と「ドキュメント」→ `/docs`。
→ ページ作成 / 実在パスへ差し替え / 削除 のいずれかをユーザー判断。デモ用サンプルなら削除推奨。

### 3. アクセシビリティ5件（index中心）

- カルーセルのドットボタン×5: embla初期化JSで `aria-label` 付与 + CSSで24×24px以上に
- Accordionの `aria-label="summary"`: 可視テキスト「Accorion Label」と不一致 → aria-label削除
- モーダルトリガー `<span class="js-modal-button">` → `<button type="button">` 化（キーボード操作不能）
- page2/page3 に h1 なし → ページタイトルを h1 に

### 4. Modal閉じるボタンに `type="button"` 追加（1件）

`data/src/components/All/Modal/Modal.astro`（暗黙submit防止）。

### warning / info（任意）

- indexのh1が本文中盤に出現、リンクテキスト「詳細はこちら」の具体化
- Google Fontsレンダーブロッキング約858ms → preconnect+display=swap or 自己ホスト化
- target="_blank" のSR告知、装飾SVGの aria-hidden

## 次のステップ

修正1〜4を適用 → 再ビルド → 該当検査を再実行 → ✅ になったら `npm run delivery`。

## 注記

- `checks/project-specific.md` がテンプレのままなので案件固有チェックは未設定
- Node v20.10.0 のため html-validate は 8系で実行（11系はNode 22+必須）
- プレビューサーバー（port 4322）は検査後に停止済み
