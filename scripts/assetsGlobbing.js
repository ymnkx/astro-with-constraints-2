import fs from 'node:fs';
import { relative, resolve, extname, join } from 'node:path';
import chokidar from 'chokidar';
import { normalizePath } from 'vite';
import FastGlob from 'fast-glob';
import lodash from 'lodash';
export const merge = (object, sources) =>
  lodash.mergeWith(object, sources, (a, b) => (lodash.isArray(b) ? b : undefined));

/**
 * @type {import('./assetsGlobbing.d.ts').UserConfig}
 */
export const defaultConfig = {
  filenamePattern: {
    '+.scss': 'src/components',
    '+.ts': 'src/components',
  },
  extnamePattern: {
    styles: /\.scss$/,
    scripts: /\.ts$/,
  },
  paths: ['./src/components/*/**'],
  outputDir: './src/components',
  logEnabled: true, // ログ出力を制御するオプション
};

/**
 * ログ出力を制御するヘルパー関数
 * @param {import('./assetsGlobbing.d.ts').UserConfig} options プラグイン設定
 * @param {string} message ログメッセージ
 * @param {...any} args 追加の引数
 */
const log = (options, message, ...args) => {
  if (options.logEnabled) {
    console.log(message, ...args);
  }
};

/**
 * @param {import('./assetsGlobbing.d.ts').UserConfig} options
 * @param {import('vite').ResolvedConfig} config
 */
const assetsGlobbing = (options, config) => {
  const filenamePattern = options.filenamePattern;
  const ignoredPaths = Object.keys(filenamePattern).map((filename) => `!**/${filename}`);

  // 出力ディレクトリを設定
  const componentsRoot = normalizePath(resolve(config.root, options.outputDir));

  // パターンにマッチするパスを取得
  const paths = FastGlob.sync(
    options.paths.map((path) => normalizePath(path)),
    { onlyFiles: true, ignore: ignoredPaths },
  ).map((entry) => normalizePath(resolve(config.root, entry)));

  // log(options, `[Assets Globbing] 検出されたファイル数: ${paths.length}`);

  // 拡張子ごとにファイルを収集
  const scssFiles = [];
  const tsFiles = [];

  // すべてのファイルをスキャン
  paths.forEach((path) => {
    if (options.extnamePattern.styles.test(path) && !path.includes('+.scss')) {
      scssFiles.push(path);
    } else if (options.extnamePattern.scripts.test(path) && !path.includes('+.ts')) {
      tsFiles.push(path);
    }
  });

  log(options, `[Assets Globbing] SCSSファイル: ${scssFiles.length}件, TSファイル: ${tsFiles.length}件`);

  // SCSSファイルをまとめる
  if (scssFiles.length > 0) {
    let scssImports = '';
    scssFiles.forEach((file) => {
      const relativePath = normalizePath(relative(componentsRoot, file));
      scssImports += `@forward "./${relativePath}";\n`;
    });

    const scssOutputPath = join(componentsRoot, '+.scss');
    if (
      scssImports !== '' &&
      (!fs.existsSync(scssOutputPath) || fs.readFileSync(scssOutputPath, 'utf8') !== scssImports)
    ) {
      fs.writeFileSync(scssOutputPath, scssImports);
      log(options, `[Assets Globbing] 更新しました: ${scssOutputPath}`);
    }
  } else {
    // SCSSファイルがない場合は空のファイルを作成
    const scssOutputPath = join(componentsRoot, '+.scss');
    if (fs.existsSync(scssOutputPath)) {
      fs.writeFileSync(scssOutputPath, '');
      log(options, `[Assets Globbing] 空に更新しました: ${scssOutputPath}`);
    }
  }

  // TSファイルをまとめる
  if (tsFiles.length > 0) {
    let tsImports = '';
    tsFiles.forEach((file) => {
      const relativePath = normalizePath(relative(componentsRoot, file));
      try {
        const fileContent = fs.readFileSync(file, 'utf8');
        if (fileContent.includes('export default')) {
          const basename = relativePath.replace(extname(relativePath), '');
          tsImports += `export { default as ${basename.replace(/\//g, '_')} } from './${relativePath}';\n`;
        } else {
          tsImports += `import './${relativePath}';\n`;
        }
      } catch (error) {
        console.error(`[Assets Globbing] ファイル読み込みエラー: ${file}`, error);
        tsImports += `import './${relativePath}';\n`;
      }
    });

    const tsOutputPath = join(componentsRoot, '+.ts');
    if (tsImports !== '' && (!fs.existsSync(tsOutputPath) || fs.readFileSync(tsOutputPath, 'utf8') !== tsImports)) {
      fs.writeFileSync(tsOutputPath, tsImports);
      log(options, `[Assets Globbing] 更新しました: ${tsOutputPath}`);
    }
  } else {
    // TSファイルがない場合は空のファイルを作成
    const tsOutputPath = join(componentsRoot, '+.ts');
    if (fs.existsSync(tsOutputPath)) {
      fs.writeFileSync(tsOutputPath, '');
      log(options, `[Assets Globbing] 空に更新しました: ${tsOutputPath}`);
    }
  }

  // +.astro.ts が存在する場合は削除
  const astroTsPath = join(componentsRoot, '+.astro.ts');
  if (fs.existsSync(astroTsPath)) {
    fs.unlinkSync(astroTsPath);
    log(options, `[Assets Globbing] 削除しました: ${astroTsPath}`);
  }
};

