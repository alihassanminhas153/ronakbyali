// src/lib/generatePassword.js
//
// 10 characters: 4 taken from the customer's first name + 6 random ones.
//   - always has an uppercase letter, a lowercase letter, a number and a special character
//   - the name part is capitalised ("Ali" -> "Alix"); short or missing names are padded with random letters
//   - uses crypto.getRandomValues (never Math.random)
// Example: name "Ayesha Khan" -> "Ayes7k!Qm4"

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*?';
const ALNUM = UPPER + LOWER + DIGITS;

// unbiased random index in [0, n)
const randomIndex = (n) => {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
};
const pick = (set) => set[randomIndex(set.length)];

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function generatePassword(name = '') {
  const first = String(name).trim().split(/\s+/)[0] || '';
  const letters = first
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 4)
    .toLowerCase();

  const head = letters.split('');
  while (head.length < 4) head.push(pick(LOWER));
  head[0] = head[0].toUpperCase();

  const tail = shuffle([pick(DIGITS), pick(SPECIAL), pick(LOWER), pick(ALNUM), pick(ALNUM), pick(ALNUM)]);
  return head.join('') + tail.join('');
}