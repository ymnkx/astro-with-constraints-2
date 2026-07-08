# HTML構文チェック（html-validate）

html-validate は純Node製のHTMLバリデータ。ブラウザ不要で高速に動く。npxで実行する。

## 実行手順

1. 設定ファイルを作る（毎回スクラッチパッドに生成してよい）:

```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "no-trailing-whitespace": "off",
    "void-style": "off",
    "no-inline-style": "warn",
    "require-sri": "off"
  }
}
```

`no-trailing-whitespace` と `void-style` はビルド出力のフォーマット由来のノイズになりやすいのでオフにする。実質的な構文エラー（閉じタグ不整合、不正なネスト、重複ID、不正な属性値）の検出が目的。

2. dist内の全HTMLに対して実行（**必ずプロジェクトルートで**。nodenvが `.node-version` のNodeを適用する）:

```bash
npx --yes html-validate@11 --config <設定ファイルパス> "dist/**/*.html" --formatter json
```

JSONフォーマッタの出力をパースして、ファイル・行・ルールID・メッセージを整理する。

## バージョンについて

- **`html-validate@11` に固定する**（Node 22+ が必要。プロジェクトの `.node-version` = 24.x で動作確認済み: v11.5.5 + 上記設定で正常動作）。
- majorバージョンで検出ルールが変わり結果がブレる。実例: v8系は `hidden-focusable`（`aria-hidden`内のフォーカス可能要素）を検出できず、v11で15件検出された。バージョンを下げると検出漏れが起きる。
- 起動時にクラッシュする場合はNodeが古い証拠。バージョンを下げてしのぐのではなく、プロジェクトルートで実行しているか（`node --version` が `.node-version` と一致するか）を先に確認する。やむを得ず別バージョンで実行した場合は、使用バージョンと検出漏れの可能性をレポートに明記する。

## severityの割り当て

- html-validateの `severity: 2`（error）→ error
- `severity: 1`（warning）→ warning
- ただし以下は実害が大きいので warning でも error に格上げする:
  - `no-dup-id`（ID重複 — JSやアンカーが壊れる）
  - `element-permitted-content`（不正なネスト — ブラウザのDOM補正で表示崩れの原因）

## 修正提案のためのヒント

エラーはdistのHTML上の行番号で報告されるが、修正すべきはsrc側。エラー箇所の前後のHTML（クラス名・テキスト）を控えておき、集約側がsrcを特定できるようにすること。
