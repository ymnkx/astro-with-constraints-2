import StyleDictionary from 'style-dictionary';

// Style Dictionaryを初期化
const sd = StyleDictionary.extend('./sd.config.composite.js');

// ビルドを実行
sd.buildAllPlatforms();

console.log('✅ トークンのビルドが完了しました！');
