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
 * ディレクトリがサブフォルダを持つかチェック
 * @param {string} dir ディレクトリパス
 * @returns {boolean}
 */
const hasSubFolders = (dir) => {
  if (!fs.existsSync(dir)) return false;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.some((entry) => entry.isDirectory() && !entry.name.startsWith('.'));
};

/**
 * ディレクトリ内のファイルとサブフォルダを収集
 * @param {string} dir ディレクトリパス
 * @param {import('./assetsGlobbing.d.ts').UserConfig} options
 * @returns {{ scssFiles: string[], tsFiles: string[], subFolders: string[] }}
 */
const collectFilesInDirectory = (dir, options) => {
  if (!fs.existsSync(dir)) return { scssFiles: [], tsFiles: [], subFolders: [] };

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const scssFiles = [];
  const tsFiles = [];
  const subFolders = [];

  entries.forEach((entry) => {
    const fullPath = normalizePath(join(dir, entry.name));
    
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      subFolders.push(fullPath);
    } else if (entry.isFile()) {
      if (options.extnamePattern.styles.test(entry.name) && !entry.name.includes('+.scss')) {
        scssFiles.push(fullPath);
      } else if (options.extnamePattern.scripts.test(entry.name) && !entry.name.includes('+.ts')) {
        tsFiles.push(fullPath);
      }
    }
  });

  return { scssFiles, tsFiles, subFolders };
};

/**
 * 特定のディレクトリ用のまとめファイルを生成
 * @param {string} dir ディレクトリパス
 * @param {string[]} scssFiles SCSSファイルのリスト
 * @param {string[]} tsFiles TSファイルのリスト
 * @param {string[]} subFolders サブフォルダのリスト
 * @param {import('./assetsGlobbing.d.ts').UserConfig} options
 */
const generateAggregateFiles = (dir, scssFiles, tsFiles, subFolders, options) => {
  log(options, `[Assets Globbing] ディレクトリ処理: ${dir}`);
  log(options, `  - SCSSファイル: ${scssFiles.length}件`);
  log(options, `  - TSファイル: ${tsFiles.length}件`);
  log(options, `  - サブフォルダ: ${subFolders.length}件`);
  
  // SCSSファイルをまとめる
  let scssImports = '';
  
  scssFiles.forEach((file) => {
    const relativePath = normalizePath(relative(dir, file));
    scssImports += `@forward "./${relativePath}";\n`;
  });
  
  subFolders.forEach((folder) => {
    const subScssPath = join(folder, '+.scss');
    if (fs.existsSync(subScssPath)) {
      const relativePath = normalizePath(relative(dir, subScssPath));
      scssImports += `@forward "./${relativePath}";\n`;
    }
  });

  const scssOutputPath = join(dir, '+.scss');
  if (scssImports !== '') {
    if (!fs.existsSync(scssOutputPath) || fs.readFileSync(scssOutputPath, 'utf8') !== scssImports) {
      fs.writeFileSync(scssOutputPath, scssImports);
      log(options, `[Assets Globbing] 更新しました: ${scssOutputPath}`);
    }
  } else if (fs.existsSync(scssOutputPath)) {
    fs.unlinkSync(scssOutputPath);
    log(options, `[Assets Globbing] 削除しました（空のため）: ${scssOutputPath}`);
  }

  // TSファイルをまとめる
  let tsImports = '';
  
  tsFiles.forEach((file) => {
    const relativePath = normalizePath(relative(dir, file));
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
  
  subFolders.forEach((folder) => {
    const subTsPath = join(folder, '+.ts');
    if (fs.existsSync(subTsPath)) {
      const relativePath = normalizePath(relative(dir, subTsPath));
      tsImports += `export * from './${relativePath}';\n`;
    }
  });

  const tsOutputPath = join(dir, '+.ts');
  if (tsImports !== '') {
    if (!fs.existsSync(tsOutputPath) || fs.readFileSync(tsOutputPath, 'utf8') !== tsImports) {
      fs.writeFileSync(tsOutputPath, tsImports);
      log(options, `[Assets Globbing] 更新しました: ${tsOutputPath}`);
    }
  } else if (fs.existsSync(tsOutputPath)) {
    fs.unlinkSync(tsOutputPath);
    log(options, `[Assets Globbing] 削除しました（空のため）: ${tsOutputPath}`);
  }
};

/**
 * ディレクトリとそのサブディレクトリから再帰的にファイルを収集
 * @param {string} dir ディレクトリパス
 * @param {import('./assetsGlobbing.d.ts').UserConfig} options
 * @returns {{ scssFiles: string[], tsFiles: string[] }}
 */
const collectFilesRecursively = (dir, options) => {
  const { scssFiles, tsFiles, subFolders } = collectFilesInDirectory(dir, options);
  
  const allScssFiles = [...scssFiles];
  const allTsFiles = [...tsFiles];
  
  subFolders.forEach((subFolder) => {
    const subResult = collectFilesRecursively(subFolder, options);
    allScssFiles.push(...subResult.scssFiles);
    allTsFiles.push(...subResult.tsFiles);
  });
  
  return { scssFiles: allScssFiles, tsFiles: allTsFiles };
};

/**
 * ディレクトリを再帰的に処理
 * @param {string} dir ディレクトリパス
 * @param {import('./assetsGlobbing.d.ts').UserConfig} options
 */
const processDirectory = (dir, options) => {
  const { scssFiles, tsFiles, subFolders } = collectFilesInDirectory(dir, options);
  
  subFolders.forEach((subFolder) => {
    processDirectory(subFolder, options);
  });
  
  if (subFolders.length > 0) {
    const allFiles = collectFilesRecursively(dir, options);
    generateAggregateFiles(dir, allFiles.scssFiles, allFiles.tsFiles, [], options);
  }
};

/**
 * @param {import('./assetsGlobbing.d.ts').UserConfig} options
 * @param {import('vite').ResolvedConfig} config
 */
const assetsGlobbing = (options, config) => {
  const componentsRoot = normalizePath(resolve(config.root, options.outputDir));
  
  log(options, `[Assets Globbing] 処理開始: ${componentsRoot}`);
  
  processDirectory(componentsRoot, options);
  
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
