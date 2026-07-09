#!/usr/bin/env node
/**
 * 決定的な静的チェックを1プロセスにまとめて実行し、結果をJSONで返す。
 * LLMのsubagentを使わずメインループから直接叩くことでトークンを節約するのが目的。
 *
 * まとめて実行するもの:
 *   - html-validate (dist HTMLの構文)
 *   - ESLint (src)
 *   - stylelint (src)
 *   - prettier --check (src)
 *   - check-links.mjs (リンク/アセット整合性 + dist衛生)
 *
 * 使い方:
 *   node static-checks.mjs [--base <git-ref>] [--dist <dir>]
 *     --base <ref>  指定するとそのref(例: main)との差分ファイルだけに検査を絞る（クイックモード）
 *                   省略すると全ファイル検査（フルモード）
 *     --dist <dir>  distディレクトリ（デフォルト: dist）
 *
 * 出力: stdout に結果JSON。プロジェクトルートで実行すること（.node-version のNodeが要る）。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- 引数 ----
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = getArg('--base'); // undefined ならフルモード
const distDir = getArg('--dist') || 'dist';

// ---- ユーティリティ: コマンドを実行し stdout を返す（非0終了でも stdout を拾う） ----
function run(cmd) {
  try {
    return { ok: true, stdout: execSync(cmd, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    // lint系はエラー検出時に非0終了する。stdout は結果なので拾う
    return { ok: false, stdout: e.stdout || '', stderr: e.stderr || String(e.message) };
  }
}

// ---- 変更ファイルの取得（クイックモード） ----
let changedFiles = null; // null = 全ファイル
if (base) {
  const r = run(`git diff --name-only --relative ${base}`);
  changedFiles = r.stdout
    .trim()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- 変更src → 影響を受けるdistページのマッピング ----
// src/pages/*.astro のみ変更 → そのページだけ
// components/layouts/styles/scripts/data/icons が変更 → 全ページに影響（安全側）
function srcToDistPage(srcFile) {
  const m = srcFile.match(/^src\/pages\/(.+)\.astro$/);
  if (!m) return null;
  const name = m[1];
  return name === 'index' ? path.join(distDir, 'index.html') : path.join(distDir, name, 'index.html');
}

// ツール任せの ** グロブは環境で0マッチになることがあるため、ファイルはNodeで列挙して明示的に渡す
function walkFiles(dir, predicate) {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (predicate(e.name)) out.push(p);
    }
  })(dir);
  return out;
}

function listAllHtml() {
  return walkFiles(distDir, (n) => n.endsWith('.html'));
}

let allPagesAffected = true;
let targetPages = listAllHtml();
let changedSrc = null;

if (changedFiles) {
  changedSrc = changedFiles.filter((f) => f.startsWith('src/'));
  const pageChanges = changedSrc.filter((f) => /^src\/pages\/.+\.astro$/.test(f));
  const sharedChanges = changedSrc.filter((f) => !/^src\/pages\/.+\.astro$/.test(f));
  if (sharedChanges.length === 0 && pageChanges.length > 0) {
    // ページ固有の変更のみ → 該当ページに絞れる
    allPagesAffected = false;
    targetPages = pageChanges.map(srcToDistPage).filter((p) => p && fs.existsSync(p));
  } else if (changedSrc.length === 0) {
    // src変更なし（設定やdocのみ）→ ページ検査は不要
    allPagesAffected = false;
    targetPages = [];
  }
  // sharedChanges あり → allPagesAffected=true のまま（全ページ）
}

// ---- 1. html-validate ----
function checkHtml() {
  if (targetPages.length === 0) return { skipped: true, reason: '対象ページなし（HTMLに影響する変更なし）', issues: [] };
  const cfg = path.join(__dirname, 'htmlvalidate.json');
  // グロブ任せにせず明示的にファイルを渡す
  const targets = targetPages.map((p) => `"${p}"`).join(' ');
  const r = run(`npx --yes html-validate@11 --config "${cfg}" ${targets} --formatter json`);
  const payload = (r.stdout && r.stdout.trim()) || (r.stderr && r.stderr.trim()) || '[]';
  let parsed = [];
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { error: 'html-validate出力のパース失敗', raw: payload.slice(0, 500), issues: [] };
  }
  const issues = [];
  for (const file of parsed) {
    for (const m of file.messages || []) {
      // no-dup-id / element-permitted-content は実害大なので error 固定
      const forceError = ['no-dup-id', 'element-permitted-content'].includes(m.ruleId);
      issues.push({
        severity: forceError || m.severity === 2 ? 'error' : 'warning',
        page: path.relative(distDir, file.filePath),
        location: `${m.line}:${m.column}`,
        rule: m.ruleId,
        message: m.message,
      });
    }
  }
  return { checkedPages: targetPages.length, issues };
}

// ---- 2. ESLint (src) ----
function checkEslint() {
  const files = changedSrc
    ? changedSrc.filter((f) => /\.(astro|ts)$/.test(f)).map((f) => `"${f}"`)
    : ['src/'];
  if (files.length === 0) return { skipped: true, reason: '対象の .astro/.ts 変更なし', issues: [] };
  const r = run(`npx --yes eslint ${files.join(' ')} --ext .astro,.ts --format json`);
  const payload = (r.stdout && r.stdout.trim()) || (r.stderr && r.stderr.trim()) || '[]';
  let parsed = [];
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { error: 'eslint出力のパース失敗', raw: payload.slice(0, 500), issues: [] };
  }
  const issues = [];
  for (const file of parsed) {
    for (const m of file.messages || []) {
      issues.push({
        severity: m.severity === 2 ? 'error' : 'warning',
        file: path.relative(process.cwd(), file.filePath),
        location: `${m.line}:${m.column}`,
        rule: m.ruleId,
        message: m.message,
      });
    }
  }
  return { issues };
}

// ---- 3. stylelint (src) ----
// stylelint は複数globパターンを1コマンドで渡すと空を返す癖があるため、パターンごとに実行してマージする。
function checkStylelint() {
  const targets = changedSrc
    ? changedSrc.filter((f) => /\.(scss|astro)$/.test(f))
    : walkFiles('src', (n) => n.endsWith('.scss') || n.endsWith('.astro')).map((p) => path.relative(process.cwd(), p));
  if (targets.length === 0) return { skipped: true, reason: '対象の .scss/.astro 変更なし', issues: [] };

  const issues = [];
  let fixable = 0;
  const r = run(`npx --yes stylelint ${targets.map((t) => `"${t}"`).join(' ')} --formatter json`);
  // stylelintは errored 時にJSONをstderrへ出すことがあるため両方から探す
  const payload = (r.stdout && r.stdout.trim()) || (r.stderr && r.stderr.trim()) || '[]';
  let parsed = [];
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { error: 'stylelint出力のパース失敗', raw: payload.slice(0, 300), issues: [] };
  }
  for (const file of parsed) {
    for (const w of file.warnings || []) {
      if (w.fixable) fixable++;
      issues.push({
        severity: 'warning', // ビルドは通る前提なので基本warning
        file: path.relative(process.cwd(), file.source),
        location: `${w.line}:${w.column}`,
        rule: w.rule,
        message: w.text,
      });
    }
  }
  return { issues, fixableCount: fixable };
}

// ---- 4. prettier --check ----
function checkPrettier() {
  const files = changedSrc
    ? changedSrc.filter((f) => /\.(astro|ts|scss)$/.test(f))
    : walkFiles('src', (n) => /\.(astro|ts|scss)$/.test(n)).map((p) => path.relative(process.cwd(), p));
  if (files.length === 0) return { skipped: true, reason: '対象ファイルの変更なし', issues: [] };
  const targets = files.map((f) => `"${f}"`);
  const r = run(`npx --yes prettier --check ${targets.join(' ')}`);
  // prettier は差分ありで非0。stderr/stdout に "would reformat <file>" が並ぶ
  const text = (r.stdout || '') + (r.stderr || '');
  const unformatted = text
    .split('\n')
    .map((l) => l.match(/^\[warn\]\s+(.+)$|would reformat\s+(.+)$/i))
    .filter(Boolean)
    .map((m) => (m[1] || m[2] || '').trim())
    .filter((f) => f && !/Code style issues|Checking formatting|All matched files/.test(f));
  return { issues: unformatted.map((f) => ({ severity: 'warning', file: f, message: 'prettierフォーマット未適用（--writeで自動修正可）' })) };
}

// ---- 5. link-integrity (既存スクリプトを呼ぶ) ----
function checkLinks() {
  const script = path.join(__dirname, 'check-links.mjs');
  const r = run(`node "${script}" "${distDir}"`);
  try {
    return JSON.parse(r.stdout || '{}');
  } catch {
    return { error: 'check-links出力のパース失敗', raw: (r.stdout || r.stderr || '').slice(0, 500), issues: [] };
  }
}

// ---- 実行 ----
const result = {
  mode: base ? 'quick' : 'full',
  base: base || null,
  changedFiles: changedFiles,
  changedSrc: changedSrc,
  allPagesAffected,
  targetPages: targetPages.map((p) => path.relative(distDir, p)),
  checks: {
    htmlValidate: checkHtml(),
    eslint: checkEslint(),
    stylelint: checkStylelint(),
    prettier: checkPrettier(),
    linkIntegrity: checkLinks(),
  },
};

// サマリー（メインループが最小トークンで読めるように件数を先頭に）
const summarize = (c) => {
  const issues = c.issues || [];
  return {
    error: issues.filter((i) => i.severity === 'error').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    skipped: !!c.skipped,
    ...(c.error ? { toolError: c.error } : {}),
  };
};
result.summary = {
  htmlValidate: summarize(result.checks.htmlValidate),
  eslint: summarize(result.checks.eslint),
  stylelint: summarize(result.checks.stylelint),
  prettier: summarize(result.checks.prettier),
  linkIntegrity: summarize(result.checks.linkIntegrity),
};

console.log(JSON.stringify(result, null, 2));
const totalError = Object.values(result.summary).reduce((a, s) => a + s.error, 0);
process.exit(totalError > 0 ? 1 : 0);
