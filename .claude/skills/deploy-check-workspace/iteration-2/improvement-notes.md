
## iteration-2以降: トークン節約リファクタ（2026-07-09）
- 決定的チェック5種(html-validate/eslint/stylelint/prettier/link-integrity)を1本の `scripts/static-checks.mjs` に集約し、メインループで直接実行(subagent不要)。LLMのsubagentはブラウザが要るLighthouse/a11yの2本のみに削減。
- `--base main` で main 差分だけに絞る quickモード追加。共通部品(components/layouts/styles/scripts/data)変更時はHTML系を自動で全ページに拡大。ページ影響ゼロならブラウザ検査を丸ごと省略。
- html-validate設定を `scripts/htmlvalidate.json` に固定(毎回生成しない)。
- 実装ハマりどころ: (1)stylelintは複数globを1コマンドで渡すと空を返す→明示ファイル列挙。(2)stylelintはerrored時にJSONをstderrに出す→stdout||stderrで拾う。(3)ツール任せの `**` グロブが環境で0マッチ→Nodeでファイル列挙。
