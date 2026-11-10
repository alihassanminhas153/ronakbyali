import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
  UserRound,
  Wallet,
  Home,
  X,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { changeAvatar, getAvatarUrl } from '../../../store/slices/authSlice';
import {
  refreshMyProfile,
  removeMyAvatar,
  selectMe,
  selectMeStatus,
} from '../../../store/slices/userSlice';
import ActionButton from '../../../ui/custom/button/ActionButton';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';
import useEntered from '../../../ui/custom/motion/useEntered';
import ProfileDrawer from '../../../components/user/profile/ProfileDrawer';
import {
  ALLOWED_TYPES,
  MAX_IMAGE_MB,
  capitalize,
  formatDate,
  formatDateTime,
  formatMoney,
} from '../../../components/user/profile/profileMeta';

// "just now", "25s ago", "4m ago" ... re-rendered every 10 seconds
function useTimeAgo(date) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  if (!date) return '';
  const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

// ---------- Small pieces ----------

// Slides down + fades in on mount; the page removes it after a few seconds.
function Notice({ type, text, onDismiss }) {
  const entered = useEntered();
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : Check;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-300 motion-reduce:transition-none ${
        isError ? 'border-error/40 bg-error/10 text-error' : 'border-success/40 bg-success/10 text-success'
      } ${entered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
    >
      <Icon size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-full p-1 transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function StatTile({ icon: Icon, label, color, children }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--tile)]" style={{ '--tile': color }}>
      <span
        className="grid size-11 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="truncate font-display text-xl font-semibold text-text">{children}</p>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color, wide, onAdd, addLabel }) {
  const empty = !value || value === '—';
  return (
    <div className={`group rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-[color:var(--tile)] hover:bg-surface-alt ${wide ? 'sm:col-span-2' : ''}`} style={{ '--tile': color }}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <Icon size={15} style={{ color }} aria-hidden="true" />
        {label}
      </div>
      {empty && onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-all hover:gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {addLabel}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      ) : (
        <p className={`mt-2 whitespace-pre-line break-words text-sm ${empty ? 'text-muted' : 'font-medium text-text'}`}>{value || '—'}</p>
      )}
    </div>
  );
}

// ---------- Page ----------

