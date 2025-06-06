interface ExtnamePattern {
  [key: string]: RegExp;
}

interface FilenamePattern {
  [key: string]: string | string[];
}

export interface UserConfig {
  /**
   * ファイル名パターン設定
   */
  filenamePattern?: {
    [key: string]: string;
  };
  /**
   * 拡張子パターン設定
   */
  extnamePattern?: {
    styles: RegExp;
    scripts: RegExp;
  };
  /**
   * 対象パス
   */
  paths?: string[];
  /**
   * 出力ディレクトリ
   */
  outputDir?: string;
  /**
   * ログ出力を有効にするかどうか
   * @default true
   */
  logEnabled?: boolean;
}
