// yubinbango-core2 は型定義を同梱していないため自前で定義する
declare module 'yubinbango-core2' {
  interface YubinBangoAddress {
    region_id: string; // 都道府県コード（例: '13'）
    region: string; // 都道府県名（例: '東京都'）
    locality: string; // 市区町村
    street: string; // 町域
    extended: string; // 以降の住所（通常は空）
  }

  class Core {
    constructor(postalCode: string, callback: (address: YubinBangoAddress) => void);
  }

  const YubinBango: { Core: typeof Core };
  export = YubinBango;
}
