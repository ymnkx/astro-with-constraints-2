import YubinBango from 'yubinbango-core2';

// 郵便番号（3桁 + 4桁）から住所を自動入力する
const postal1 = document.querySelector<HTMLInputElement>('[name="postalCode1"]');
const postal2 = document.querySelector<HTMLInputElement>('[name="postalCode2"]');
const region = document.querySelector<HTMLSelectElement>('#prefecture');
const locality = document.querySelector<HTMLInputElement>('#city');
const street = document.querySelector<HTMLInputElement>('#town');

if (postal1 && postal2 && region && locality && street) {
  const fillAddress = (): void => {
    const code = `${postal1.value}${postal2.value}`.replace(/[^0-9]/g, '');
    // 7桁そろったときだけ検索
    if (code.length !== 7) {
      return;
    }

    new YubinBango.Core(code, (address) => {
      // 都道府県は select の option 値（都道府県名）と一致させて選択する
      if (address.region) {
        region.value = address.region;
      }
      locality.value = address.locality;
      street.value = address.street;
    });
  };

  postal1.addEventListener('input', fillAddress);
  postal2.addEventListener('input', fillAddress);
}
