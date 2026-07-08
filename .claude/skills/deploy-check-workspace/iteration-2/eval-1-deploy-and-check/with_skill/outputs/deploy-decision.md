# デプロイ（納品処理）の扱い

## 結論: `npm run delivery` は実行していない

## 理由

1. ユーザーの依頼は「デプロイとチェックをして」であり、納品処理まで明示的に求められているケースに該当する。
2. しかし deploy-check スキルの規定では、納品処理は「**判定 ✅ のときのみ、ユーザーに実行確認を取ってから**実行する。⚠️/❌ では実行せず修正提案を提示して止まる」。
3. 今回のチェック結果は **判定 ❌（error 25件 / warning 52件）** のため、実行条件を満たさない。
   - html-validator: error 16（Navigation の aria-hidden × フォーカス可能要素、Modal の button type 未指定）
   - accessibility: error 6（ドットボタンの名前なし、h1欠落、spanトリガー等）
   - link-integrity: error 3（/about・/docs リンク切れ、.DS_Store 混入）
4. 特にリンク切れ2件と `.DS_Store` の納品物混入は納品事故に直結するため、このまま納品物を生成すべきでない。

## 実行した範囲

- `npm run build`（astro build + check-ng-words）は実行し成功 — これは検査の前提であり納品処理ではない。
- `npm run delivery`（build/htdocs への納品物生成）は未実行。

## 納品までの手順（修正後）

1. deploy-check-report.md の error（E1〜E11）を src 側で修正
2. `npm run build` で再ビルド + 該当検査のみ再実行
3. 判定 ✅ を確認後、ユーザーの承認を得て `npm run delivery` を実行

## 補足

このプロジェクトに外部サーバーへのアップロード工程はない（`delivery` = `build/htdocs` への納品物生成まで）。
