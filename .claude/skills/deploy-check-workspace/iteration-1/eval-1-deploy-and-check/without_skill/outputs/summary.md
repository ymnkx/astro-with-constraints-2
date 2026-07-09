# デプロイ＆チェック サマリー

## 結論にゃ

**チェック7項目中4項目PASS・3項目FAIL（計40件の問題）。リンク切れ2件が納品物に含まれるため、納品処理（`npm run delivery`）は実行を見送ったにゃ。** 下記の修正後に `npm run delivery` を実行すれば納品データが `./build/` に生成されるにゃ。

## 検査結果一覧

| 検査 | 判定 | 検出数 |
|------|------|--------|
| ESLint（`npm run lint`） | PASS | 0 |
| ビルド（`npm run build`、3ページ生成） | PASS | 0 |
| NGワードチェック（dist） | PASS | 0 |
| Stylelint（scss/astro） | FAIL | 37 errors |
| プレビュー表示確認（port 4330、curl） | PASS | 全ページ・全アセット 200 |
| 内部リンク検査（dist の全 href/src を HTTP 検証） | FAIL | 404 × 2（/about, /docs） |
| Prettier フォーマット | FAIL | 1ファイル（CRLF） |

詳細は同ディレクトリの `check-report.md`、デプロイ判断は `deploy-decision.md` を参照にゃ。

## 修正提案（srcは変更していないので、以下を適用してほしいにゃ）

### 1. リンク切れ修正（必須・納品ブロッカー）

`src/pages/index.astro` の 37行目・41行目が存在しないルートを指してるにゃ。

```astro
<!-- 現状 -->
<TextLink href="/about" text="詳細はこちら" />
<TextLink href="/docs" text="ドキュメント" iconName="check" iconPosition="left" />
```

対応は次のいずれかにゃ:

- a) `/src/pages/about.astro` と `/src/pages/docs.astro` を作成する
- b) 既存ページに差し替える（例: `href="/page2/"`, `href="/page3/"`）
- c) バックエンド組み込み後に提供されるルートなら、そのまま納品でOK（この場合は教えてほしいにゃ。すぐ delivery を実行するにゃ）

### 2. Stylelint 37件（36件は自動修正可能）

```bash
npx stylelint "src/**/*.scss" "src/**/*.astro" --fix
```

- `@forward "./xxx.scss"` → `@forward "./xxx"`（拡張子を外す、33件）
- `reset.scss` の `currentColor` → `currentcolor`、`display` の宣言順入れ替え
- 自動修正できない残り1件は `reset.scss` のベンダープレフィックス。reset由来の意図的な記述なので、ルール側で許可するのが良いにゃ:

```json
// .stylelintrc.json
"property-no-vendor-prefix": [true, { "ignoreProperties": ["text-size-adjust"] }]
```

### 3. Prettier（改行コード）

`src/styles/_develop/+.scss` が CRLF になってるにゃ。

```bash
npx prettier --write src/styles/_develop/+.scss
```

### 4. おまけ提案

- `@astrojs/check` + `typescript` を入れて `astro check`（型チェック）をCIに追加すると安心にゃ: `npm i -D @astrojs/check typescript`
- stylelint が npm scripts に無いので `"lint:css": "stylelint 'src/**/*.scss' 'src/**/*.astro'"` を追加して build 前に回すのがおすすめにゃ
- 今回のようなリンク切れを機械検出するため、`check-ng-words` と同様の内部リンクチェッカーを delivery パイプラインに足すと再発防止になるにゃ

## 次のアクション

1. 上記1（リンク切れ）を修正 or 「バックエンド提供ルートだからOK」と判断
2. `npm run delivery` を実行 → `./build/htdocs/` に納品データ生成
