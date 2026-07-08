# 納品前チェック 最終サマリー

## 判定: ❌ 要修正（このままの納品は不可にゃ）

ビルドは成功（3ページ生成、NGワードチェックもパス）だけど、生成物の検査で **error 12件（実質・重複統合後）/ warning 3件** を検出したにゃ。全部src側の軽い修正で直せるにゃ。詳細はリポジトリルートの `deploy-check-report.md` にゃ。

## 検査の内訳

| 検査 | 結果 | error | warning |
|---|---|---:|---:|
| html-validator（HTML構文） | ❌ | 3 | 0 |
| lighthouse（perf/seo/best-practices） | ⚠️ | 0 | 1 |
| accessibility（axe + 静的） | ❌ | 6 | 4 |
| link-integrity（リンク/アセット） | ❌ | 3 | 0 |
| project-specific（案件固有） | ❌ | 2 | 0 |

Lighthouseスコア: performance 全ページ100 / seo 100・91・100 / best-practices 全100 / accessibility 87・93・100。

## 直すべきポイント（優先度順）

### 納品ブロッカー（error）

1. **page2に開発用文言が残存** — `<p>TODO: 本番前にダミー画像を差し替える</p>`
   → `data/src/pages/page2.astro:16` を本番コンテンツに差し替え
2. **page2の img に alt なし**（SEOスコア91の原因も同じ）
   → `data/src/pages/page2.astro:17` に `alt` 追加
3. **page2で id="dup-check-target" が重複**
   → `data/src/pages/page2.astro:15,19` の一方をリネーム
4. **内部リンク切れ 3件**: `/about`・`/docs`（`data/src/pages/index.astro:37,41`）、`/recruit/`（`data/src/pages/page2.astro:20`）
   → 実在ページへ差し替え or ページ追加 or 削除（差し替え先は要判断にゃ）
5. **モーダルcloseボタンに type なし**
   → `data/src/components/All/Modal/Modal.astro:11` に `type="button"`
6. **カルーセルのドットボタンにaria-labelなし + 12pxでタッチターゲット過小**
   → `data/src/components/All/Carousel/CarouselPagination.ts:9` で `aria-label` 付与、`CarouselPagination.scss` で `--dot-size` を24px以上に
7. **アコーディオンの `aria-label="summary"` が可視テキストと不一致**
   → `data/src/components/All/Accordion/Accordion.astro:8` の aria-label を削除
8. **page2・page3 に h1 がない**
   → `<Heading as="h1">` に変更（Headingのデフォルトはh2）

### 推奨修正（warning）

- トップの「詳細はこちら」リンクは単体で遷移先が分かる文言に
- 「OPEN MODAL」トリガーが `<span>`（キーボード操作不可）→ `<Button as="button">` に
- トップの見出し順序（h2が先頭、h1が途中）を整理

## 具体的なdiff

`deploy-check-report.md` の「修正提案（src側diff）」セクションに全ファイル分の差分を用意済みにゃ。distを直接直しても次のビルドで消えるので、必ずsrc側で直すにゃ。

## 修正後の流れ

1. 修正の承認をもらう（特にリンク切れ3件の差し替え先）
2. 適用 → `cd data && npm run build`
3. 該当検査だけ再実行して解消確認
4. ✅ になったら `npm run delivery` で納品物生成にゃ

※ 検査サーバー（port 4322）は停止済み。srcは一切変更していないにゃ。
