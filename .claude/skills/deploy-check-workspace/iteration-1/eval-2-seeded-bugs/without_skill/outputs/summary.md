# 納品前チェック結果サマリー

結論: **このままの納品はNGにゃ。** ブロッカー7件＋要確認6件を検出したにゃ。ビルド・納品パイプライン自体は正常に完走するにゃ（詳細は同フォルダの check-report.md）。

## 検査結果一覧

| 検査 | 判定 |
|------|------|
| ESLint (`npm run lint`) | ✅ PASS |
| astro build（3ページ） | ✅ PASS |
| 納品パイプライン (`npm run delivery`) | ✅ PASS |
| SVGスプライト整合性 | ✅ PASS |
| stylelint | ❌ 37 errors |
| リンク・アセット疎通（preview :4399 で実測） | ❌ 404 ×4 |
| HTML品質（id重複 / alt / TODO） | ❌ 3件 |
| ビルドJSのデバッグコード | ❌ console.log ×3 |
| 納品物の不要ファイル | ❌ .DS_Store 混入ほか |

## 納品ブロッカー（7件）と修正案

1. **TODO・ダミー文言の残存** — `src/pages/page2.astro:16` の `<p>TODO: 本番前にダミー画像を差し替える</p>` が納品HTMLにそのまま出る。→ 本番コンテンツに差し替え。
2. **img の alt 欠落** — `page2.astro:17` の `<img src="/favicon.svg">`（ダミー画像流用）。→ 本番画像＋ `alt="..."` を付与。
3. **id 重複** — `page2.astro` に `id="dup-check-target"` が2箇所（HTML仕様違反）。→ 片方をリネーム or class 化。
4. **リンク切れ 3 URL（404実測）** — `/about`・`/docs`（index.astro）、`/recruit/`（page2.astro）。→ 遷移先を用意するか正しいURLへ。
5. **OGP画像 og.png が存在しない（404実測）** — Head.astro が参照するが `public/og.png` が無い。→ 1200x630 の og.png を配置。
6. **console.log がビルドJSに残存（3箇所）** — `src/scripts/common.ts:3`、`src/scripts/second.ts:3`、`src/components/Second/SecondBlock/SecondBlock.ts:1`。→ 削除。恒久対策に `astro.config.mjs` へ `vite.esbuild.drop: ['console']`。
7. **.DS_Store が納品物に混入** — `build/htdocs/assets/.DS_Store`。filelist.txt には表示されないので気づきにくい。→ `scripts/copyDirectory.js` の copySync に `filter: (src) => !src.endsWith('.DS_Store')` を追加＋既存ファイル削除。

## 要確認（6件）

- stylelint 37件（reset.scss の並び順・vendor prefix 4件、`+.scss` の `@forward` 拡張子 33件。慣習ならルール無効化、`--fix` で大半自動修正可）
- NGワードチェックがプレースホルダー（NG_WORD1/2）のままで「TODO」「ダミー」を素通し → 実運用ワード（TODO/FIXME/ダミー/localhost 等）を登録
- typo「Accorion Label」（index.astro）→ Accordion
- 未使用画像 `public/assets/image/200x200.png` が納品物に含まれる → 削除 or 使用
- `project.ts` の `projectUrl` が `https://example.com` のまま → 本番URL確認
- `og:site_name` にページタイトルが入っている（Head.astro）→ `projectName` 固定に

## 備考

- src ファイルは一切変更していないにゃ（提案のみ）。
- 検証に使ったプレビューサーバー（ポート4399）は停止済み、4321は未使用にゃ。
