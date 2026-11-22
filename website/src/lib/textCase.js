export const toTitleCase = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, separator, letter) => `${separator}${letter.toUpperCase()}`);
