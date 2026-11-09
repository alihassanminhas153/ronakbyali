import { useEffect, useState } from 'react';
import { Clock, Lock, ShieldCheck, UserRound, Wallet, X } from 'lucide-react';
import './userScroll.css';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  clearUserError,
  selectPendingUserIds,
  selectUserById,
  selectUsersError,
  setUserRole,
} from '../../../store/slices/userSlice';

import SelectInput from '../../../ui/custom/input/SelectInput';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { Avatar, BlockedBadge, ProviderChip, RoleBadge } from './UserBadges';
import UserErrorBanner from './UserErrorBanner';
import {
  ROLE_EDIT_OPTIONS,
  USER_SECTIONS,
  blockLockReason,
  readField,
  roleLockReason,
} from './userFields';

/* ---------- section pieces (same look as ProductForm) ---------- */

const SECTION_ICONS = [UserRound, Clock, Wallet, ShieldCheck];
const SECTION_TONES = [5, 2, 3, 6];

function SectionHead({ icon: Icon, title, subtitle, tone, readOnly }) {
  const color = toneVar(tone);
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/sec:-rotate-6 group-hover/sec:scale-110"
        style={{ background: tint(color, 14), color }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="heading-sm" style={{ color }}>{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {readOnly && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
          <Lock size={11} aria-hidden="true" /> Read only
        </span>
      )}
    </div>
  );
}

function Section({ title, subtitle, icon, tone = 1, readOnly = false, children, delay = 0 }) {
  return (
    <section
      style={{ animationDelay: `${delay}ms`, borderTopColor: toneVar(tone) }}
      className="group/sec animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4"
    >
      <SectionHead icon={icon} title={title} subtitle={subtitle} tone={tone} readOnly={readOnly} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-text">
        <span>{label}</span>
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

// A read-only value, drawn like a disabled input.
function ReadValue({ label, children, wide }) {
  return (
    <Field label={label} className={wide ? 'sm:col-span-2' : ''}>
      <div className="min-h-[2.5rem] break-words rounded-md border border-border bg-surface px-3 py-2 text-sm text-text">
        {children}
      </div>
    </Field>
  );
}

function Switch({ checked, onChange, label, hint, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-graph-4/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border"
    >
      <span>
        <span className="block text-sm font-medium text-text">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-error' : 'bg-border'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

/* ---------- the drawer ---------- */

// Detail drawer, same design and slide-in as ProductForm.
//   userId           -> row to show (read live from the store, so the optimistic
//                       block switch and role changes show up immediately)
//   meId             -> the signed-in user, for the self guards
//   onToggleBlocked  -> (user, nextBlocked); the page owns the confirm dialog
// Only role (setUserRole) and isBlocked (setUserBlocked) can be edited; the rest is read-only.
export default function UserForm({ open = true, userId = null, meId = null, onClose, onToggleBlocked }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => (userId ? selectUserById(state, userId) : undefined));
  const pendingIds = useAppSelector(selectPendingUserIds);
  const error = useAppSelector(selectUsersError);

  // Slide-in: mount closed, flip to open on the next frame so the transition runs.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) {
      setShown(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!user) return null;

  const pending = pendingIds.includes(user.$id);
  const blockLock = blockLockReason(user, meId);
  const roleLock = roleLockReason(user, meId);

  const onRole = (role) => {
    if (role && role !== user.role) dispatch(setUserRole({ userId: user.$id, role }));
  };

  return (
    <div
      className="fixed inset-0 z-40"
      style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? 0 : 350}ms` }}
      aria-hidden={!open}
    >
      <div
        onClick={() => onClose?.()}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="User details"
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading truncate text-text">{user.name || user.username || 'User'}</h2>
            <p className="truncate text-xs text-muted">{user.email || 'User details'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <X size={18} />
          </button>
        </header>

        <div className="user-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {error && <UserErrorBanner message={error} onDismiss={() => dispatch(clearUserError())} />}

          {/* who this is */}
          <div className="animate-rise flex items-center gap-4 rounded-lg border border-border bg-surface-alt/40 p-4">
            <Avatar user={user} size="size-16 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">@{user.username || '—'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={user.role} />
                {user.isBlocked && <BlockedBadge />}
                <ProviderChip provider={user.authProvider} />
              </div>
            </div>
          </div>

          {/* the only editable part */}
          <Section title="Access" subtitle="The only things you can change here." icon={ShieldCheck} tone={4} delay={60}>
            <Field label="Role" hint={roleLock || (pending ? 'Saving…' : 'saves when you pick')}>
              <SelectInput
                aria-label="Role"
                options={ROLE_EDIT_OPTIONS}
                value={user.role || 'new'}
                onChange={onRole}
                disabled={pending || Boolean(roleLock)}
              />
            </Field>
            <div className="flex items-end">
              <Switch
                label="Blocked"
                hint={blockLock || 'A blocked user only sees the blocked page.'}
                checked={user.isBlocked === true}
                onChange={(next) => onToggleBlocked?.(user, next)}
                disabled={pending || Boolean(blockLock)}
              />
            </div>
          </Section>

          {/* everything else is read-only */}
          {USER_SECTIONS.map((section, i) => (
            <Section
              key={section.title}
              title={section.title}
              icon={section.icon || SECTION_ICONS[i % SECTION_ICONS.length]}
              tone={SECTION_TONES[i % SECTION_TONES.length]}
              readOnly
              delay={120 + i * 60}
            >
              {section.fields.map((field) => (
                <ReadValue key={field.key} label={field.label} wide={field.wide}>
                  {readField(user, field)}
                </ReadValue>
              ))}
            </Section>
          ))}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">
          <p className={`text-sm text-muted transition-opacity ${pending ? 'opacity-100' : 'opacity-0'}`} role="status">
            Saving…
          </p>
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}