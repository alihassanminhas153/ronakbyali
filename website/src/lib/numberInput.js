export const normalizeNumberInput = (value) => {
  const input = String(value ?? '');
  const match = input.match(/^([+-]?)(\d*)(\.\d*)?([eE][+-]?\d*)?$/);
  if (!match) return input;

  const [, sign, integer, fraction = '', exponent = ''] = match;
  if (!integer && !fraction && !exponent) return input;

  const normalizedInteger = integer.replace(/^0+(?=\d)/, '') || (fraction ? '0' : integer);
  return `${sign}${normalizedInteger}${fraction}${exponent}`;
};
