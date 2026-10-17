export const toArabicDigits = (value: string | number): string =>
  String(value).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
