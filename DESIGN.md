# DESIGN.md — デザインシステム仕様

このドキュメントは本プロジェクトのデザイン関連情報（トークン・タイポグラフィ・カラー・スペーシング・
ブレークポイント・アニメーション等）を一元的にまとめたもの。実装ルールは各 Skill（`scss-rules` /
`component-rules`）を参照。CSS の書き方そのものは重複するので本書には書かない。

> **原則**: 値のハードコード禁止。カラー・スペーシング・タイポグラフィ・角丸・z-index は必ずトークンを使う。

---

## 1. トークン生成パイプライン

Figma → JSON → Style Dictionary → SCSS で自動生成している。**生成物は直接編集しない。**

```
tokens/figma/*.json         プリミティブ/セマンティック変数（Figma からエクスポート）
tokens/other/*.json         Animation / Z-Index
tokens/composite/*.json     Typography 合成トークン
        │
        ├─ sd.config.js      → tokens/design-tokens.scss   （:root の CSS 変数）
        └─ sd.config.c.js    → tokens/design-composite.scss（@mixin 群）
```

生成コマンド:

```bash
npm run style-dictionary            # base + composite 両方
npm run style-dictionary:base       # design-tokens.scss のみ
npm run style-dictionary:composite  # design-composite.scss のみ
```

カスタム transform（`sd.config.js` 内）:

| transform | 対象 | 変換内容 |
| --- | --- | --- |
| `remTransformer` | font-size / rounded / spacing | `値 / 16 + rem`（16px 基準） |
| `stringTransformer` | font-family | シングルクォートで囲む |
| `letterSpacingTransformer` | letter-spacing | `% / 100 + em` |

> ⚠️ `build-tokens.js` は存在するが古い（`StyleDictionary.extend('./sd.config.composite.js')` を参照。
> このファイルは存在せず動かない）。実運用は上記 npm scripts。**削除 or 修正を推奨**（後述）。

---

## 2. カラー

### プリミティブ（原色 / `tokens/figma/Color-Primitive-variables.json`）

| トークン | 値 |
| --- | --- |
| `--color-gray-0` | `#000000` |
| `--color-gray-100` | `#1a1a1a` |
| `--color-gray-500` | `#aaaaaa` |
| `--color-gray-700` | `#dddddd` |
| `--color-gray-900` | `#f9f9f9` |
| `--color-gray-1000` | `#ffffff` |
| `--color-green-100` | `#9acd32` |
| `--color-red-100` | `#d93025` |

### セマンティック（用途別 / `tokens/figma/Color-Semantic-variables.json`）

**実装ではこちらを使う。** プリミティブへのエイリアス。

| トークン | 参照先 | 値 | 用途 |
| --- | --- | --- | --- |
| `--color-text` | gray-100 | `#1a1a1a` | 本文テキスト |
| `--color-primary` | green-100 | `#9acd32` | ブランド/アクセント |
| `--color-background-white` | gray-1000 | `#ffffff` | 白背景 |
| `--color-background-base` | gray-900 | `#f9f9f9` | ベース背景（body） |
| `--color-border` | gray-500 | `#aaaaaa` | ボーダー |
| `--color-error` | red-100 | `#d93025` | エラー |

---

## 3. タイポグラフィ

### フォントファミリー

| トークン | 値 |
| --- | --- |
| `--typography-font-family-base` | `'Hiragino Kaku Gothic ProN'` |
| `--typography-font-family-roboto` | `'Roboto'` |

body のフォールバックスタック（`src/styles/_base/base.scss`）:
`base, "Hiragino Sans", meiryo, sans-serif`

### フォントサイズ（rem / 16px 基準）

| トークン | rem | px |
| --- | --- | --- |
| `--typography-font-size-30` | `0.75rem` | 12px |
| `--typography-font-size-50` | `0.875rem` | 14px |
| `--typography-font-size-100` | `1rem` | 16px |
| `--typography-font-size-300` | `1.5rem` | 24px |
| `--typography-font-size-500` | `2.25rem` | 36px |

### フォントウェイト

