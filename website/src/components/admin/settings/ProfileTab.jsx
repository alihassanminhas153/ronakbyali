import { useEffect, useState } from 'react';
import { Camera, Check, ChevronDown, Pencil, Save, X } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { refreshProfile, selectProfile, updateName } from '../../../store/slices/authSlice';
import { refreshMyProfile, selectMe, updateMyProfile } from '../../../store/slices/userSlice';
import authService from '../../../lib/appwrite/auth';
import ActionButton from '../../../ui/custom/button/ActionButton';
import TextInput from '../../../ui/custom/input/TextInput';
import PasswordDrawer from './PasswordDrawer';
import ProfileDrawer from './ProfileDrawer';
import ThemeToggle from '../../../ui/custom/toggles/ThemeToggle';
import { Avatar, Banner, Chip, Ico, RoleChip } from './SettingsParts';
import { fmtDate, fmtDay, fmtMoney, val } from './settingsMeta';

/* ---------- small layout pieces ---------- */

function Section({ title, hint, icon, tone = 1, table = false, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface-alt">
          <Ico name={icon} tone={tone} className="size-7" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
      </div>
      <dl className={table ? '-mx-4 -mb-4 divide-y divide-border border-t border-border sm:-mx-5 sm:-mb-5' : 'grid gap-3 sm:grid-cols-2'}>
        {children}
      </dl>
    </section>
  );
}