function ProfileView({ me }) {
  const dispatch = useAppDispatch();
  const fileRef = useRef(null);
  const noticeTimer = useRef(null);
  const entered = useEntered();

  const [tab, setTab] = useState('details');
  // Same pattern as the admin Products page: a new key remounts the form fresh; 0 = never opened.
  const [drawer, setDrawer] = useState({ key: 0, open: false, section: 'details' });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [notice, setNotice] = useState(null); // { type, text }
  const [brokenUrl, setBrokenUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const ago = useTimeAgo(updatedAt);

  const avatarUrl = getAvatarUrl(me.avatarFileId);
  const showAvatar = Boolean(avatarUrl) && avatarUrl !== brokenUrl;
  // Email/password accounts can set a password here; Google accounts have none.
  const canChangePassword = me.authProvider !== 'google';

  const notify = (type, text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ type, text, id: Date.now() });
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const phrases = useMemo(
    () => [me.name || me.username, `@${me.username}`, `${capitalize(me.role)} account`],
    [me.name, me.username, me.role]
  );

  // How much of the profile is filled in.
  const checklist = [
    { key: 'photo', label: 'Add a photo', done: showAvatar },
    { key: 'phone', label: 'Add a phone number', done: Boolean(me.phone) },
    { key: 'city', label: 'Add your city', done: Boolean(me.lastCity) },
    { key: 'address', label: 'Add your address', done: Boolean(me.lastAddress) },
  ];
  const doneCount = checklist.filter((item) => item.done).length;
  const percent = Math.round(((2 + doneCount) / (2 + checklist.length)) * 100); // name + username always exist
  const missing = checklist.filter((item) => !item.done);

  const refresh = async () => {
    setRefreshing(true);
    const result = await dispatch(refreshMyProfile());
    if (refreshMyProfile.fulfilled.match(result)) setUpdatedAt(new Date());
    else notify('error', 'Could not refresh your profile. Try again in a moment.');
    setRefreshing(false);
  };

  const onPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be picked again
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return notify('error', 'Choose a JPG, PNG or WebP image.');
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return notify('error', `Image must be under ${MAX_IMAGE_MB} MB.`);

    setPhotoBusy(true);
    // changeAvatar uploads to the bucket, saves the id and removes the old file;
    // refreshMyProfile then pulls the updated row into the users slice.
    const result = await dispatch(changeAvatar({ file, oldFileId: me.avatarFileId }));
    if (changeAvatar.fulfilled.match(result)) {
      await dispatch(refreshMyProfile());
      setUpdatedAt(new Date());
      notify('ok', 'Photo updated.');
    } else {
      notify('error', result.payload || 'Could not change your photo.');
    }
    setPhotoBusy(false);
  };

  const confirmRemove = async () => {
    setPhotoBusy(true);
    setRemoveError('');
    const result = await dispatch(removeMyAvatar());
    if (removeMyAvatar.fulfilled.match(result)) {
      setRemoveOpen(false);
      notify('ok', 'Photo removed.');
    } else {
      setRemoveError(result.payload || 'Could not remove your photo.');
    }
    setPhotoBusy(false);
  };

  const openDrawer = (section = 'details') =>
    setDrawer((d) => ({ key: d.key + 1, open: true, section }));
  const closeDrawer = useCallback(() => setDrawer((d) => ({ ...d, open: false })), []);
  const onSaved = (message) => {
    closeDrawer();
    setUpdatedAt(new Date());
    notify('ok', message);
  };

  const busy = refreshing || photoBusy;

  const tabs = [
    { id: 'details', label: 'Details', icon: UserRound, color: 'var(--graph-1)' },
    { id: 'account', label: 'Account', icon: BadgeCheck, color: 'var(--graph-2)' },
    { id: 'security', label: 'Security', icon: ShieldCheck, color: 'var(--graph-3)' },
  ];

  return (
    <div
      className={`space-y-5 transition-all duration-500 motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Profile</h1>
          <p className="mt-1 text-sm text-muted">Manage your photo, contact details and password.</p>
        </div>

        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${busy ? 'animate-pulse bg-graph-3' : 'bg-graph-7'}`} />
              {busy ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            title="Fetch your latest profile from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-graph-1 hover:bg-surface-alt hover:text-graph-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {notice && <Notice key={notice.id} type={notice.type} text={notice.text} onDismiss={() => setNotice(null)} />}

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-2xl p-5 text-center text-white sm:flex-row sm:gap-7 sm:p-7 sm:text-left"
      >
        {/* decorative shapes */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-white/60 transition-transform duration-500 group-hover:scale-x-100" />

        {/* avatar */}
        <div className="relative shrink-0">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full border-2 border-white/70" />
          <div className="relative grid size-28 place-items-center overflow-hidden rounded-full border-2 border-white/40 bg-white/15 text-white/80 sm:size-32">
            {showAvatar ? (
              <img
                src={avatarUrl}
                alt={`${me.name || me.username}’s profile photo`}
                referrerPolicy="no-referrer"
                onError={() => setBrokenUrl(avatarUrl)}
                className="size-full object-cover"
              />
            ) : (
              <User size={52} aria-hidden="true" />
            )}
            {photoBusy && (
              <div className="absolute inset-0 grid place-items-center bg-black/45">
                <Loader2 size={28} className="animate-spin" aria-hidden="true" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            aria-label={showAvatar ? 'Change profile photo' : 'Upload profile photo'}
            className="absolute -bottom-1 -right-1 grid size-10 place-items-center rounded-full border-2 border-white bg-white text-[color:var(--brown)] shadow-soft transition-transform duration-200 hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          >
            <Camera size={18} aria-hidden="true" />
          </button>
          {showAvatar && (
            <button
              type="button"
              onClick={() => { setRemoveError(''); setRemoveOpen(true); }}
              disabled={photoBusy}
              aria-label="Remove profile photo"
              className="absolute -bottom-1 -left-1 grid size-10 place-items-center rounded-full border-2 border-white bg-white text-error shadow-soft transition-transform duration-200 hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          )}
          <input ref={fileRef} type="file" accept={ALLOWED_TYPES.join(',')} onChange={onPick} className="hidden" />
        </div>

        {/* identity */}
        <div className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Your account</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-2xl sm:text-3xl">
            <Typewriter phrases={phrases} />
          </span>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <ShieldCheck size={13} aria-hidden="true" />
              {capitalize(me.role)}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${me.isBlocked ? 'bg-error text-white' : 'bg-white/15'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${me.isBlocked ? 'bg-white' : 'bg-graph-7'}`} />
              {me.isBlocked ? 'Blocked' : 'Active'}
            </span>
            <span className="text-xs text-white/70">JPG, PNG or WebP, up to {MAX_IMAGE_MB} MB</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openDrawer('details')}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Pencil size={16} aria-hidden="true" />
          Edit profile
        </button>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={ShoppingBag} label="Orders placed" color="var(--graph-1)">
          <CountUp value={Number(me.ordersCount) || 0} />
        </StatTile>
        <StatTile icon={Wallet} label="Total spent" color="var(--graph-2)">
          {formatMoney(me.totalSpent)}
        </StatTile>
        <StatTile icon={ShieldCheck} label="Account type" color="var(--graph-6)">
          {capitalize(me.role)}
        </StatTile>
        <StatTile icon={CalendarDays} label="Member since" color="var(--graph-3)">
          {formatDate(me.$createdAt)}
        </StatTile>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'details' && (
        <TabPanel key="details" className="space-y-4">
          {/* completeness */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text">
                {percent === 100 ? 'Your profile is complete' : 'Finish setting up your profile'}
              </p>
              <span className="font-display text-xl font-semibold text-text">
                <CountUp value={percent} />%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                style={{ width: entered ? `${percent}%` : '0%', background: 'linear-gradient(90deg, var(--graph-1), var(--graph-7))' }}
              />
            </div>
            {missing.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {missing.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => (item.key === 'photo' ? fileRef.current?.click() : openDrawer('details'))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard icon={User} label="Name" value={me.name} color="var(--graph-1)" />
            <InfoCard icon={AtSign} label="Username" value={me.username ? `@${me.username}` : ''} color="var(--graph-2)" />
            <InfoCard icon={Mail} label="Email" value={me.email} color="var(--graph-6)" />
            <InfoCard icon={Phone} label="Phone" value={me.phone} color="var(--graph-3)" onAdd={() => openDrawer('details')} addLabel="Add phone number" />
            <InfoCard icon={MapPin} label="City" value={me.lastCity} color="var(--graph-7)" onAdd={() => openDrawer('details')} addLabel="Add city" />
            <InfoCard icon={Home} label="Address" value={me.lastAddress} color="var(--graph-1)" wide onAdd={() => openDrawer('details')} addLabel="Add address" />
          </div>
        </TabPanel>
      )}

      {tab === 'account' && (
        <TabPanel key="account">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard icon={ShieldCheck} label="Account type" value={capitalize(me.role)} color="var(--graph-6)" />
            <InfoCard icon={BadgeCheck} label="Status" value={me.isBlocked ? 'Blocked' : 'Active'} color="var(--graph-7)" />
            <InfoCard icon={KeyRound} label="Sign-in method" value={capitalize(me.authProvider)} color="var(--graph-3)" />
            <InfoCard icon={CalendarDays} label="Member since" value={formatDate(me.$createdAt)} color="var(--graph-2)" />
            <InfoCard icon={Clock} label="Last login" value={formatDateTime(me.lastLoginAt)} color="var(--graph-1)" wide />
          </div>
        </TabPanel>
      )}

      {tab === 'security' && (
        <TabPanel key="security">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--graph-3) 15%, transparent)', color: 'var(--graph-3)' }}>
              <KeyRound size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text">Password</p>
              <p className="mt-0.5 text-sm text-muted">
                {canChangePassword
                  ? 'Use a strong password you don’t use anywhere else.'
                  : 'You sign in with Google, so your password is managed by your Google account.'}
              </p>
            </div>
            {canChangePassword && (
              <ActionButton type="button" onClick={() => openDrawer('password')}>
                Change password
              </ActionButton>
            )}
          </div>
        </TabPanel>
      )}

      {drawer.key > 0 && (
        <ProfileDrawer
          key={drawer.key}
          open={drawer.open}
          me={me}
          section={drawer.section}
          canChangePassword={canChangePassword}
          onClose={closeDrawer}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={removeOpen}
        danger
        busy={photoBusy}
        error={removeError}
        title="Remove profile photo?"
        message="Your photo will be deleted and replaced with the default icon."
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveOpen(false)}
      />
    </div>
  );
}

// User > Profile
// Reads the signed-in user's own profile from the users slice (selectMe).
export default function Profile() {
  const me = useAppSelector(selectMe);
  const meStatus = useAppSelector(selectMeStatus);

  if (!me) {
    return (
      <div role="status" className="flex items-center gap-2 text-muted">
        {meStatus === 'failed' ? (
          'Could not load your profile. Please try again in a moment.'
        ) : (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Loading your profile…
          </>
        )}
      </div>
    );
  }

  // key: start with fresh state if the account ever changes.
  return <ProfileView key={me.$id} me={me} />;
}