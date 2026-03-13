// @ts-check
import { defineConfig } from 'astro/config';
import { projectDirectory } from './src/data/project.ts';
// @ts-ignore
import assetsGlobbingPlugin from './scripts/assetsGlobbing.js';
import { svgSprite } from './plugins/svg-sprite.ts';

const assetsDir = 'assets';

// https://astro.build/config
export default defineConfig({
  base: projectDirectory,
  outDir: `./dist/${projectDirectory}`,
  compressHTML: false,
  build: {
    inlineStylesheets: 'never',
    assets: `${assetsDir}/js/chunk`,
  },
  vite: {
    plugins: [
      svgSprite({ srcDir: 'src/icons', destDir: 'public/assets/svg' }),
      // @ts-ignore
      assetsGlobbingPlugin({ logEnabled: true }),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/_develop/+.scss" as *;`,
        },
      },
    },
    build: {
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          entryFileNames: (info) => {
            let fileName = 'script';
            if (info.moduleIds) {
              const scriptsModule = info.moduleIds.find((id) => id.includes('/src/scripts/') && id.endsWith('.ts'));
              if (scriptsModule) {
                const match = scriptsModule.match(/\/src\/scripts\/([^/]+)\.ts$/);
                if (match) {
                  fileName = match[1];
                }
              }
            }
            return `${assetsDir}/js/${fileName}.js`;
          },
          assetFileNames: (info) => {
            const fileName = [...String(info.source).matchAll(/--output-file-name:\s*([^}]+)/g)][0]?.[1] || 'style';

            return info.names[0].endsWith('.css')
              ? `${assetsDir}/css/${fileName}.css`
              : info.names[0].endsWith('.js')
                ? `${assetsDir}/js/[name].js`
                : `${assetsDir}/image/[name][extname]`;
          },
          // 特定のモジュールを別ファイルに分離する場合に使う
          // Astro は Vite の SplitVendorChunkPlugin が使えない
          manualChunks(id) {
            if (id.includes('embla-carousel')) {
              return 'embla-carousel';
            }
          },
        },
      },
    },
  },
});
