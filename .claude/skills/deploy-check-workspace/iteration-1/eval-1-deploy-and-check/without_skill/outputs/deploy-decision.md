# デプロイ（納品処理）実行判断

## 判断: 実行しない（見送り）

`npm run delivery`（納品用データを `./build/` に生成する処理）は **実行していない**。

## 理由

1. **納品物に含まれるリンク切れを検出したため（主因）**
   - `src/pages/index.astro` 由来の `/about` と `/docs` へのリンクが、ビルド成果物上で 404 になることをプレビューサーバー（port 4330）で確認した。
   - `delivery` は dist をそのまま `build/htdocs/` にコピーして整形する処理であり、実行すると既知の不具合を含むデータが「納品データ」として確定してしまう。
2. **今回の作業ルール上、src の修正が禁止されているため**
   - リンク切れの修正は `src/pages/index.astro` の変更が必要で、提案のみに留めた。修正なしで納品処理だけ先行させる利点がない。
3. **可逆性・実害の観点**
   - build/ 生成自体はローカル処理で外部公開はされないが、「納品＝品質保証済み」の意味を持つ成果物に既知の404を含めるべきではないと判断した。

## 参考情報

- delivery の前提となる `npm run build`（astro build + NGワードチェック）と `npm run lint` は **すべて成功**しており、リンク修正さえ入れば即座に納品可能な状態。
- Stylelint 37件・Prettier 1件は出力HTMLの品質には影響しない（ビルド成果物は正常）ため、単独では納品ブロッカーとしていない。
- 例外条件: `/about`・`/docs` がバックエンド組み込み側で提供されるルートである場合は問題ではないため、その場合は `npm run delivery` をそのまま実行してよい。

## 実行した場合の手順（承認後）

```bash
cd /Users/yamanaka_tomohiro/github/astro-with-constraints-2/data
npm run delivery   # build → build/htdocs へコピー → prettier整形 → 空行削除 → ファイルリスト生成
```
