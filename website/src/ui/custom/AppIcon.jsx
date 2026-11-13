export default function AppIcon({ name, tone = 1, className = 'size-6' }) {
  if (!name) return null;

  const toneNumber = Number.isInteger(tone) ? ((tone - 1 + 8) % 8) + 1 : 1;
  return (
    <img
      src={`${import.meta.env.BASE_URL}images/icons/app_icons/${name}.ico`}
      alt=""
      aria-hidden="true"
      draggable="false"
      style={{ filter: `hue-rotate(var(--tone-hue-${toneNumber}))` }}
      className={`object-contain ${className}`}
    />
  );
}
