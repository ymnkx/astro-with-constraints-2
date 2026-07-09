# パフォーマンス + SEOチェック（Lighthouse）

Lighthouse CLIをnpx + システムのChrome（headless）で実行する。プレビューサーバーが起動済みであることが前提。

## 実行手順

ページごとに実行する（同時実行はしない — Chromeのポート競合とスコアのブレの原因になる）:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
npx --yes lighthouse "http://localhost:4321/" \
  --only-categories=performance,seo,best-practices \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path=<スクラッチパッド>/lh-<ページ名>.json \
  --quiet
```

初回はnpxのダウンロードで数分かかることがある。タイムアウトは300秒以上に設定すること。

## 結果の読み方

JSONから抽出するもの:

- `categories.performance.score`, `categories.seo.score`, `categories['best-practices'].score`（0〜1。100倍して報告）
- スコアが1未満のカテゴリについて、`audits` の中で `score < 0.9` かつ `scoreDisplayMode` が `binary` / `numeric` のものを列挙
- performanceは `audits.metrics.details.items[0]` から LCP / CLS / TBT の実測値も添える

## severityの割り当て

- カテゴリスコア < 50 → error
- カテゴリスコア 50〜89 → warning
- 個別audit失敗のうちSEO実害が直接的なもの（`document-title`, `meta-description`, `http-status-code`, `is-crawlable`, `canonical`）→ error

## 注意

- localhost計測なのでネットワーク由来の指標は本番より良く出る。「ローカル計測値」であることをレポートに明記する。
- スコアはブレる。performanceが85〜92のような閾値ぎわの場合は1回再計測して安定している方を採用する。
