import { useState } from 'react';
import { Ban, MapPin, ShieldCheck } from 'lucide-react';

import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import { colorFor, tint } from '../../../ui/graphs/utils';
import { ROLE_COLOR, avatarOf, initialsOf, isTeamRole, providerMeta } from './userFields';

// Soft tinted pill, the same look as the category chips in the products table.
function Chip({ color, icon: Icon, children, className = '' }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{ background: tint(color, 14), color }}
    >
      {Icon ? (
        <Icon size={12} aria-hidden="true" className="shrink-0" />
      ) : (
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

// `size` carries both the box and the initials text size, e.g. 'size-16 text-lg'.
export function Avatar({ user, size = 'size-10 text-sm', className = '' }) {
  const src = avatarOf(user);
  const [brokenSrc, setBrokenSrc] = useState('');
  const showImage = src && src !== brokenSrc;
  const color = colorFor(user?.$id || user?.email || user?.name);

  return (
    <span
      style={showImage ? undefined : { background: tint(color, 14), color }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-alt font-medium text-muted transition-transform duration-300 ${size} ${className}`}
    >
      {showImage ? (
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBrokenSrc(src)} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initialsOf(user)}</span>
      )}
    </span>
  );
}

// admin / support / manager carry a shield so the team stands out from customers.
export function RoleBadge({ role }) {
  const value = role || 'new';
  const team = isTeamRole(value);
  const chip = (
    <Chip color={ROLE_COLOR[value] || colorFor(value)} icon={team ? ShieldCheck : undefined} className="capitalize">
      {value}
    </Chip>
  );
  return team ? <Tooltip label="Team member">{chip}</Tooltip> : chip;
}

// Icon + colour per sign-in method (email, google, github ...).
export function ProviderChip({ provider }) {
  const meta = providerMeta(provider);
  return <Chip color={meta.color} icon={meta.icon}>{meta.label}</Chip>;
}

export function CityChip({ city }) {
  if (!city) return null;
  return <Chip color={colorFor(city)} icon={MapPin}>{city}</Chip>;
}

export function BlockedBadge() {
  return <Chip color="var(--error)" icon={Ban}>Blocked</Chip>;
}