const formatAmount = (value) => new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Math.abs(Math.round(Number(value) || 0)));
const formatCompactNumber = (value) => new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

export const formatCardMoney = (value) => (
  <span className="inline-flex max-w-full items-baseline gap-1 overflow-hidden whitespace-nowrap">
    {Number(value) < 0 && <span className="shrink-0">-</span>}
    <span className="shrink-0 text-[0.58em] font-medium text-muted">Rs</span>
    <span className="min-w-0 truncate text-[1.25em] font-semibold">{formatAmount(value)}</span>
    <span className="shrink-0 text-[0.58em] font-medium text-muted">/-</span>
  </span>
);

export const formatFullCardMoney = (value) => {
  const amount = Math.abs(Math.round(Number(value) || 0)).toLocaleString('en-PK');
  return `${Number(value) < 0 ? '-' : ''}Rs ${amount}/-`;
};

export const fullCardValue = (value, format) => {
  if (typeof value !== 'number') return value;
  if (format === formatCardMoney) return formatFullCardMoney(value);

  const formatted = format?.(value);
  if (typeof formatted === 'string' && /[%/]/.test(formatted)) return formatted;
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(value);
};

export const formatCardNumber = (value, format) => {
  if (!format) return formatCompactNumber(value);
  const formatted = format(value);
  if (Math.abs(Number(value) || 0) >= 1_000 && (
    typeof formatted === 'number' ||
    (typeof formatted === 'string' && /^[-\d,.\s]+$/.test(formatted))
  )) {
    return formatCompactNumber(value);
  }
  return formatted;
};
