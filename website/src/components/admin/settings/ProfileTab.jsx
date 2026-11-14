import { useEffect, useState } from 'react';
import { Camera, ChevronDown, Pencil } from 'lucide-react';

import { useAppSelector } from '../../../store/slices/hooks';
import { selectMe } from '../../../store/slices/userSlice';
import { selectProfile } from '../../../store/slices/authSlice';
import authService from '../../../lib/appwrite/auth';
import ActionButton from '../../../ui/custom/button/ActionButton';
import PasswordDrawer from './PasswordDrawer';
import ProfileDrawer from './ProfileDrawer';
import { Avatar, Banner, Chip, Ico, RoleChip } from './SettingsParts';
import { fmtDate, fmtDay, fmtMoney, val } from './settingsMeta';

/* ---------- small layout pieces ---------- */

function Section({ title, hint, children }) {
  return (
    <section className="p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <dl className="mt-4 grid gap-x-10 gap-y-5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Item({ label, children, onChange, wide = false }) {
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            aria-label={`Change ${label}`}
            className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Pencil size={12} aria-hidden="true" /> Change
          </button>
        )}
      </div>
      <dd className="mt-1 break-words text-sm text-text">{children}</dd>
    </div>
  );
}

function Stat({ icon, value, label, title }) {
  return (
    <div className="flex items-center gap-3 bg-surface p-4 sm:gap-4 sm:p-5" title={title}>
      <Ico name={icon} className="size-9 sm:size-11" />
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tabular-nums text-text sm:text-xl">{value}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

/* ---------- the tab ---------- */

// Cover + avatar header, a stat strip, then the details. "Change" opens the full edit form
// from the right and scrolls the clicked field to the top.
export default function ProfileTab() {
  const tableRow = useAppSelector(selectMe);
  const authRow = useAppSelector(selectProfile);
  const me = tableRow || authRow;

  const [account, setAccount] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [field, setField] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
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

  if (!me) return <p className="text-sm text-muted">Loading your profile…</p>;

  const edit = (key) => {
    setField(key);
    setProfileOpen(true);
  };
  const labels = account?.labels ?? me.labels ?? [];

  return (
    <div className="space-y-4">
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}

      {/* cover + identity */}
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="relative h-24 sm:h-32" style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}>
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-32 hidden h-32 w-32 rounded-full bg-white/[0.07] sm:block" />
        </div>

        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-12 flex flex-col items-center gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              <span className="block rounded-full border-4 border-surface bg-surface">
                <Avatar user={me} size="size-24 text-2xl sm:size-28 sm:text-3xl" />
              </span>
              <button
                type="button"
                onClick={() => edit('avatar')}
                aria-label="Change photo"
                className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full border border-border bg-surface text-text shadow-soft transition-colors hover:border-accent hover:text-accent"
              >
                <Camera size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
              <h2 className="heading truncate text-xl text-text sm:text-2xl">{me.name || 'Your name'}</h2>
              <p className="truncate text-sm text-muted">@{me.username || '—'}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <RoleChip role={me.role} />
                {labels.filter((l) => l !== me.role).map((l) => <Chip key={l}>{l}</Chip>)}
              </div>
            </div>

            <ActionButton variant="secondary" icon={Pencil} onClick={() => edit('name')}>Edit profile</ActionButton>
          </div>
        </div>
      </section>

      {/* numbers */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        <Stat icon="boxes" value={val(me.ordersCount ?? 0)} label="Orders" />
        <Stat icon="pkr" value={fmtMoney(me.totalSpent)} label="Total spent" />
        <Stat icon="clock" value={fmtDay(me.lastLoginAt)} label="Last login" title={fmtDate(me.lastLoginAt)} />
        <Stat icon="calendar" value={fmtDay(me.$createdAt)} label="Member since" title={fmtDate(me.$createdAt)} />
      </section>

      {/* details */}
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        <Section title="Contact">
          <Item label="Name" onChange={() => edit('name')}>{val(me.name)}</Item>
          <Item label="Username" onChange={() => edit('username')}>{me.username ? `@${me.username}` : '—'}</Item>
          <Item label="Email">{val(me.email)}</Item>
          <Item label="Phone" onChange={() => edit('phone')}>{val(me.phone)}</Item>
        </Section>

        <Section title="Delivery" hint="Saved from your last order.">
          <Item label="City" onChange={() => edit('lastCity')}>{val(me.lastCity)}</Item>
          <Item label="Address" wide onChange={() => edit('lastAddress')}>{val(me.lastAddress)}</Item>
        </Section>

        <Section title="Security">
          <Item label="Password" onChange={() => setPasswordOpen(true)}>
            ••••••••
            {account && <span className="block text-xs text-muted">Last changed {fmtDay(account.passwordUpdate)}</span>}
          </Item>
          <Item label="Email verified">{account ? (account.emailVerification ? 'Yes' : 'No') : '…'}</Item>
          <Item label="Signed up with"><span className="capitalize">{val(me.authProvider)}</span></Item>
          <Item label="Account status">{me.isBlocked ? 'Blocked' : 'Active'}</Item>
        </Section>

        <details className="group p-4 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
            Technical IDs
            <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <dl className="mt-4 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            <Item label="User ID"><span className="break-all font-mono text-xs">{me.$id}</span></Item>
            <Item label="Cart ID"><span className="break-all font-mono text-xs">{val(me.cartId)}</span></Item>
            <Item label="Wishlist ID"><span className="break-all font-mono text-xs">{val(me.wishlistId)}</span></Item>
          </dl>
        </details>
      </div>

      <ProfileDrawer
        open={profileOpen}
        field={field}
        me={me}
        onClose={() => setProfileOpen(false)}
        onSaved={(message) => {
          setProfileOpen(false);
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
    </div>
  );
}