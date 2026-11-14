export default function FormattedValue({ value, svg = false }) {
  if (typeof value !== 'string') return value;
  const currency = value.match(/^(-?)Rs\s+(.+)$/);
  if (!currency) return value;

  if (svg) {
    return (
      <>
        <tspan fontSize="7">{currency[1]}Rs</tspan>
        <tspan fontSize="10"> {currency[2]}</tspan>
      </>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="text-[0.75em] font-normal">{currency[1]}Rs</span>
      <span>{currency[2]}</span>
    </span>
  );
}
