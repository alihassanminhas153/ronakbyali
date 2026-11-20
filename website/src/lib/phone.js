export function isValidPhoneNumber(phone) {
  const value = String(phone || '').trim();
  if (!value || !/^\+?[0-9\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function normalizeWhatsAppNumber(phone) {
  if (!isValidPhoneNumber(phone)) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `92${digits.slice(1)}`;
  if (!digits.startsWith('92') && digits.length === 10) digits = `92${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone, message = '') {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
