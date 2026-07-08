# iteration-1 実行中に見つかったスキル改善候補

1. **検査subagentの結果はファイル経由で受け渡すべき**
   - eval-0 with_skill で、親エージェントが起動した検査subagentの完了通知が親に届かず、メインセッションが手動で結果を中継する必要があった
   - 対策案: SKILL.md Phase 3 に「各subagentは結果を `<scratchpad>/deploy-check/<検査名>.json` にも保存し、親は通知に依存せずファイルを読んで集約する」を追加

2. **html-validate のバージョン問題**
   - Node 20 環境では html-validate@11 (Node 22+) が動かない。subagentが自力で@8系にフォールバックしたが、references/html-validate.md に `npx --yes html-validate@8` のように動くバージョンを明記すべき

3. **ポート競合は既に対処できた**
   - 4321が使用中でも preview が4322に逃げ、subagentが正しく追従した。SKILL.mdの「起動ログから実際のポートを確認」が機能した

4. **良かった点（維持する）**
   - レポートがテンプレ通り、diff付きsrc修正案、検査環境の注記、error のグルーピング（23件→実質4グループ）

5. **ベースラインから盗むべき着眼点（eval-0 without_skill）**
   - dist成果物の衛生チェック: `.DS_Store` 等の不要ファイル混入、OGP URL がプレースホルダー(example.com)のまま、og:image の実在確認
   - これらは link-integrity subagent か新しい「dist-hygiene」観点として追加検討
   - 一方でベースラインは HTML構文 / Lighthouse / a11y を一切実行しなかった（スキルの価値を裏付け）

6. **html-validator の検出が run 間で揺れる（eval-2 で発覚）**
   - eval-0 では hidden-focusable ×15 を検出、eval-2 では同じdist状態なのに報告なし（error 3件のみ）
   - 原因候補: html-validate のバージョン差（8系のパッチ違い）や設定生成の揺れ
   - 対策案: references/html-validate.md にバージョンを固定（例: `npx --yes html-validate@8.7.4`）し、設定JSONを references に固定ファイルとして同梱してコピーさせる

7. **html-validate揺れの根本原因が判明（→対応済み）**
   - 原因はNodeバージョン: リポジトリルートで実行するとglobalの Node 20、プロジェクト(data/)内で実行すると nodenv が .node-version の 24.15.0 を適用
   - 対応: スキルをdata/.claude/skills/に移動し「コマンドは必ずプロジェクトルートで実行、node --versionを.node-versionと照合」をSKILL.mdに明記。html-validate最新版(v11+, Node22+必須)が使える前提に更新
