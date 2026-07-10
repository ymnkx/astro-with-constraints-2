---
name: component-rules
description: このプロジェクトのAstroコンポーネント開発ルール（4カテゴリのディレクトリ分類・配置判断・.astro/.scss/.ts構成・Props型定義・単一責任）。src/components配下でコンポーネントを新規作成・リファクタするときに必ず読むこと。スタイルの詳細規約はscss-rulesスキルを併せて参照。
---

# コンポーネント開発

## 参考データ

- [TemplateComponent.astro](../../../src/components/Template/TemplateComponent.astro)
- [TemplateComponent.scss](../../../src/components/Template/TemplateComponent.scss)

このコンポーネントを参考にコンポーネントの作成を行うこと。

## コンポーネントの分類（4カテゴリ）

`src/components/` 直下は役割ごとに 4 つに分かれる。**新規作成時はまずどれに属するか決める。**

```
src/components/
├── Common/     … layout に組み込むパーツ（Header / Footer / Navi / Layout 等）
├── Blocks/
│   ├── Base/   … どのページにも置ける汎用ブロック
│   └── Unique/ … そのページ固有のブロック（ページ名でグルーピング）
├── Parts/      … block 内で使える汎用的な要素（Button / Heading / Icon 等）
└── Template/   … 作成の参考にするテンプレート
```

### Common — レイアウト部品

- レイアウト（`src/layouts/Base.astro`）に組み込む共通パーツ。ヘッダー・フッター・ナビ・レイアウト枠・`<head>` 系など。
- 配置: `src/components/Common/[Name].astro`（フラット。関連が多い場合のみ `Common/[Group]/` にまとめる。例: `Common/JsonLD/`）
- 例: `CommonHeader` / `CommonFooter` / `CommonNavi` / `CommonLayout` / `CommonHead`

### Blocks — ページの中身を構成するブロック

page（`src/pages/*.astro`）が layout の slot 内に直接配置する要素。`base` と `unique` の 2 種類。

- **Base（汎用ブロック）**: どのページにも置ける。
  - 配置: `src/components/Blocks/Base/[BlockName]/[BlockName].astro`
  - 例: `Blocks/Base/Session` / `Blocks/Base/PageHead`
- **Unique（固有ブロック）**: そのページ専用。**ページ名でグルーピングする。**
  - 配置: `src/components/Blocks/Unique/[PageName]/[BlockName]/[BlockName].astro`
  - 例: `Blocks/Unique/Top/TopKv` / `Blocks/Unique/Second/SecondBlock`

### Parts — ブロック内の汎用要素

- block の中で使い回す最小単位のUI部品。
- 配置: `src/components/Parts/[PartName]/[PartName].astro`
- 例: `Button` / `Heading` / `Icon` / `Modal` / `Carousel` / `CarouselItem` / `Accordion` / `TextLink` / `Full`

## 組み合わせの階層（依存の向き）

上位が下位を使う。逆方向の依存は作らない。

```
layout ── Common を組み込む
  └ page ── slot 内に Blocks（Base / Unique）を配置
       └ Block ── 内部で Parts を使う
            └ Parts ── 最小単位（他の Parts の組み合わせは可）
```

- Common は layout 専用。page から直接呼ばない。
- Block は Parts を組み合わせて作る（Block が別 Block を内包しない）。
- Unique ブロックのスタイル/スクリプトはそのページからのみ読み込む。

## ファイル構成

- まず構造となる Astro ファイルを作成: `ComponentName.astro`（テンプレート）
- 次にスタイル: `ComponentName.scss`
- クライアント処理（クリック等）が必要な場合のみ: `ComponentName.ts`
  - ts は本当に必要なときだけ。**作成前に内容を説明し、承認を得てから作る。**
- 同一ディレクトリ内に全ファイルを配置し、ディレクトリ名とファイル名を一致させる
- ファイル名は PascalCase

## Astro ファイルの制約

- 先頭に必ず frontmatter `---` を含める
- `<style>` と `<script>` タグは絶対に含めない（外部ファイルに分離）
- Astro で必要な型定義は Astro ファイル内に記述し、ts ファイルは使わない
- 他コンポーネントの import は `@` から始まる alias path を使う
- コメントで簡単な説明を追加する

## コンポーネント設計

- Props は TypeScript で型定義（詳細は `ts-rules`）
- 単一責任の原則を守る
- 再利用可能な設計を心がける

## スタイリング

- SCSS を使用、デザイントークンを必ず使用、BEM 記法（詳細は `scss-rules` スキルを参照）