function Item({ label, children, onChange, icon, tone = 1 }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface-alt/50 p-3 transition-colors hover:border-accent/40">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface">
        <Ico name={icon} tone={tone} className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</dt>
        <dd className="mt-1 break-words text-sm text-text">{children}</dd>
      </div>
      {onChange && (
        <button
          type="button"
          onClick={onChange}
          aria-label={`Change ${label}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-accent transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Pencil size={12} aria-hidden="true" /> <span className="hidden sm:inline">Edit</span>
        </button>
      )}
    </div>
  );
}

function EditableItem({ label, value, icon, tone = 1, editing, onEdit, onChange, error, multiline = false }) {
  return (
    <div className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(9rem,0.38fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
      <dt className="flex items-center gap-3 text-xs font-medium text-muted">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-alt">
          <Ico name={icon} tone={tone} className="size-6" />
        </span>
        {label}
      </dt>
      <dd className="min-w-0">
        {editing ? (
          <TextInput
            label={null}
            aria-label={label}
            value={value}
            onChange={onChange}
            error={error}
            as={multiline ? 'textarea' : 'input'}
            rows={multiline ? 3 : undefined}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-md px-2 py-2 text-left text-sm text-text transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={`Edit ${label}`}
          >
            {value || <span className="text-muted">Not set</span>}
          </button>
        )}
      </dd>
      <div className="flex justify-end">
        {editing ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
            <Check size={14} aria-hidden="true" /> Editing
          </span>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${label}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-accent transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Pencil size={12} aria-hidden="true" /> Edit
          </button>
        )}
      </div>
    </div>
  );
}

const editableFields = [
  { key: 'name', label: 'Name', icon: 'user', tone: 3 },
  { key: 'username', label: 'Username', icon: 'user', tone: 5 },
  { key: 'phone', label: 'Phone', icon: 'network', tone: 5 },
  { key: 'lastCity', label: 'City', icon: 'network', tone: 3 },
  { key: 'lastAddress', label: 'Delivery address', icon: 'truck', tone: 4, multiline: true },
];

const profileValues = (profile) => Object.fromEntries(editableFields.map(({ key }) => [key, profile?.[key] || '']));

const profileChanges = (values, profile) =>
  Object.fromEntries(
    editableFields
      .map(({ key }) => [key, String(values[key] || '').trim()])
      .filter(([key, value]) => value !== String(profile?.[key] || '').trim())
      .map(([key, value]) => [key, key === 'username' ? value.toLowerCase() : value])
  );

function Stat({ icon, value, label, title, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:gap-4 sm:p-5" title={title}>
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-surface-alt">
        <Ico name={icon} tone={tone} className="size-8" />
      </span>
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
  const dispatch = useAppDispatch();
  const tableRow = useAppSelector(selectMe);
  const authRow = useAppSelector(selectProfile);
  const me = tableRow || authRow;

  const [account, setAccount] = useState(null);
  const [values, setValues] = useState(() => profileValues(me));
  const [editing, setEditing] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const changes = profileChanges(values, me);
  const hasChanges = Object.keys(changes).length > 0;

  useEffect(() => {
    if (!me) return;
    setValues(profileValues(me));
    setEditing({});
  }, [me]);

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

  const editAvatar = () => {
    setSaveError('');
    setProfileOpen(true);
  };
  const labels = account?.labels ?? me.labels ?? [];

  const saveProfile = async () => {
    if (!hasChanges || saving) return;
    const nextName = changes.name;
    const errors = {};
    if (nextName !== undefined && nextName.length < 2) {
      errors.name = 'Enter at least 2 characters.';
    }
    if (changes.username !== undefined && !/^[a-z0-9._-]{3,30}$/i.test(changes.username)) {
      errors.username = 'Use 3 to 30 letters, numbers, dots, dashes or underscores.';
    }
    if (changes.phone && !/^\+?[0-9\s-]{7,16}$/.test(changes.phone)) {
      errors.phone = 'Enter a valid phone number.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSaveError('Review the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    setSaveError('');
    const result = await dispatch(updateMyProfile(changes));
    if (!updateMyProfile.fulfilled.match(result)) {
      setSaveError(typeof result.payload === 'string' ? result.payload : 'Could not save your profile.');
      setSaving(false);
      return;
    }

    let syncMessage = '';
    if (nextName !== undefined) {
      const nameResult = await dispatch(updateName({ name: nextName }));
      if (!updateName.fulfilled.match(nameResult)) {
        syncMessage = `Profile saved, but the account name could not be synchronized: ${nameResult.payload || 'please try again.'}`;
      }
    }

    const refreshResults = await Promise.all([dispatch(refreshMyProfile()), dispatch(refreshProfile())]);
    if (refreshResults.some((action) => action.meta.requestStatus !== 'fulfilled')) {
      syncMessage ||= 'Profile saved, but some account details could not be refreshed. Reload the page to verify them.';
    }

    setValues(profileValues(result.payload));
    setEditing({});
    setFieldErrors({});
    if (syncMessage) setSaveError(syncMessage);
    else setNotice('Profile changes saved.');
    setSaving(false);
  };

  const startEditing = (key) => {
    setEditing((current) => ({ ...current, [key]: true }));
    setSaveError('');
  };
  const changeValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
    setSaveError('');
  };
  const editableRow = ({ key, label, icon, tone, multiline }) => (
    <EditableItem
      key={key}
      label={label}
      icon={icon}
      tone={tone}
      value={values[key] || ''}
      editing={Boolean(editing[key])}
      multiline={multiline}
      error={fieldErrors[key]}
      onEdit={() => startEditing(key)}
      onChange={(event) => changeValue(key, event.target.value)}
    />
  );

  return (
    <div className="space-y-4">
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}
      {saveError && <Banner kind="error" onDismiss={() => setSaveError('')}>{saveError}</Banner>}

      {/* cover + identity */}
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="relative h-28 sm:h-40" style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}>
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-52 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-32 hidden size-40 rounded-full bg-white/[0.07] sm:block" />
        </div>

        <div className="px-4 pb-5 sm:px-7 sm:pb-7">
          <div className="-mt-14 flex flex-col items-center gap-4 sm:-mt-[4.5rem] sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="block rounded-full border-4 border-surface bg-surface transition-transform hover:scale-[1.01]"
                aria-label="Open profile photo"
              >
                <Avatar user={me} size="size-32 text-3xl sm:size-36 sm:text-4xl" />
              </button>
              <button
                type="button"
                onClick={editAvatar}
                aria-label="Change photo"
                className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-full border border-border bg-surface text-text shadow-soft transition-colors hover:border-accent hover:text-accent"
              >
                <Camera size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="min-w-0 flex-1 text-center sm:pb-2 sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Your account</p>
              <h2 className="heading mt-1 truncate text-2xl text-text sm:text-3xl">{me.name || 'Your name'}</h2>
              <p className="mt-1 truncate text-sm text-muted">@{me.username || '—'} <span className="mx-1.5 text-border">•</span> {val(me.email)}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <RoleChip role={me.role} />
                {labels.filter((l) => l !== me.role).map((l) => <Chip key={l}>{l}</Chip>)}
                <Chip tone={me.isBlocked ? 'remove' : 'add'}>{me.isBlocked ? 'Blocked' : 'Active account'}</Chip>
              </div>
            </div>

            <ActionButton variant="secondary" size="sm" icon={Pencil} onClick={editAvatar}>Edit photo</ActionButton>
          </div>
        </div>
      </section>

      {/* numbers */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="boxes" tone={2} value={val(me.ordersCount ?? 0)} label="Orders" />
        <Stat icon="pkr" tone={7} value={fmtMoney(me.totalSpent)} label="Total spent" />
        <Stat icon="clock" tone={5} value={fmtDay(me.lastLoginAt)} label="Last login" title={fmtDate(me.lastLoginAt)} />
        <Stat icon="calendar" tone={3} value={fmtDay(me.$createdAt)} label="Member since" title={fmtDate(me.$createdAt)} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl border border-border bg-surface-alt">
              <Ico name="settings_gear" tone={8} className="size-8" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text">Appearance</p>
              <p className="text-xs text-muted">Switch between light and dark modes.</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-sm font-semibold text-text">Profile details</h3>
          <p className="text-xs text-muted">
            {hasChanges ? `${Object.keys(changes).length} unsaved ${Object.keys(changes).length === 1 ? 'change' : 'changes'}` : 'Select a row to edit your information.'}
          </p>
        </div>
        <ActionButton
          variant="primary"
          size="sm"
          icon={Save}
          onClick={saveProfile}
          disabled={!hasChanges || saving}
          loading={saving}
        >
          Update profile
        </ActionButton>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Personal information" icon="user" tone={3} table>
          {editableFields.slice(0, 2).map(editableRow)}
          <Item icon="network" tone={2} label="Email">{val(me.email)}</Item>
          {editableFields.slice(2, 3).map(editableRow)}
        </Section>

        <Section title="Delivery details" hint="Address saved from your last order." icon="truck" tone={4} table>
          {editableFields.slice(3).map(editableRow)}
        </Section>

        <Section title="Account" hint="Role and account labels." icon="crown" tone={8}>
          <Item icon="crown" tone={8} label="Role"><RoleChip role={me.role} /></Item>
          <Item icon="layers" tone={6} label="Appwrite labels">
            <span className="flex flex-wrap gap-1.5">
              {labels.length ? labels.map((label) => <Chip key={label}>{label}</Chip>) : <span className="text-muted">No labels</span>}
            </span>
          </Item>
          <Item icon="calendar" tone={3} label="Member since">{fmtDate(me.$createdAt)}</Item>
          <Item icon="alert" tone={me.isBlocked ? 4 : 7} label="Status">
            <Chip tone={me.isBlocked ? 'remove' : 'add'}>{me.isBlocked ? 'Blocked' : 'Active'}</Chip>
          </Item>
        </Section>

        <Section title="Security" hint="Sign-in and verification details." icon="disclaimer" tone={1}>
          <Item icon="user" tone={1} label="Password" onChange={() => setPasswordOpen(true)}>
            ••••••••
            {account && <span className="mt-1 block text-xs text-muted">Last changed {fmtDay(account.passwordUpdate)}</span>}
          </Item>
          <Item icon="success" tone={account?.emailVerification ? 7 : 4} label="Email verified">{account ? (account.emailVerification ? 'Verified' : 'Not verified') : 'Loading…'}</Item>
          <Item icon="wrist_watch" tone={5} label="Signed up with"><span className="capitalize">{val(me.authProvider)}</span></Item>
          <Item icon="clock" tone={2} label="Last login">{fmtDate(me.lastLoginAt)}</Item>
        </Section>
      </div>

      <details className="group rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-surface-alt">
              <Ico name="layers" tone={6} className="size-7" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-text">Technical identifiers</span>
              <span className="block text-xs text-muted">IDs for your profile, cart and wishlist.</span>
            </span>
          </span>
          <ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Item icon="user" tone={3} label="User ID"><span className="break-all font-mono text-xs">{me.$id}</span></Item>
          <Item icon="cart" tone={1} label="Cart ID"><span className="break-all font-mono text-xs">{val(me.cartId)}</span></Item>
          <Item icon="heart" tone={4} label="Wishlist ID"><span className="break-all font-mono text-xs">{val(me.wishlistId)}</span></Item>
        </dl>
      </details>

      {avatarOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setAvatarOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo preview"
        >
          <div className="relative w-full max-w-[min(80vw,420px)]" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setAvatarOpen(false)}
              className="absolute -top-3 right-0 grid size-9 place-items-center rounded-full border border-border bg-surface text-text shadow-soft"
              aria-label="Close image preview"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-soft">
              <Avatar user={me} size="size-[min(80vw,420px)] text-[clamp(3rem,10vw,5rem)]" />
            </div>
          </div>
        </div>
      )}

      <ProfileDrawer
        open={profileOpen}
        field="avatar"
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