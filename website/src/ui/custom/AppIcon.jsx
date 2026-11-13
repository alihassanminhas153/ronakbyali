import { entityColorStep, iconToneClass } from '../../lib/entityColors';

export default function AppIcon({ name, tone = 1, entity, hueRotate = true, className = 'size-6' }) {
  if (!name) return null;
  const resolvedTone = entity ? entityColorStep('entity', entity) : tone;
  const toneClass = hueRotate ? iconToneClass(resolvedTone) : '';

  return (
    <img
      src={`${import.meta.env.BASE_URL}images/icons/app_icons/${name}.ico`}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`icon ${toneClass} object-contain ${className}`}
    />
  );
}
