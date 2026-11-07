import { useState } from 'react';
import { Ban, Globe, Mail, ShieldCheck } from 'lucide-react';

import { ROLE_TONE, avatarOf, initialsOf, isTeamRole } from './userFields';

// `size` carries both the box and the initials text size, e.g. 'size-16 text-lg'.
export function Avatar({ user, size = 'size-10 text-sm' }) {
  const src = avatarOf(user);
  const [brokenSrc, setBrokenSrc] = useState('');
  const showImage = src && src !== brokenSrc;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-alt font-medium text-muted ${size}`}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBrokenSrc(src)}
          className="size-full object-cover"
        />
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
  return (
    <span
      title={team ? 'Team member' : undefined}
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium capitalize ${
        ROLE_TONE[value] || ROLE_TONE.new
      }`}
    >
      {team && <ShieldCheck size={12} aria-hidden="true" />}
      {value}
    </span>
  );
}

export function ProviderChip({ provider }) {
  const value = provider || 'email';
  const Icon = value === 'google' ? Globe : Mail;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-2 py-0.5 text-xs capitalize text-muted">
      <Icon size={12} aria-hidden="true" />
      {value}
    </span>
  );
}

export function BlockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-error/30 bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
      <Ban size={12} aria-hidden="true" />
      Blocked
    </span>
  );
}