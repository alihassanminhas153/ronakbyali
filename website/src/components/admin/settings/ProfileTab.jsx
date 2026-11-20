import { useEffect, useState } from 'react';
import { BadgeCheck, ChevronRight, KeyRound, X } from 'lucide-react';

import { useAppSelector } from '../../../store/slices/hooks';
import { selectProfile } from '../../../store/slices/authSlice';
import { selectMe } from '../../../store/slices/userSlice';
import authService from '../../../lib/appwrite/auth';
import ThemeToggle from '../../../ui/custom/toggles/ThemeToggle';
import PasswordDrawer from './PasswordDrawer';
import ProfileDrawer from './ProfileDrawer';
import { Avatar, Banner, Chip, Ico, Portal, RoleChip } from './SettingsParts';
import { fmtDate, fmtDay, fmtMoney, val } from './settingsMeta';

const rise = (i) => ({ animationDelay: `${i * 70}ms` });

// small muted title above a group, like the section labels in WhatsApp / Instagram settings
function Group({ title, index = 0, children }) {
  return (
    <section style={rise(index)} className="animate-rise">
      {title && <h3 className="mb-1.5 px-4 text-xs font-medium uppercase tracking-wide text-muted sm:px-5">{title}</h3>}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        {children}
      </div>
    </section>
  );
}

// One list row. Pass onClick to make it tappable (shows a chevron); without it the row is read-only.
// Pass `end` to show something on the right (a chip, a toggle) instead of the chevron.
function Row({ icon, tone, label, value, onClick, end, title, children }) {
  const body = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-alt">
        <Ico name={icon} tone={tone} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-muted">{label}</span>
        {children ?? (
          <span className="block truncate text-sm text-text">
            {value || <span className="text-muted">Not set</span>}
          </span>
        )}
      </span>
      {end}
      {onClick && !end && (
        <ChevronRight
          size={16}
          className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
          aria-hidden="true"
        />
      )}
    </>
  );

  const base = 'flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5';

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group ${base} transition-colors hover:bg-surface-alt/50 focus-visible:bg-surface-alt/50 focus-visible:outline-none`}
    >
      {body}
    </button>
  ) : (
    <div title={title} className={base}>
      {body}
    </div>
  );
}

// The page only shows a summary. Every change is made in the drawer that slides in from the right of the window.
export default function ProfileTab() {
  const tableRow = useAppSelector(selectMe);
  const authRow = useAppSelector(selectProfile);
  const me = tableRow || authRow;

  const [account, setAccount] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerField, setDrawerField] = useState('avatar');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let live = true;
    authService.getCurrentUser().then((user) => live && setAccount(user || null));
    return () => {
      live = false;
    };
  }, [passwordOpen]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!avatarOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setAvatarOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [avatarOpen]);

  if (!me) return <p className="text-sm text-muted">Loading your profile…</p>;

  const labels = account?.labels ?? me.labels ?? [];
  const extraLabels = labels.filter((l) => l !== me.role);
  const verified = Boolean(account?.emailVerification);
  const edit = (field = 'avatar') => {
    setDrawerField(field);
    setDrawerOpen(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}

      {/* profile details: tap a row to edit it */}
      <Group title="Profile" index={0}>
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            aria-label="View profile photo"
            className="shrink-0 rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <Avatar user={me} size="size-14 text-xl" />
          </button>
          <button
            type="button"
            onClick={() => edit('avatar')}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-muted">Profile photo</span>
              <span className="block truncate text-sm font-medium text-accent group-hover:underline">Change photo</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
          </button>
        </div>
        <Row icon="settings_gear" tone={1} label="Name" value={me.name} onClick={() => edit('name')} />
        <Row icon="network" tone={3} label="Username" value={me.username ? `@${me.username}` : ''} />
        <Row icon="network" tone={2} label="Email" value={me.email} onClick={() => edit('account')} />
        <Row icon="network" tone={5} label="Phone" value={me.phone} onClick={() => edit('phone')} />
        <Row icon="truck" tone={4} label="Delivery city" value={me.lastCity} onClick={() => edit('lastCity')} />
      </Group>

      {/* account status */}
      <Group title="Account" index={1}>
        <Row icon="settings_gear" tone={6} label="Role">
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <RoleChip role={me.role} />
            {extraLabels.map((l) => <Chip key={l}>{l}</Chip>)}
          </span>
        </Row>
        <Row icon="settings_gear" tone={7} label="Status">
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Chip tone={me.isBlocked ? 'remove' : 'add'}>{me.isBlocked ? 'Blocked' : 'Active'}</Chip>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-fg">
                <BadgeCheck size={13} aria-hidden="true" /> Verified
              </span>
            )}
          </span>
        </Row>
        <Row icon="calendar" tone={3} label="Member since" value={fmtDay(me.$createdAt)} title={fmtDate(me.$createdAt)} />
        <Row icon="clock" tone={5} label="Last login" value={fmtDay(me.lastLoginAt)} title={fmtDate(me.lastLoginAt)} />
      </Group>

      {/* shopping numbers */}
      <Group title="Activity" index={2}>
        <Row icon="boxes" tone={2} label="Orders" value={val(me.ordersCount ?? 0)} />
        <Row icon="pkr" tone={7} label="Total spent" value={fmtMoney(me.totalSpent)} />
      </Group>

      {/* security + appearance */}
      <Group title="Settings" index={3}>
        <Row
          icon="settings_gear"
          tone={4}
          label="Security"
          onClick={() => setPasswordOpen(true)}
          end={<KeyRound size={16} className="shrink-0 text-muted group-hover:text-accent" aria-hidden="true" />}
        >
          <span className="block text-sm text-text">Change password</span>
        </Row>
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <span className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-alt">
              <Ico name="settings_gear" tone={8} className="size-5" />
            </span>
            <span className="text-sm text-text">Appearance</span>
          </span>
          <ThemeToggle />
        </div>
      </Group>

      {/* these render into <body>, so they cover the whole browser window */}
      <ProfileDrawer
        open={drawerOpen}
        field={drawerField}
        me={me}
        account={account}
        onClose={() => setDrawerOpen(false)}
        onSaved={(message) => {
          setDrawerOpen(false);
          setNotice(message);
        }}
      />
      <PasswordDrawer
        open={passwordOpen}
        googleOnly={me.authProvider === 'google'}
        onClose={() => setPasswordOpen(false)}
        onSaved={(message) => {
          setPasswordOpen(false);
          setNotice(message);
        }}
      />

      {avatarOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[70] flex animate-rise items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setAvatarOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Profile photo preview"
          >
            <div className="relative w-full max-w-[min(80vw,420px)]" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setAvatarOpen(false)} className="absolute -top-3 right-0 z-10 grid size-9 place-items-center rounded-full border border-border bg-surface text-text shadow-soft" aria-label="Close image preview">
                <X size={18} aria-hidden="true" />
              </button>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-soft">
                <Avatar user={me} size="size-[min(80vw,420px)] text-[clamp(3rem,10vw,5rem)]" />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}