| トークン | 値 |
| --- | --- |
| `--typography-font-weight-reqular` ※ | 400 |
| `--typography-font-weight-midium` ※ | 500 |
| `--typography-font-weight-semi-bold` | 600 |
| `--typography-font-weight-bold` | 700 |
| `--typography-font-weight-extra-bold` | 800 |
| `--typography-font-weight-black` | 900 |

> ※ `reqular`（regular）と `midium`（medium）は Figma 由来のタイポ。トークン名なので使う際は綴りに注意。**修正を推奨**（後述）。

### 行間 / 字間

| トークン | 値 |
| --- | --- |
| `--typography-line-height-100` | 1.5 |
| `--typography-line-height-300` | 1.75 |
| `--typography-line-height-trim` | 1 |
| `--typography-letter-spacing-small` | 0.05em |
| `--typography-letter-spacing-midium` | 0.1em |
| `--typography-body-default` | 1rem |

### 合成トークン（mixin / `tokens/design-composite.scss`）

font-size・weight・line-height・letter-spacing をまとめた `@mixin`。見出し/本文はこれを使う。

| mixin | font-size | weight | line-height | letter-spacing |
| --- | --- | --- | --- | --- |
| `heading-level-1` | 500 (36px) | bold | trim (1) | small |
| `heading-level-2` | 300 (24px) | semi-bold | 100 (1.5) | small |
| `heading-level-3`〜`6` | 100 (16px) | semi-bold | 100 (1.5) | small |
| `body-text` | 100 (16px) | regular | 300 (1.75) | 0 |
| `microcopy` | 30 (12px) | regular | trim (1) | 0 |

使用例:

```scss
@use "@/styles/_develop/+.scss" as *;

.article_title {
  @include heading-level-1;
}
```

> `heading-level-3`〜`6` は現状すべて同一値。将来分化するなら composite JSON を編集して再生成。

---

## 4. スペーシング

`tokens/figma/Number-variables.json` → rem 変換。用途: width/height, gap, padding, margin。

| トークン | rem | px |
| --- | --- | --- |
| `--spacing-xs` | `0.25rem` | 4px |
| `--spacing-sm` | `0.5rem` | 8px |
| `--spacing-md` | `1rem` | 16px |
| `--spacing-lg` | `1.5rem` | 24px |
| `--spacing-xl` | `2.5rem` | 40px |
| `--spacing-2xl` | `5rem` | 80px |

---

## 5. 角丸（Border Radius）

| トークン | rem | px |
| --- | --- | --- |
| `--rounded-sm` | `0.5rem` | 8px |
| `--rounded-md` | `1rem` | 16px |
| `--rounded-lg` | `1.5rem` | 24px |

---

## 6. ブレークポイント

`src/styles/_develop/breakpoint.scss`。モバイルファースト（min-width）。

| 名前 | 値 | px 目安 |
| --- | --- | --- |
| `sm` | 0 | — |
| `md` | 48em | 768px |
| `lg` | 75em | 1200px |
| `xlg` | 120em | 1920px |
| `xxlg` | 150em | 2400px |

使用例:

```scss
@use "@/styles/_develop/+.scss" as *;

.card {
  @include min-screen(md) {
    display: grid;
  }
}
```

> `get-breakpoint()` の `@return if(sass($min != 0): $min; else: null);` は
> Dart Sass 1.90+ の**新しい `if()` 構文**（modern CSS syntax）。旧関数構文
> `if($cond, $true, $false)` は deprecated なので、こちらの `if(sass(条件): 値; else: 値)` が正しい。

---

## 7. アニメーション / イージング

### トークン（`tokens/other/Animation.json`）

| トークン | 値 |
| --- | --- |
| `--animation-duration` | `0.25s` |
| `--animation-easing` | `cubic-bezier(0.19, 1, 0.22, 1)`（= ease-out-expo） |

### SCSS 変数（`src/styles/_develop/easing.scss`）

Penner イージング一式を SCSS 変数で定義（`$ease-out-expo` など全 29 種）。`@use "@/styles/_develop/+.scss" as *;` で利用可。

