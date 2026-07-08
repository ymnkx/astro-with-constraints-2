# 納品前チェック サマリー

## 判定: ❌ 要修正（このままの納品は非推奨にゃ）

`npm run build` は成功（3ページ生成、NGワードなし）。だけど6検査で **error 30件 / warning 53件** を検出したにゃ。error の実体は重複原因を除くと **srcの修正約10箇所で全部消える**にゃ。詳細とdiff付き修正案は `deploy-check-report.md` 参照。

## 検査結果一覧

| 検査 | 結果 | error | warning |
|---|---|---|---|
| html-validator（HTML構文） | ❌ | 18 | 0 |
| lighthouse（perf/SEO/BP） | ⚠️ | 0 | 1 |
| accessibility（axe + 静的） | ❌ | 7 | 3 |
| link-integrity（リンク/アセット） | ❌ | 4 | 11 |
| project-specific（案件固有） | ❌ | 1 | 0 |
| src-check（ESLint/stylelint/prettier） | ⚠️ | 0 | 38 |

## 最優先: page2 のダミーブロック（4検査で検出）

`src/pages/page2.astro` 15〜20行目に問題が集中しているにゃ。納品事故に直結するので真っ先に対応を。

- `<p>TODO: 本番前にダミー画像を差し替える</p>` が本番HTMLにそのまま出力
- ダミー画像 `<img src="/favicon.svg">` に **alt なし**（page2 の SEOスコア 91 への低下原因）
- `id="dup-check-target"` が同一ページで**重複**（HTML不正）
- `<a href="/recruit/">採用情報</a>` が**リンク切れ**（ページ未作成）

→ TODO行削除・本番画像差し替え＋alt付与・id リネーム・recruit ページ作成orリンク修正。

## そのほか必ず直したい error（修正案は全部レポートにdiffあり）

1. **ナビの `aria-hidden` 設計**（error 15件分の根本原因）— `src/components/All/Navigation/Navigation.astro` の `aria-hidden` コンテナ内にフォーカス可能要素。`inert` 化を推奨（Navigation.ts のトグルと Navigation.scss のセレクタも同時変更）
2. **リンク切れ `/about` `/docs`** — `src/pages/index.astro:37,41`
3. **`.DS_Store` が納品物に混入** — `public/assets/.DS_Store` 由来。削除して再ビルド
4. **カルーセルのドット** — aria-label なし＋タッチターゲット12px — `CarouselPagination.ts` / `.scss`
5. **アコーディオンの `aria-label="summary"`** が可視テキストと不一致 — `Accordion.astro:8` から削除するだけ
6. **page2 / page3 に h1 がない** — `<Heading as="h1">` に変更
7. **モーダルのトリガーが span** でキーボード操作不能 — `index.astro:57` を `<Button as="button">` に。closeボタンには `type="button"` を（`Modal.astro:11`）

## 納品前に対応推奨（warning）

- **OGPが `https://example.com` のまま**（9件）— `src/data/project.ts:3` を本番ドメインに（1箇所で全解消）。参照先の `public/og.png` も未配置にゃ
- **本番JSに `console.log` 残存**（3箇所）— `common.ts` / `second.ts` / `SecondBlock.ts`。恒久対策は vite の `esbuild.drop`
- **stylelint 37件 + prettier 1件** — ほぼ `npx stylelint ... --fix` で自動修正可（vendor prefix 2件だけは --fix 非推奨、disable コメント推奨）

## 良かった点

- Lighthouse performance / best-practices は全ページ100点
- ESLint 指摘ゼロ、lang属性・アンカー切れ・debugger 残存なし
- title は全ページ設定済み

## 次のアクション

error 修正 → `npm run build` → 再チェックで ✅ になったら `npm run delivery` で納品物生成できるにゃ。修正はまだ一切適用していない（すべて提案のみ）ので、承認をもらえればこちらで適用するにゃ。
