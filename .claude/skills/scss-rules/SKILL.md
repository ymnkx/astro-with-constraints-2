---
name: scss-rules
description: このプロジェクトのCSS/SCSS設計ルール（BEM厳格版・デザイントークン必須・rem関数・論理プロパティ・any-hover・禁止事項）。.scssファイルやコンポーネントのスタイルを新規作成・編集するとき、SCSSの命名やトークン・単位に迷ったときに必ず読むこと。
---

# CSS/SCSS 設計ルール

## 必須設定

### import ルール

- **全ての scss ファイルの 1 行目**に必ず以下を記述:

```scss
@use '@/styles/_develop/+.scss' as *;
```

## BEM 命名規則（厳格版）

### Block（ブロック）

- 2 ワードを `-` で繋ぐ（例：`button-primary`, `text-link`）
- 3 ワードの場合、キャメルケースで 2 ワードにまとめる（例：`sample-longName`, `longName-component`）
- **4 ワード以上は禁止**

### Element（要素）

- 1 ワードで記述、block の後に `_` で繋ぐ（例：`button-primary_text`, `text-link_icon`）
- 2 ワードの場合、キャメルケースで 1 ワードにまとめる（例：`button-group_sampleItem`）
- **3 ワード以上は禁止**

### Modifier（修飾子）

- `-` から始まるケバブケース（例：`-is-active`, `-icon-left`, `-large`）
- Block に直接付与: `.text-link.-icon-left`
- 状態を表現: `-is-loading`, `-is-disabled`

### 階層化の禁止

- Block と Element は階層化せず、個別の塊として記述

```scss
// ❌ 悪い例
.block_element_subelement

// ✅ 良い例
.block_element
.block_subelement
```

## CSS 変数（カスタムプロパティ）

### コンポーネント固有の変数

- `--this-` プレフィックスを使用

```scss
.component-name {
  --this-color-text: var(--color-text-primary);
  --this-gap: #{rem(8)};
  --this-transition: var(--easing-standard) 0.2s;
}
```

### デザイントークンの使用

- ハードコーディング値は禁止
- 必ずデザイントークンを使用
- デザイントークンは [design-tokens.scss](../../../tokens/design-tokens.scss) を参照
- 文字サイズは [design-composite.scss](../../../tokens/design-composite.scss) を参照

```scss
// ✅ 良い例
color: var(--color-text-primary);
gap: var(--spacing-md);
border-radius: var(--rounded-sm);

// ❌ 悪い例
color: #333333;
gap: 16px;
border-radius: 8px;
```

## 単位とサイズ指定

### rem 関数の使用

- **px 単位は禁止**（border-width 以外）
- 必ず SCSS の rem 関数を使用

```scss
// ✅ 良い例
width: #{rem(24)};
height: #{rem(16)};
margin: #{rem(12)};

// ❌ 悪い例
width: 24px;
height: 16px;
margin: 12px;
```

### border-width 例外

- `border-width` のみ px 使用を許可

```scss
border: 1px solid var(--color-border);
```

### 論理プロパティの使用

- 物理プロパティではなく論理プロパティを使用

```scss
// ✅ 良い例
margin-inline-start: #{rem(8)};
margin-block-end: #{rem(16)};
padding-inline: #{rem(12)};

// ❌ 悪い例
margin-left: #{rem(8)};
margin-bottom: #{rem(16)};
padding-left: #{rem(12)};
padding-right: #{rem(12)};
```

## インタラクティブ要素

### hover/focus の実装

- `any-hover` メディア特性を使用

```scss
@media (any-hover: hover) {
  .button:hover {
    background-color: var(--color-background-hover);
  }
}

// または hover メディア特性
@media (hover: hover) {
  .sample-button:hover {
    --this-color-bg: var(--this-color-bg-hover);
  }
}
```

### focus の実装

```scss
.component:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

## セレクタとネスト

### 親セレクタ参照

- `&` を使用して Modifier を実装

```scss
.text-link {
  &.-icon-left {
    flex-direction: row;
  }

  &.-icon-right {
    flex-direction: row-reverse;
  }
}
```

### 属性セレクタ

```scss
.text-link {
  &[target='_blank'] {
    &::after {
      content: '';
      // 外部リンクアイコン
    }
  }
}
```

### 子要素との組み合わせ

```scss
.component_item {
  .component.-variant & {
    // variant時のスタイル
  }
}
```

## アニメーション・トランジション

### デザイントークンの使用

```scss
transition: color var(--easing-standard) var(--animation-duration);
transition: transform var(--this-transition);
```

### パフォーマンス重視

- `transform` と `opacity` を優先

```scss
.component_icon {
  transition: transform var(--this-transition);

  .component:hover & {
    transform: translateX(#{rem(2)});
  }
}
```

## レスポンシブデザイン

### ブレークポイントの使用

```scss
@include min-screen(md) {
  .component {
    flex-direction: column;
  }
}
```

## コメント

### 日本語コメント推奨

```scss
// 外部リンク用のスタイル
&[target='_blank'] {
  // アイコン表示処理
}
```

## 禁止事項

### 絶対禁止

- Astro ファイル内での `<style>` タグ使用
- px 単位（border-width 以外）
- ハードコーディングされた値
- 物理プロパティ（margin-left 等）
- 4 ワード以上のクラス名
- `!important` の使用
- id セレクタの使用
- **コンポーネントの境界を越えたスタイル指定**（自分の Block/Element 以外を子孫セレクタで狙わない）

### コンポーネント境界を越えたスタイル指定の禁止

各コンポーネントの scss は、**自分のコンポーネントのクラス（自身の Block とその Element）だけ**をスタイルする。
別コンポーネントのクラスを子孫セレクタで狙って上書きしてはいけない。

```scss
// ❌ 禁止：ButtonList の scss から別コンポーネント Button を狙う
.button-list .parts-button {
  width: 100%;
}

// ❌ 禁止：CardList の scss から Card の中身を狙う
.card-list .parts-card_title {
  color: red;
}

// ✅ 良い例：レイアウトは自分のクラスだけで完結させる
.button-list {
  display: grid;
  gap: var(--this-gap);
}
```

**理由**: 親側から子コンポーネントを上書きすると、子の見た目が呼び出し場所によって変わり、再利用性とカプセル化が壊れる。
**回避策**: 子の見た目を変えたいときは、子コンポーネント側の Props / Modifier（例: Button の `isFull`）で制御する。
親はレイアウト（grid/flex/gap 等）だけを担当する。

### 推奨しない

- 過度なネストレベル（3 階層以上）

## ベストプラクティス

### ファイル構成

```scss
@use '@/styles/_develop/+.scss' as *;

// コンポーネント変数定義
.component-name {
  --this-color: var(--color-primary);
  --this-size: #{rem(24)};
}

// メインスタイル
.component-name {
  // レイアウト関連
  display: flex;

  // 外観関連
  color: var(--this-color);

  // Modifier
  &.-variant {
    // バリエーション
  }

  // 疑似要素
  &::before {
    // 疑似要素スタイル
  }

  // インタラクション
  @media (any-hover: hover) {
    &:hover {
      // ホバースタイル
    }
  }
}

// Element
.component-name_element {
  // エレメントスタイル
}
```
