import { useEffect, useState } from 'react';
import { Camera, Check, ChevronDown, Eye, EyeOff, Pencil, Save, X } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { refreshProfile, selectProfile, updateName } from '../../../store/slices/authSlice';
import { refreshMyProfile, selectMe, updateMyProfile } from '../../../store/slices/userSlice';
import authService from '../../../lib/appwrite/auth';
import ActionButton from '../../../ui/custom/button/ActionButton';
import TextInput from '../../../ui/custom/input/TextInput';
import ThemeToggle from '../../../ui/custom/toggles/ThemeToggle';
import PasswordDrawer from './PasswordDrawer';
import ProfileDrawer from './ProfileDrawer';
import { Avatar, Banner, Chip, Ico, RoleChip } from './SettingsParts';
import { fmtDate, fmtDay, fmtMoney, val } from './settingsMeta';

/* ---------- hide / show details (remembered on this device) ---------- */

const HIDE_KEY = 'settings-hidden-details';
const HIDEABLE = ['username', 'email', 'phone', 'lastCity', 'lastAddress', 'ids'];
const MASK = '••••••••';

const readHidden = () => {
  try {
    return JSON.parse(localStorage.getItem(HIDE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

/* ---------- editable fields ---------- */

const editableFields = [
  { key: 'name', label: 'Name', icon: 'user', tone: 3 },
  { key: 'username', label: 'Username', icon: 'user', tone: 5 },
  { key: 'phone', label: 'Phone', icon: 'network', tone: 5 },
  { key: 'lastCity', label: 'City', icon: 'network', tone: 3 },
  { key: 'lastAddress', label: 'Delivery address', icon: 'truck', tone: 4, multiline: true },
];
const fieldMeta = Object.fromEntries(editableFields.map((f) => [f.key, f]));

const profileValues = (profile) => Object.fromEntries(editableFields.map(({ key }) => [key, profile?.[key] || '']));

const profileChanges = (values, profile) =>
  Object.fromEntries(
    editableFields
      .map(({ key }) => [key, String(values[key] || '').trim()])
      .filter(([key, value]) => value !== String(profile?.[key] || '').trim())
      .map(([key, value]) => [key, key === 'username' ? value.toLowerCase() : value])
  );

/* ---------- small layout pieces ---------- */

function Card({ title, hint, icon, tone = 1, action, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface-alt">
            <Ico name={icon} tone={tone} className="size-7" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-text">{title}</h3>
            {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const iconButton =
  'grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent';

// One line of a details list: icon + label | value | hide + edit buttons
function Row({ label, icon, tone = 1, value, children, editing, onEdit, onChange, error, multiline, masked, onToggleMask, readOnly, mono }) {
  return (
    <div className="grid gap-2 border-t border-border px-4 py-3 sm:grid-cols-[minmax(9rem,0.34fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5">
      <dt className="flex items-center gap-3 text-xs font-medium text-muted">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-alt">
          <Ico name={icon} tone={tone} className="size-6" />
        </span>
        {label}
      </dt>
      <dd className="min-w-0">
        {editing ? (
          <TextInput label={null} aria-label={label} value={value} onChange={onChange} error={error} as={multiline ? 'textarea' : 'input'} rows={multiline ? 3 : undefined} autoFocus />
        ) : (
          <div className={`break-words px-1 py-1.5 text-sm text-text ${mono ? 'font-mono text-xs' : ''}`}>
            {children ?? (masked ? <span className="tracking-widest text-muted">{MASK}</span> : value || <span className="text-muted">Not set</span>)}
          </div>
        )}
      </dd>
      <div className="flex items-center justify-end gap-1.5">
        {onToggleMask && !editing && (
          <button type="button" onClick={onToggleMask} aria-pressed={masked} aria-label={`${masked ? 'Show' : 'Hide'} ${label}`} title={masked ? 'Show' : 'Hide'} className={iconButton}>
            {masked ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          </button>
        )}
        {onEdit &&
          (editing ? (
            <span className="inline-flex items-center gap-1 px-1 text-xs font-medium text-accent">
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
          ))}
        {readOnly && <span className="px-1 text-[11px] text-muted">Read-only</span>}
      </div>
    </div>
  );
}

// small tile for the "at a glance" strip
function Fact({ icon, tone, label, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt/50 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface">
        <Ico name={icon} tone={tone} className="size-7" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
        <div className="mt-1 text-sm text-text">{children}</div>
      </div>
    </div>
  );
}

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

// 1 identity   2 numbers   3 the important details (hideable)   4 everything else   5 technical ids
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
  const [hidden, setHidden] = useState(readHidden);
  const changes = profileChanges(values, me);
  const changeCount = Object.keys(changes).length;
  const hasChanges = changeCount > 0;
  const allHidden = HIDEABLE.every((k) => hidden[k]);

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

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_KEY, JSON.stringify(hidden));
    } catch {
      /* private mode: it just will not be remembered */
    }
  }, [hidden]);

  if (!me) return <p className="text-sm text-muted">Loading your profile…</p>;

  const labels = account?.labels ?? me.labels ?? [];
  const toggleHidden = (key) => setHidden((h) => ({ ...h, [key]: !h[key] }));
  const setAllHidden = (on) => setHidden(Object.fromEntries(HIDEABLE.map((k) => [k, on])));
  const shown = (key, text) => (hidden[key] ? MASK : text);

  const editAvatar = () => {
    setSaveError('');
    setProfileOpen(true);
  };

  const saveProfile = async () => {
    if (!hasChanges || saving) return;
    const nextName = changes.name;
    const errors = {};
    if (nextName !== undefined && nextName.length < 2) errors.name = 'Enter at least 2 characters.';
    if (changes.username !== undefined && !/^[a-z0-9._-]{3,30}$/i.test(changes.username)) {
      errors.username = 'Use 3 to 30 letters, numbers, dots, dashes or underscores.';
    }
    if (changes.phone && !/^\+?[0-9\s-]{7,16}$/.test(changes.phone)) errors.phone = 'Enter a valid phone number.';
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

  const discard = () => {
    setValues(profileValues(me));
    setEditing({});
    setFieldErrors({});
    setSaveError('');
  };

  // editable row; `mask` is the hide/show key (same as the field key)
  const field = (key, { hideable = true } = {}) => {
    const { label, icon, tone, multiline } = fieldMeta[key];
    return (
      <Row
        key={key}
        label={label}
        icon={icon}
        tone={tone}
        value={values[key] || ''}
        multiline={multiline}
        editing={Boolean(editing[key])}
        error={fieldErrors[key]}
        masked={hideable && hidden[key]}
        onToggleMask={hideable ? () => toggleHidden(key) : undefined}
        onEdit={() => {
          setEditing((c) => ({ ...c, [key]: true }));
          setSaveError('');
        }}
        onChange={(event) => {
          setValues((c) => ({ ...c, [key]: event.target.value }));
          setFieldErrors((c) => ({ ...c, [key]: '' }));
          setSaveError('');
        }}
      />
    );
  };

  return (
    <div className="space-y-4">
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}
      {saveError && <Banner kind="error" onDismiss={() => setSaveError('')}>{saveError}</Banner>}

      {/* 1 · identity */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <div className="relative h-24 sm:h-32" style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}>
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-52 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-32 hidden size-40 rounded-full bg-white/[0.07] sm:block" />
        </div>
        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-col items-center gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              <button type="button" onClick={() => setAvatarOpen(true)} className="block rounded-full border-4 border-surface bg-surface transition-transform hover:scale-[1.02]" aria-label="Open profile photo">
                <Avatar user={me} size="size-28 text-3xl sm:size-32 sm:text-4xl" />
              </button>
              <button type="button" onClick={editAvatar} aria-label="Change photo" className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full border border-border bg-surface text-text shadow-soft transition-colors hover:border-accent hover:text-accent">
                <Camera size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
              <h2 className="heading truncate text-2xl text-text sm:text-3xl">{me.name || 'Your name'}</h2>
              <p className="mt-1 truncate text-sm text-muted">{shown('username', `@${me.username || '—'}`)}</p>
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

      {/* 2 · numbers */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="boxes" tone={2} value={val(me.ordersCount ?? 0)} label="Orders" />
        <Stat icon="pkr" tone={7} value={fmtMoney(me.totalSpent)} label="Total spent" />
        <Stat icon="clock" tone={5} value={fmtDay(me.lastLoginAt)} label="Last login" title={fmtDate(me.lastLoginAt)} />
        <Stat icon="calendar" tone={3} value={fmtDay(me.$createdAt)} label="Member since" title={fmtDate(me.$createdAt)} />
      </section>

      {/* 3 · the important details */}
      <Card
        title="Your details"
        hint={hasChanges ? `${changeCount} unsaved ${changeCount === 1 ? 'change' : 'changes'}` : 'Name, sign-in and contact information.'}
        icon="user"
        tone={3}
        action={
          <button
            type="button"
            onClick={() => setAllHidden(!allHidden)}
            aria-pressed={allHidden}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {allHidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
            {allHidden ? 'Show all' : 'Hide all'}
          </button>
        }
      >
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          <Fact icon="crown" tone={8} label="Role"><RoleChip role={me.role} /></Fact>
          <Fact icon="alert" tone={me.isBlocked ? 4 : 7} label="Status"><Chip tone={me.isBlocked ? 'remove' : 'add'}>{me.isBlocked ? 'Blocked' : 'Active'}</Chip></Fact>
          <Fact icon="success" tone={account?.emailVerification ? 7 : 4} label="Email">
            {account ? (account.emailVerification ? 'Verified' : 'Not verified') : 'Loading…'}
          </Fact>
          <Fact icon="user" tone={1} label="Password">
            <button type="button" onClick={() => setPasswordOpen(true)} className="font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Change</button>
            {account?.passwordUpdate && <span className="ml-2 text-xs text-muted">{fmtDay(account.passwordUpdate)}</span>}
          </Fact>
        </div>
        <dl>
          {field('name', { hideable: false })}
          {field('username')}
          <Row label="Email" icon="network" tone={2} masked={hidden.email} onToggleMask={() => toggleHidden('email')} value={val(me.email)} readOnly />
          {field('phone')}
        </dl>
      </Card>

      {/* 4 · everything else */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Delivery" hint="Saved from your last order." icon="truck" tone={4}>
          <dl>
            {field('lastCity')}
            {field('lastAddress')}
          </dl>
        </Card>

        <Card title="Security" hint="Sign-in and verification." icon="disclaimer" tone={1}>
          <dl>
            <Row label="Signed up with" icon="wrist_watch" tone={5}><span className="capitalize">{val(me.authProvider)}</span></Row>
            <Row label="Last login" icon="clock" tone={2}>{fmtDate(me.lastLoginAt)}</Row>
            <Row label="Appwrite labels" icon="layers" tone={6}>
              <span className="flex flex-wrap gap-1.5">
                {labels.length ? labels.map((l) => <Chip key={l}>{l}</Chip>) : <span className="text-muted">No labels</span>}
              </span>
            </Row>
            <Row label="Appearance" icon="settings_gear" tone={8}><ThemeToggle /></Row>
          </dl>
        </Card>
      </div>

      {/* 5 · technical identifiers */}
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
        <div className="mt-4 space-y-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => toggleHidden('ids')} aria-pressed={hidden.ids} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:border-accent hover:text-accent">
              {hidden.ids ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
              {hidden.ids ? 'Show IDs' : 'Hide IDs'}
            </button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Fact icon="user" tone={3} label="User ID"><span className="break-all font-mono text-xs">{shown('ids', me.$id)}</span></Fact>
            <Fact icon="cart" tone={1} label="Cart ID"><span className="break-all font-mono text-xs">{shown('ids', val(me.cartId))}</span></Fact>
            <Fact icon="heart" tone={4} label="Wishlist ID"><span className="break-all font-mono text-xs">{shown('ids', val(me.wishlistId))}</span></Fact>
          </dl>
        </div>
      </details>

      {/* unsaved changes bar */}
      {hasChanges && (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-surface px-4 py-3 shadow-soft">
          <p className="text-sm text-text">{changeCount} unsaved {changeCount === 1 ? 'change' : 'changes'}</p>
          <div className="flex gap-2">
            <ActionButton variant="secondary" size="sm" onClick={discard} disabled={saving}>Discard</ActionButton>
            <ActionButton variant="primary" size="sm" icon={Save} onClick={saveProfile} loading={saving}>Update profile</ActionButton>
          </div>
        </div>
      )}

      {avatarOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setAvatarOpen(false)} role="dialog" aria-modal="true" aria-label="Profile photo preview">
          <div className="relative w-full max-w-[min(80vw,420px)]" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setAvatarOpen(false)} className="absolute -top-3 right-0 grid size-9 place-items-center rounded-full border border-border bg-surface text-text shadow-soft" aria-label="Close image preview">
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