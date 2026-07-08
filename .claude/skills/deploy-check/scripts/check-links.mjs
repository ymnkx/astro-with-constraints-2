#!/usr/bin/env node
/**
 * dist内のHTMLを走査して内部リンク切れ・アセット欠落・アンカー切れ、
 * および納品物の衛生問題（不要ファイル混入・OGPプレースホルダー・console.log残存）を検出する。
 * 依存パッケージなし（正規表現ベース）。
 *
 * 使い方: node check-links.mjs <distディレクトリ>
 * 出力: JSON（stdout）。issuesが空なら整合性OK。
 * 終了コード: error検出時 1、それ以外 0
 */
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.argv[2] || 'dist');
if (!fs.existsSync(distDir)) {
  console.error(JSON.stringify({ fatal: `distディレクトリが見つかりません: ${distDir}` }));
  process.exit(1);
}

const htmlFiles = [];
const jsFiles = [];
const junkFiles = [];
const JUNK_RE = /^(\.DS_Store|Thumbs\.db|desktop\.ini|\.gitkeep|.*\.(log|bak|swp))$/i;
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (JUNK_RE.test(entry.name)) junkFiles.push(p);
    else if (entry.name.endsWith('.html')) htmlFiles.push(p);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) jsFiles.push(p);
  }
})(distDir);

const ATTR_RE = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
const SRCSET_RE = /srcset\s*=\s*["']([^"']+)["']/gi;
const ID_RE = /\sid\s*=\s*["']([^"']+)["']/gi;

const isExternal = (url) =>
  /^(https?:)?\/\//i.test(url) || /^(mailto:|tel:|data:|javascript:|blob:)/i.test(url);

// ファイルごとのid一覧をキャッシュ（アンカー検証用）
const idCache = new Map();
function getIds(file) {
  if (!idCache.has(file)) {
    const ids = new Set();
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(ID_RE)) ids.add(m[1]);
    idCache.set(file, ids);
  }
  return idCache.get(file);
}

// URLパス → dist内の実ファイル解決。ディレクトリなら index.html を見る
function resolveTarget(fromFile, urlPath) {
  const base = urlPath.startsWith('/')
    ? path.join(distDir, urlPath)
    : path.resolve(path.dirname(fromFile), urlPath);
  const candidates = [base, path.join(base, 'index.html')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

const issues = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const page = path.relative(distDir, file);
  const urls = new Set();
  for (const m of html.matchAll(ATTR_RE)) urls.add(m[1]);
  for (const m of html.matchAll(SRCSET_RE)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }

  for (const raw of urls) {
    if (!raw || isExternal(raw)) continue;
    const [pathPart, fragment] = raw.split('#');

    if (!pathPart) {
      // ページ内アンカー (#foo)
      if (fragment && !getIds(file).has(fragment)) {
        issues.push({ severity: 'error', page, url: raw, message: `ページ内アンカー先のid「${fragment}」が存在しません` });
      }
      continue;
    }

    const cleanPath = pathPart.split('?')[0];
    const target = resolveTarget(file, decodeURIComponent(cleanPath));
    if (!target) {
      const isAsset = /\.(css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|mp4|webm|pdf|json|xml|txt)$/i.test(cleanPath);
      issues.push({
        severity: 'error',
        page,
        url: raw,
        message: isAsset ? '参照アセットがdist内に存在しません' : '内部リンク先がdist内に存在しません',
      });
    } else if (fragment && target.endsWith('.html') && !getIds(target).has(fragment)) {
      issues.push({ severity: 'error', page, url: raw, message: `リンク先ページにアンカーid「${fragment}」が存在しません` });
    }
  }
}

// ---- 衛生チェック ----

// 1. 不要ファイルの混入（納品物に入ってはいけないOS/エディタ産ファイル）
for (const f of junkFiles) {
  issues.push({
    severity: 'error',
    page: path.relative(distDir, f),
    url: '',
    message: '納品物に不要ファイルが混入しています（OS/エディタ生成ファイル）',
  });
}

// 2. ビルド後JSに残った console.log / debugger
for (const f of jsFiles) {
  const js = fs.readFileSync(f, 'utf8');
  const consoleCount = (js.match(/console\.(log|debug|info)\s*\(/g) || []).length;
  const debuggerCount = (js.match(/(^|[^\w.])debugger\b/g) || []).length;
  if (consoleCount > 0) {
    issues.push({
      severity: 'warning',
      page: path.relative(distDir, f),
      url: '',
      message: `本番JSに console.log/debug/info が ${consoleCount} 箇所残っています`,
    });
  }
  if (debuggerCount > 0) {
    issues.push({
      severity: 'error',
      page: path.relative(distDir, f),
      url: '',
      message: `本番JSに debugger 文が ${debuggerCount} 箇所残っています`,
    });
  }
}

// 3. OGP: プレースホルダーURLと og:image の実在確認
const META_RE = /<meta\s+[^>]*(?:property|name)\s*=\s*["'](og:url|og:image|twitter:image)["'][^>]*content\s*=\s*["']([^"']*)["']|<meta\s+[^>]*content\s*=\s*["']([^"']*)["'][^>]*(?:property|name)\s*=\s*["'](og:url|og:image|twitter:image)["']/gi;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const page = path.relative(distDir, file);
  for (const m of html.matchAll(META_RE)) {
    const prop = m[1] || m[4];
    const content = (m[1] ? m[2] : m[3]) || '';
    const isPlaceholder = /example\.com|localhost|127\.0\.0\.1/i.test(content);
    if (isPlaceholder) {
      issues.push({
        severity: 'warning',
        page,
        url: content,
        message: `${prop} がプレースホルダーURLのままです（src/data/project.ts の projectUrl を確認）`,
      });
    }
    // プレースホルダーは実在確認しても意味がないのでスキップ
    if (prop !== 'og:url' && content && !isPlaceholder) {
      // 画像系は実在確認（サイト内パスの場合のみ）
      let imgPath = null;
      if (content.startsWith('/')) imgPath = content;
      else {
        try { imgPath = new URL(content).pathname; } catch { /* 不正URLは対象外 */ }
      }
      if (imgPath && !resolveTarget(file, imgPath.split('?')[0])) {
        issues.push({
          severity: 'error',
          page,
          url: content,
          message: `${prop} の画像がdist内に存在しません（SNSシェア時に画像が出ない）`,
        });
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      checkedPages: htmlFiles.length,
      checkedJsFiles: jsFiles.length,
      issueCount: issues.length,
      issues,
    },
    null,
    2,
  ),
);
process.exit(issues.some((i) => i.severity === 'error') ? 1 : 0);
