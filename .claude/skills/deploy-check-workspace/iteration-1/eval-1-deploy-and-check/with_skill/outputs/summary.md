# デプロイ前チェック 結果サマリー

ビルドは成功したにゃ。でも検査で **error 24件** 見つかったから、判定は **❌ 要修正** — 納品処理（`npm run delivery`）は実行していないにゃ。詳細はリポジトリルートの `deploy-check-report.md` を見てにゃ。

## 検査結果一覧（3ページ全ページ検査、省略なし）

| 検査 | 結果 | error | warning |
|---|---|---|---|
| HTML構文（html-validate） | ❌ | 16 | 0 |
| パフォーマンス/SEO（Lighthouse） | ✅ 全ページ全カテゴリ100点 | 0 | 0 |
| アクセシビリティ（axe + 静的） | ❌ `/` スコア87 | 6 | 3 |
| リンク/アセット整合性 | ❌ 内部リンク切れ2件 | 2 | 0 |
| 案件固有チェック | ⚪ 未設定（テンプレのまま） | 0 | 0 |

## 主な問題（実質8グループ）と修正提案（すべてsrc側）

1. **Navigationの `aria-hidden` 配下にフォーカス可能要素**（15件・全ページ） — `data/src/components/All/Navigation/Navigation.astro` L11/L27 と `Navigation.ts` L46-47/L83-85 で `aria-hidden` を `inert` に置換。共通コンポーネントなので1箇所の修正で15件全部消えるにゃ
2. **カルーセルのドットにaria-labelなし** — `data/src/components/All/Carousel/CarouselPagination.ts` L9 の生成HTMLに `aria-label="Go to slide ${n+1}"` を追加
3. **ドットのタッチターゲットが12px**（最小24px必要） — `CarouselPagination.scss` の `.embla__dot` に擬似要素で24pxのヒット領域を追加
4. **`<summary>` のaria-labelが可視テキストと不一致** — `data/src/components/All/Accordion/Accordion.astro` L8 の `aria-label="summary"` を削除（`index.astro` L50 の "Accorion" typoも修正推奨）
5. **モーダルのトリガーが `<span>`**（キーボード操作不能） — `data/src/pages/index.astro` L57 を `<Button as="button" type="button" ...>` に（Buttonのデフォルトが `as='span'` のため）
6. **page2 / page3 に h1 がない** — `page2.astro` L14 / `page3.astro` L9 を `<Heading as="h1">` に（Headingのデフォルトはh2）
7. **モーダルcloseボタンに `type="button"` なし** — `data/src/components/All/Modal/Modal.astro` L11 に追加
8. **リンク切れ `/about` `/docs`**（デプロイ後404） — `data/src/pages/index.astro` L37/L41 のショーケース用ダミーリンクを実在パス（`/page2/` 等）か `#` に変更

全部に diff 形式の修正案を `deploy-check-report.md` に書いてあるにゃ。どれも数行の変更で、承認をもらえれば適用 → 再ビルド → 該当検査だけ再実行して ✅ になったら `npm run delivery` を実行できるにゃ。

## おまけ

- Lighthouseは performance / seo / best-practices 全ページ100点で優秀にゃ（accessibilityのみ `/` が87）
- 案件固有チェックリスト（`.claude/skills/deploy-check/checks/project-specific.md`）がテンプレのままだから、案件用に書いておくと次回から自動検証されるにゃ
- html-validate最新版はNode 20.10.0だと起動しない（検査はNode 24.16.0で実施）。CI利用ならバージョン固定かNode 20.12+推奨にゃ【推測】
