import type { Plugin } from 'vite';
/**
 * production ビルド時にバンドル済みコードから console.log と debugger を除去するプラグイン。
 * console.error / console.warn / console.info など log 以外の console はそのまま残す。
 * esbuild.drop を使わず renderChunk（バンドル後）で処理することで、
 * バンドル前のモジュールグラフ解析に影響を与えず moduleIds を正しく保持する。
 */
export const dropConsolePlugin = (): Plugin => {
  let isProduction = false;
  return {
  name: 'vite-plugin-drop-console',
  config(_, { mode }) {
    isProduction = mode === 'production';
  },
  renderChunk(code, chunk) {
    if (!isProduction) return null;
    // クライアント向けJS(.js)のみ対象。Astro のプリレンダリング用サーバーモジュール(.mjs)を
    // 文字列処理で壊すとビルドが失敗するため除外する。
    if (!chunk.fileName.endsWith('.js')) return null;
    // chunk ディレクトリ（manualChunks で分離されたファイル）は対象外
    if (chunk.fileName.includes('/chunk/')) return null;

    // console.xxx(...) の除去（ネストした括弧に対応）
    let result = '';
    let i = 0;
    while (i < code.length) {
      const consoleMatch = code.slice(i).match(/^console\s*\.\s*log\s*\(/);
      if (consoleMatch) {
        // 開き括弧の位置を探して対応する閉じ括弧まで読み飛ばす
        const openIdx = i + consoleMatch[0].length - 1;
        let depth = 1;
        let j = openIdx + 1;
        while (j < code.length && depth > 0) {
          if (code[j] === '(') depth++;
          else if (code[j] === ')') depth--;
          j++;
        }
        // 末尾のセミコロンも除去
        if (code[j] === ';') j++;
        i = j;
      } else if (code.slice(i).startsWith('debugger')) {
        const end = i + 'debugger'.length;
        i = code[end] === ';' ? end + 1 : end;
      } else {
        result += code[i];
        i++;
      }
    }
    return { code: result, map: null };
  },
  };
};
