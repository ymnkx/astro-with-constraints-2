---
name: ts-rules
description: このプロジェクトのTypeScript/JavaScriptコーディング規約（型明示・any禁止・命名規則・セミコロン/クォート/インデント・console.log運用）。.ts/.jsファイルやAstroのフロントマタースクリプトを書く・編集するときに読むこと。
---

# TypeScript・JavaScript ルール

## 基本方針

- TypeScript を優先使用
- 型定義は明示的に行う
- `any` 型の使用は原則禁止

## コーディングスタイル

- セミコロンあり
- シングルクォート推奨
- インデントは 2 スペース

## 命名規則

- 変数・関数: キャメルケース
- 定数: アッパースネークケース
- 型・インターフェース: パスカルケース

## その他

- `console.log` は本番ビルドで除去（drop-console）。src には残してよい
