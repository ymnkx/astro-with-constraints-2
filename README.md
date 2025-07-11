# Astro With Constraints

## 概要

- このプロジェクトは Astro を基盤としたデザインシステム・フロントエンド開発プロジェクトです。
- フロントエンドがビルドした後、バックエンドが編集する（組み込む）ことを考慮しています。
- 具体的には、人間が読みやすく、更新が管理しやすいHTMLをビルドします。

## Commands

| Command                    | Action                                            |
| :------------------------- | :------------------------------------------------ |
| `npm install`              | 必要なパッケージをインストールする                |
| `npm run dev`              | ローカル開発サーバーを立ち上げる `localhost:4321` |
| `npm run build`            | テスト用データを `./dist/` に生成する             |
| `npm run preview`          | buildしたテスト用データを確認する                 |
| `npm run delivery`         | 納品用データを `./build/` に生成する              |
| `npm run make-svg-sprite`  | svg スプライトを生成する                          |
| `npm run convert-webp`     | jpg や png を webp に変換する                     |
| `npm run style-dictionary` | Design Token の JSON を scss ファイルに変換する   |

## Directory

```text
/
├── build/   ... 納品用ビルドデータ
├── convert/ ... webP変換用
├── dist/    ... テスト用ビルドデータ
├── documents/    ... ドキュメントデータ
├── public/
│   ├── assets/
│   │   ├── image/
│   │   └── svg/
│   └── favicon.svg
├── scripts/  ... node.js用script
├── src/
│   ├── components/
│   ├── data/
│   ├── icons/
│   ├── layouts/
│   ├── pages/
│   ├── scripts/
│   └── styles/
├── tokens/    ... Design Tokens データ
└── package.json
```

## css/js

- Viteプラグインを使用し、`./src/components` ディレクトリ内でまとめます。
- ビルドすると1CSS+1JSが生成されます。
- キャッシュ対応はバックエンドと相談して決めます（必要ならhashをつける）

## Design Tokens

- マスターデータは `./tokens/` に json ファイルで保存します。
  - json ファイルは３種類あります。
    - Figma variables を変換したJSON `./tokens/figma/`
    - 実装で追加したトークンのJSON `./tokens/other/`
    - 複数の値を組み合わせogあ複合トークンのJSON `./tokens/composite/`
- style dictionary を使用して scss ファイルに変換します。
  - 変換は npm scripts `npm run style-dictionary` で実行します。
  - デザイントークンはcssカスタムプロパティに変換されます。
  - 複合トークンはscssのmixinに変換されます。

## Images

- Astro 画像コンポーネントは使用しません。
- npm scripts `npm run convert-webp` を使用して webp 画像に変換します。
- 変換したい画像ファイル（jpgやpng）は、`/convert/` ディレクトリに配置します。
- 使用するwebp画像は手動で `/public/` に移します。
- 自動変換も可能なので、必要に応じて改善する。

## Icon

- SVGスプライト方式を採用しました。
- `/src/icons/` にSVGファイルを入れます。
- Viteプラグインを使用し、自動でSVGスプライトを生成されます。
  - 生成するSVGスプライトは `/public/assets/svg/icons.svg`。
- IconコンポーネントでSVGスプライトを参照しています。
- Iconコンポーネントを使用してデザイン上に配置します。
