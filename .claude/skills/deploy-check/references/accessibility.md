# アクセシビリティチェック

2段構えで検査する: (1) Lighthouseのaccessibilityカテゴリ（内部でaxe-coreが動く = 機械検査の定番）、(2) 機械検査では判定できない項目の静的チェック。

## 1. axe-core（Lighthouse経由）

ページごとに実行:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
npx --yes lighthouse "http://localhost:4321/" \
  --only-categories=accessibility \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path=<スクラッチパッド>/a11y-<ページ名>.json \
  --quiet
```

`audits` のうち `score: 0` のものを列挙する。各auditの `details.items` に該当ノードのHTMLスニペットが入っているので、それを必ず控える（src特定と修正提案に使う）。

## 2. 静的チェック（distのHTMLを直接読んで判定）

axe-coreが拾えない・判定できない項目。ページごとにHTMLを読んで確認する:

- **見出し階層**: h1が1ページに1つか、h2→h4のような飛びがないか
- **altの内容**: alt属性の存在だけでなく中身。`alt="画像"` `alt="img_01"` のような無意味な値、意味のある画像の `alt=""` を検出する（判断がつかなければinfoで報告）
- **lang属性**: `<html lang="ja">` があるか
- **リンクテキスト**: 「こちら」「詳しくはこちら」だけのリンクがないか
- **target="_blank"**: 新規タブで開くことがテキストや視覚情報で伝わるか（機械判定不能なのでinfoで列挙のみ）
- **フォーム**: input/select/textareaにlabelまたはaria-labelが対応しているか

## severityの割り当て

- axe-coreのerror（score: 0のaudit）→ error
- 静的チェックで明確にNG（lang欠落、h1なし、label無しフォーム）→ error
- 疑わしいが人間の判断が要るもの（altの質、リンクテキスト）→ warning または info

## 報告フォーマット

各問題に axe の rule ID（例: `color-contrast`, `image-alt`）を含めること。修正方法の検索性が上がる。
