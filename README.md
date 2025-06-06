# Astro With Constraints

- ビルドファイルに制約が多いプロジェクト向けの開発環境です。
- フロントエンドがビルドした後、バックエンドが編集する（組み込む）ことを考慮しています。
- 具体的には、人間が読みやすく、更新が管理しやすいHTMLをビルドします。

## Project Structure

[ディレクトリ構成](/documents/directory.md)　
[コンポーネント構成](/documents/component.md)
[Design Tokens](/documents/design-tokens.md)
[CSS設計](/documents/css-architecture.md)

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

## Images

- Astro 画像コンポーネントは使用しません。
- npm scripts `npm run convert-webp` を使用して webp 画像に変換します。
- 変換したい画像ファイル（jpgやpng）は、`/convert/` ディレクトリに配置します。
- 使用するwebp画像は手動で `/public/` に移します。
