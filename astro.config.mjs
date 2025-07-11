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
          entryFileNames: () => {
            let fileName = 'script';
            return `${assetsDir}/js/${fileName}.js`;
          },
          assetFileNames: (info) =>
            info.names[0].endsWith('.css')
              ? `${assetsDir}/css/common[extname]`
              : info.names[0].endsWith('.js')
                ? `${assetsDir}/js/[name][extname]`
                : `${assetsDir}/image/[name][extname]`,
        },
      },
    },
  },
});
