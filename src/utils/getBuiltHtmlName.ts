import fs from 'node:fs';
import path from 'node:path';

// prerender時はソースがchunkにバンドルされるため、import.meta.urlではなくcwd基準にする
const pagesDir = path.join(process.cwd(), 'src/pages');

function isIndexPage(originPathname: string): boolean {
  const relative = originPathname.replace(/\/$/, '').replace(/^\//, '');
  if (relative === '') return true;
  return fs.existsSync(path.join(pagesDir, relative, 'index.astro'));
}

/** format: 'preserve' 時のビルド出力HTMLパス（例: tast/index.html, page2.html） */
export function getBuiltHtmlName(originPathname: string): string {
  const relative = originPathname.replace(/\/$/, '').replace(/^\//, '');
  if (isIndexPage(originPathname)) {
    return relative ? `${relative}/index.html` : 'index.html';
  }
  return `${relative}.html`;
}

/** production用のURLパス（例: /tast/, /page2.html） */
export function getTruePathname(originPathname: string): string {
  const relative = originPathname.replace(/\/$/, '').replace(/^\//, '');
  if (isIndexPage(originPathname)) {
    return relative ? `/${relative}/` : '/';
  }
  return `/${relative}.html`;
}
