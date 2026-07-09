---
name: component-rules
description: このプロジェクトのAstroコンポーネント開発ルール（ディレクトリ構造・.astro/.scss構成・Props型定義・単一責任）。src/components配下でコンポーネントを新規作成・リファクタするときに必ず読むこと。スタイルの詳細規約はscss-rulesスキルを併せて参照。
---

# コンポーネント開発

## 参考データ

- [TemplateComponent.astro](../../../src/components/Template/TemplateComponent.astro)
- [TemplateComponent.scss](../../../src/components/Template/TemplateComponent.scss)

このコンポーネントを参考にコンポーネントの作成を行うこと。

## ディレクトリ構造

`src/components/[カテゴリ]/[コンポーネント名]/`

以下のセクションで構成される:

- Astro コンポーネント（.astro）: HTML 構造とサーバーサイドロジック
- スタイル（.scss）: コンポーネント固有のスタイル

## コンポーネント設計

- Props は TypeScript で型定義
- 単一責任の原則を守る
- 再利用可能な設計を心がける

## スタイリング

- SCSS を使用
- デザイントークンを必ず使用
- BEM 記法を推奨（詳細は `scss-rules` スキルを参照）
