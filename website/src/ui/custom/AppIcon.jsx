export default function AppIcon({ name, className = 'size-6' }) {
  if (!name) return null;

  return (
    <img
      src={`${import.meta.env.BASE_URL}images/icons/app_icons/${name}.ico`}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`object-contain ${className}`}
    />
  );
}
