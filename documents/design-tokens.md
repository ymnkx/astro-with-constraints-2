# デザイントークン

- マスターデータは `./tokens/` に json ファイルで保存する
  - json ファイルは３種類ある
    - Figma variables を変換したJSON `./tokens/figma/`
    - 実装で追加したトークンのJSON `./tokens/other/`
    - 複数の値を組み合わせogあ複合トークンのJSON `./tokens/composite/`
- style dictionary を使用して scss ファイルに変換する
  - 変換は npm scripts `npm run style-dictionary` で実行する
  - デザイントークンはcssカスタムプロパティに変換
  - 複合トークンはscssのmixinに変換