/**
 * パスが監視対象のファイルかどうかを判定します
 * @param {string} filePath ファイルパス
 * @param {Object} extnamePattern 拡張子パターン
 * @returns {boolean} 監視対象かどうか
 */
const isTargetFile = (filePath, extnamePattern) => {
  const normalizedPath = normalizePath(filePath);
  const ext = extname(normalizedPath).toLowerCase();

  // 生成したファイルは除外
  if (normalizedPath.includes('+.scss') || normalizedPath.includes('+.ts') || normalizedPath.includes('+.astro.ts')) {
    return false;
  }

  // 拡張子チェック
  return extnamePattern.styles.test(ext) || extnamePattern.scripts.test(ext);
};

/**
 * ファイル変更イベントのハンドラ
 * @param {string} file 変更されたファイルのパス
 * @param {import('./assetsGlobbing.d.ts').UserConfig} pluginUserConfig プラグイン設定
 * @param {import('vite').ResolvedConfig} config Vite設定
 * @param {string} eventType イベントタイプ ('add'|'unlink'|'change')
 */
const fileChanged = (file, pluginUserConfig, config, eventType) => {
  if (isTargetFile(file, pluginUserConfig.extnamePattern)) {
    log(pluginUserConfig, `[Assets Globbing] ${eventType}イベント検知: ${normalizePath(file)}`);
    // 変更を検知したら全体を再生成
    assetsGlobbing(pluginUserConfig, config);
  }
};

/**
 * @param {import('./assetsGlobbing.d.ts').UserConfig} pluginUserConfig
 * @returns {import('vite').Plugin}
 */
const plugin = (pluginUserConfig = {}) => {
  pluginUserConfig = merge(defaultConfig, pluginUserConfig);
  let viteConfig;
  let watcher;

  return {
    name: 'assets-globbing',
    apply: 'serve',

    configResolved(config) {
      viteConfig = config;
      // 初期化時に一括生成
      assetsGlobbing(pluginUserConfig, viteConfig);
      log(pluginUserConfig, '[Assets Globbing] 初期化完了');
    },

    buildStart() {
      if (watcher) {
        return;
      }

      // 監視対象のディレクトリを指定
      const componentRoot = resolve(viteConfig.root, 'src/components');
      log(pluginUserConfig, `[Assets Globbing] 監視ルートディレクトリ: ${componentRoot}`);

      // 絶対パスで直接監視
      watcher = chokidar.watch(componentRoot, {
        ignored: [
          /(^|[/\\])\../, // ドットファイル
          /\+\.(scss|ts|astro\.ts)$/, // 生成ファイル
          '**/node_modules/**',
        ],
        persistent: true,
        ignoreInitial: true,
        cwd: viteConfig.root,
        usePolling: true,
        interval: 100,
        binaryInterval: 300,
        atomic: 300, // アトミック操作の待機時間
        alwaysStat: true, // 更新の信頼性向上
        depth: 5, // 監視する深さ
        awaitWriteFinish: {
          stabilityThreshold: 100, // ファイル変更が完了したと判断するまでの時間（ミリ秒）
          pollInterval: 50, // 安定性をチェックする間隔
        },
      });

      // イベントハンドラ登録
      watcher
        .on('add', (file) => fileChanged(file, pluginUserConfig, viteConfig, 'add'))
        .on('unlink', (file) => fileChanged(file, pluginUserConfig, viteConfig, 'unlink'))
        // .on('change', (file) => fileChanged(file, pluginUserConfig, viteConfig, 'change'))
        .on('ready', () => log(pluginUserConfig, '[Assets Globbing] ファイル監視開始'))
        .on('error', (error) => console.error(`[Assets Globbing] エラー: ${error}`));

      log(pluginUserConfig, '[Assets Globbing] chokidar watcher setup complete');
    },

    buildEnd() {
      if (watcher) {
        watcher.close();
        watcher = null;
        log(pluginUserConfig, '[Assets Globbing] ファイル監視終了');
      }
    },
  };
};

export default plugin;