---

## 8. Z-Index

`tokens/other/Z-Index.json`。**重なり順はここで一元管理**（数値のハードコード禁止）。

| トークン | 値 |
| --- | --- |
| `--z-index-navi` | 30 |
| `--z-index-sample` | 10 |

---

## 9. アイコン

`src/icons/` に SVG。`astro-icon` 系での取り込み（詳細は各コンポーネント参照）。

- `blank.svg` / `chevron-right.svg` / `code-bracket.svg` / `cube.svg` / `check.svg` / `x-mark.svg`

---

## 10. CSS レイヤー構成

カスケードレイヤーで優先度を制御（`src/styles/common.scss`）。

```
@layer reset;   ← src/styles/_base/reset.scss（Modern CSS Reset ベース）
@layer base;    ← src/styles/_base/base.scss（body/見出し等の基本スタイル）
（レイヤー外）  ← コンポーネント個別スタイル（最優先）
```

エントリ:
- `common.scss` — 全ページ共通（トークン forward + reset + base + Parts/Common/Blocks）
- `top.scss` / `second.scss` / `form.scss` — ページ別

---

## 11. 参照ファイル早見

| 内容 | ファイル |
| --- | --- |
| CSS 変数（生成物） | `tokens/design-tokens.scss` |
| 合成 mixin（生成物） | `tokens/design-composite.scss` |
| カラー定義元 | `tokens/figma/Color-*.json` |
| 数値（spacing/rounded） | `tokens/figma/Number-variables.json` |
| タイポグラフィ | `tokens/figma/Typography-variables.json` / `tokens/composite/Typography-composite.json` |
| ブレークポイント | `src/styles/_develop/breakpoint.scss` |
| イージング | `src/styles/_develop/easing.scss` |
| SD 設定 | `sd.config.js` / `sd.config.c.js` |
| 実装ルール | Skill: `scss-rules` / `component-rules` |

---

## 12. 不足情報・改善提案

現状のトークンから抜けている / 整合性に問題がある項目。優先度順。

### 🔴 バグ・要修正

1. **`build-tokens.js` が壊れている** — 存在しない `sd.config.composite.js` を参照。
   削除するか、正しい設定を参照するよう修正（実運用は npm scripts なので削除が無難）。
2. **トークン名のタイポ** — `font-weight-reqular`→`regular`、`font-weight-midium`→`medium`、
   `letter-spacing-midium`→`medium`。Figma 側の変数名を直して再生成するのが根本対応。

### 🟡 トークン不足（デザイン網羅性）

4. **インタラクション状態のカラー欠如** — hover / active / focus / disabled 用の色がない。
   最低限 `--color-primary-hover`、`--color-text-disabled`、`--color-focus-ring` を追加推奨。
5. **シャドウ / エレベーション** — box-shadow のトークンがゼロ。カード等で使うなら
   `--shadow-sm/md/lg` を定義。
6. **フォントサイズの階段が飛んでいる** — 30/50/100/300/500 のみ。200・400 が無く、
   36px→16px の落差が大きい。中間サイズ（例: 20px=125）の追加を検討。
7. **success / warning / info の状態色** — error（赤）はあるが他のステータス色がない。
   フォームやトースト実装時に必要。

### 🟢 運用・ドキュメント

8. **カラーコントラスト検証** — `--color-primary`(#9acd32) 上の白/黒テキストは WCAG AA を
   満たさない組み合わせがある。使用ペアと合格レベルを本書に追記推奨。
9. **ダークモード方針** — 現状ライトのみ。対応するなら `prefers-color-scheme` +
   セマンティックトークンの二層化方針を決めておく。
10. **合成 heading-level-3〜6 の分化** — 全部同値。デザイン意図があるなら分ける、
    無いなら統合してトークンを減らす。
11. **`--typography-body-default`（1rem）の位置づけ不明** — font-size-100 と重複。
    用途を明記するか削除。

---

_最終更新: 2026-07-13 / 生成物（design-tokens.scss 等）を編集した場合は必ず本書も更新すること。_
