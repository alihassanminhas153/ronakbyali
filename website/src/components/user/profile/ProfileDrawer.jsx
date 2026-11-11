import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Camera,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  MapPin,
  RotateCcw,
  Trash2,
  User,
  UserRound,
  X,
} from 'lucide-react';

import { useAppDispatch } from '../../../store/slices/hooks';
import { changeAvatar, getAvatarUrl, updateName } from '../../../store/slices/authSlice';
import { refreshMyProfile, removeMyAvatar, updateMyProfile } from '../../../store/slices/userSlice';
import { changePassword } from '../../../lib/appwrite/accountExtras';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { ALLOWED_TYPES, MAX_IMAGE_MB, clean, toForm, validateDetails, validatePassword } from './profileMeta';

/* ---------- small field helpers (same look as the admin ProductForm) ---------- */

const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-graph-1 ${
    err ? 'border-error' : 'border-border hover:border-graph-1/50'
  }`;

function Field({ label, hint, error, optional, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-text">
        <span>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</span>
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
      <span className={`grid transition-all duration-200 ${error ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <span className="overflow-hidden text-xs text-error">{error}</span>
      </span>
    </label>
  );
}

function SectionHead({ icon: Icon, title, subtitle, tone }) {
  const color = toneVar(tone);
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/sec:-rotate-6 group-hover/sec:scale-110" style={{ background: tint(color, 14), color }}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <h3 className="heading-sm" style={{ color }}>{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, tone = 1, children, delay = 0, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      style={{ animationDelay: `${delay}ms`, borderTopColor: toneVar(tone) }}
      className="group/sec animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4"
    >
      <SectionHead icon={icon} title={title} subtitle={subtitle} tone={tone} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Notice({ type, text }) {
  if (!text) return null;
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : Check;
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`animate-rise flex items-start gap-2 rounded-md border px-3 py-2 text-sm sm:col-span-2 ${
        isError ? 'border-error/40 bg-error/10 text-error' : 'border-success/40 bg-success/10 text-success'
      }`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

/* ---------- the drawer (slides in from the RIGHT) ---------- */

// props: open, me, section ('details' | 'password'), canChangePassword, onClose, onSaved(message)
export default function ProfileDrawer({ open, me, section = 'details', canChangePassword, onClose, onSaved }) {
  const dispatch = useAppDispatch();
  const passwordRef = useRef(null);
  const fileInput = useRef(null);

  // details form
  const [form, setForm] = useState(() => toForm(me));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // photo: picked here, uploaded only when "Save changes" is pressed
  const [staged, setStaged] = useState(null); // { file, url } | null
  const [removed, setRemoved] = useState(false); // existing photo marked for removal
  const [avatarError, setAvatarError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [brokenUrl, setBrokenUrl] = useState('');
  const stagedRef = useRef(null);
  stagedRef.current = staged;

  // password form
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });
  const [showPw, setShowPw] = useState(false);

  const existingUrl = getAvatarUrl(me.avatarFileId);
  const hasExisting = Boolean(existingUrl) && existingUrl !== brokenUrl;
  const previewSrc = staged ? staged.url : !removed && hasExisting ? existingUrl : '';
  const hasPhoto = Boolean(previewSrc);

  const saved = toForm(me);
  const detailsDirty = Object.keys(saved).some((key) => saved[key] !== form[key]);
  const photoDirty = Boolean(staged) || removed;
  const dirty = detailsDirty || photoDirty;
  const busy = saving || pwSaving;

  // Slide-in: mount closed, flip to open on the next frame so the transition runs.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) { setShown(false); return undefined; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, busy, onClose]);

  // Opened from "Change password": bring that section into view once the panel is in.
  useEffect(() => {
    if (!open || section !== 'password') return undefined;
    const id = setTimeout(() => passwordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 380);
    return () => clearTimeout(id);
  }, [open, section]);

  // Free the preview URL if the drawer is thrown away.
  useEffect(() => () => { if (stagedRef.current) URL.revokeObjectURL(stagedRef.current.url); }, []);

  const on = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((cur) => ({ ...cur, [key]: undefined }));
    setSubmitError('');
  };
  const onPw = (key) => (e) => {
    setPw((p) => ({ ...p, [key]: e.target.value }));
    setPwErrors((cur) => ({ ...cur, [key]: undefined }));
    setPwMessage({ type: '', text: '' });
  };

  /* ----- photo handlers ----- */

  const pickFile = (list) => {
    const file = list?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return setAvatarError('Choose a JPG, PNG or WebP image.');
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setAvatarError(`Image must be under ${MAX_IMAGE_MB} MB.`);
    setAvatarError('');
    setSubmitError('');
    setRemoved(false);
    setStaged((cur) => {
      if (cur) URL.revokeObjectURL(cur.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  const clearStaged = () => {
    setStaged((cur) => {
      if (cur) URL.revokeObjectURL(cur.url);
      return null;
    });
  };

  // "Discard new photo" (picked here) or "Remove photo" (the saved one, applied on save)
  const dropPhoto = () => {
    setAvatarError('');
    if (staged) clearStaged();
    else setRemoved(true);
  };

  /* ----- save ----- */

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !dirty) return;

    if (detailsDirty) {
      const found = validateDetails(form);
      setErrors(found);
      if (Object.keys(found).length) {
        setSubmitError('Please fix the highlighted fields.');
        return;
      }
    }

    setSaving(true);
    setSubmitError('');

    // 1. details first, so a taken username stops us before any photo is uploaded
    if (detailsDirty) {
      const data = {
        username: form.username.trim().toLowerCase(),
        name: clean(form.name),
        phone: form.phone.trim(),
        lastCity: clean(form.lastCity),
        lastAddress: form.lastAddress.trim(),
      };
      const result = await dispatch(updateMyProfile(data));
      if (!updateMyProfile.fulfilled.match(result)) {
        setSaving(false);
        if (/username/i.test(result.payload || '')) {
          setErrors({ username: result.payload });
          setSubmitError('Please fix the highlighted fields.');
        } else {
          setSubmitError(result.payload || 'Could not save your profile.');
        }
        return;
      }
      // The sidebar still reads the auth profile, so keep its name in step.
      if (data.name !== me.name) dispatch(updateName({ name: data.name }));
    }

    // 2. photo: upload the new one (old file is removed by changeAvatar) or delete the current one
    if (photoDirty) {
      const prefix = detailsDirty ? 'Your details were saved, but ' : '';
      if (staged) {
        const result = await dispatch(changeAvatar({ file: staged.file, oldFileId: me.avatarFileId }));
        if (!changeAvatar.fulfilled.match(result)) {
          setSaving(false);
          setSubmitError(`${prefix}${prefix ? 'your photo' : 'Your photo'} could not be changed. ${result.payload || ''}`.trim());
          return;
        }
        await dispatch(refreshMyProfile());
      } else {
        const result = await dispatch(removeMyAvatar());
        if (!removeMyAvatar.fulfilled.match(result)) {
          setSaving(false);
          setSubmitError(`${prefix}${prefix ? 'your photo' : 'Your photo'} could not be removed. ${result.payload || ''}`.trim());
          return;
        }
      }
    }

    setSaving(false);
    onSaved?.('Profile updated.');
  };

  const submitPassword = async () => {
    if (pwSaving) return;
    const found = validatePassword(pw);
    setPwErrors(found);
    if (Object.keys(found).length) return;

    setPwSaving(true);
    const result = await changePassword({ oldPassword: pw.current, password: pw.next });
    setPwSaving(false);

    if (result.ok) {
      setPw({ current: '', next: '', confirm: '' });
      setPwMessage({ type: 'ok', text: 'Password updated.' });
    } else if (/current/i.test(result.message)) {
      setPwErrors({ current: result.message });
    } else {
      setPwMessage({ type: 'error', text: result.message });
    }
  };
  const onPwKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitPassword(); }
  };

  const pwType = showPw ? 'text' : 'password';
  const displayName = clean(form.name) || me.username;

  // Rendered into document.body (portal) so no page container can clip it or
  // become its positioning parent: a transform/opacity/overflow on a parent
  // makes "fixed" behave like "absolute" and traps the panel inside the page.
  return createPortal(
    <div
      className="fixed inset-0 z-50"
      style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? 0 : 350}ms` }}
      aria-hidden={!open}
    >
      <div
        onClick={() => !busy && onClose()}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {/* avatar at the very top, mirrors the photo picked below */}
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-alt text-muted">
              {hasPhoto ? (
                <img
                  src={previewSrc}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => !staged && setBrokenUrl(previewSrc)}
                  className="size-full object-cover"
                />
              ) : (
                <User size={20} aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="heading truncate text-text">Edit profile</h2>
              <p className="truncate text-xs text-muted">{me.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Photo: first section, first input */}
          <section
            style={{ animationDelay: '0ms', borderTopColor: 'var(--graph-6)' }}
            className="group/sec animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4"
          >
            <SectionHead icon={Camera} tone={6} title="Profile photo" subtitle={`JPG, PNG or WebP, up to ${MAX_IMAGE_MB} MB. Saved when you press Save changes.`} />

            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div className="relative grid size-24 place-items-center overflow-hidden rounded-full border-2 border-border bg-surface text-muted">
                  {hasPhoto ? (
                    <img
                      key={previewSrc}
                      src={previewSrc}
                      alt={`${displayName}’s profile photo`}
                      referrerPolicy="no-referrer"
                      onError={() => !staged && setBrokenUrl(previewSrc)}
                      className="animate-rise size-full object-cover"
                    />
                  ) : (
                    <User size={40} aria-hidden="true" />
                  )}
                </div>
                {staged && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-graph-6 px-2 py-0.5 text-[10px] font-medium text-white">New</span>
                )}
              </div>

              <div className="w-full min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={saving}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!saving) pickFile(e.dataTransfer.files); }}
                  className={`flex w-full items-center justify-center gap-3 rounded-md border border-dashed px-4 py-4 text-sm transition-colors disabled:opacity-60 ${
                    dragOver ? 'border-graph-6 bg-graph-6/10 text-graph-6' : 'border-border bg-surface text-muted hover:border-graph-6 hover:bg-graph-6/10 hover:text-graph-6'
                  }`}
                >
                  <ImagePlus size={22} className="shrink-0" />
                  <span className="text-left">
                    <span className="block font-medium">{hasPhoto ? 'Click to change photo' : 'Click to upload a photo'}</span>
                    <span className="block text-xs opacity-80">or drag and drop it here</span>
                  </span>
                </button>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {hasPhoto && (
                    <button type="button" onClick={dropPhoto} disabled={saving} className="inline-flex items-center gap-1.5 text-xs font-medium text-error transition-opacity hover:opacity-80 disabled:opacity-60">
                      <Trash2 size={14} />
                      {staged ? 'Discard new photo' : 'Remove photo'}
                    </button>
                  )}
                  {removed && !staged && (
                    <button type="button" onClick={() => setRemoved(false)} disabled={saving} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-text disabled:opacity-60">
                      <RotateCcw size={14} />
                      Keep current photo
                    </button>
                  )}
                  {removed && !staged && <span className="text-xs text-muted">Your photo will be removed when you save.</span>}
                </div>

                <span className={`grid transition-all duration-200 ${avatarError ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <span role="alert" className="overflow-hidden text-xs text-error">{avatarError}</span>
                </span>
              </div>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              hidden
              onChange={(e) => { pickFile(e.target.files); e.target.value = ''; }}
            />
          </section>

          <Section title="Basics" subtitle="How you appear in the store." icon={UserRound} tone={1} delay={60}>
            <Field label="Username" error={errors.username}>
              <input value={form.username} onChange={on('username')} maxLength={30} autoComplete="username" placeholder="your_username" disabled={saving} className={`${inputCls(errors.username)} h-10`} />
            </Field>
            <Field label="Name" error={errors.name}>
              <input value={form.name} onChange={on('name')} maxLength={128} autoComplete="name" placeholder="Your full name" disabled={saving} className={`${inputCls(errors.name)} h-10`} />
            </Field>
            <Field label="Email" hint="can’t be changed here" className="sm:col-span-2">
              <input value={me.email || ''} readOnly disabled className={`${inputCls()} h-10 opacity-70`} />
            </Field>
          </Section>

          <Section title="Contact" subtitle="Used to prefill checkout." icon={MapPin} tone={2} delay={120}>
            <Field label="Phone" optional error={errors.phone}>
              <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={on('phone')} maxLength={20} placeholder="+92 300 1234567" disabled={saving} className={`${inputCls(errors.phone)} h-10`} />
            </Field>
            <Field label="City" optional error={errors.lastCity}>
              <input value={form.lastCity} onChange={on('lastCity')} maxLength={100} autoComplete="address-level2" placeholder="Lahore" disabled={saving} className={`${inputCls(errors.lastCity)} h-10`} />
            </Field>
            <Field label="Address" optional hint={`${form.lastAddress.length}/500`} error={errors.lastAddress} className="sm:col-span-2">
              <textarea value={form.lastAddress} onChange={on('lastAddress')} rows={3} maxLength={500} autoComplete="street-address" placeholder="House, street, area" disabled={saving} className={`${inputCls(errors.lastAddress)} resize-y py-2`} />
            </Field>
          </Section>

          {canChangePassword && (
            <Section sectionRef={passwordRef} title="Password" subtitle="Updated separately from the details above." icon={KeyRound} tone={3} delay={180}>
              <Field label="Current password" error={pwErrors.current} className="sm:col-span-2">
                <input type={pwType} autoComplete="current-password" value={pw.current} onChange={onPw('current')} onKeyDown={onPwKey} disabled={pwSaving} className={`${inputCls(pwErrors.current)} h-10`} />
              </Field>
              <Field label="New password" hint="at least 8 characters" error={pwErrors.next}>
                <input type={pwType} autoComplete="new-password" value={pw.next} onChange={onPw('next')} onKeyDown={onPwKey} disabled={pwSaving} className={`${inputCls(pwErrors.next)} h-10`} />
              </Field>
              <Field label="Confirm new password" error={pwErrors.confirm}>
                <input type={pwType} autoComplete="new-password" value={pw.confirm} onChange={onPw('confirm')} onKeyDown={onPwKey} disabled={pwSaving} className={`${inputCls(pwErrors.confirm)} h-10`} />
              </Field>
              <Notice type={pwMessage.type} text={pwMessage.text} />
              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                <button type="button" onClick={() => setShowPw((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-text">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPw ? 'Hide passwords' : 'Show passwords'}
                </button>
                <button type="button" onClick={submitPassword} disabled={pwSaving} className="btn btn-ghost min-w-36">
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </Section>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">
          <p role="alert" className={`min-w-0 flex-1 text-sm transition-opacity ${submitError ? 'text-error opacity-100' : 'text-muted opacity-100'}`}>
            {submitError || (dirty ? 'You have unsaved changes.' : '')}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost">Cancel</button>
            <button
              type="submit"
              disabled={busy || !dirty}
              style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))', color: 'var(--on-brown)' }}
              className="btn min-w-32 transition-[filter,transform] hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </footer>
      </form>
    </div>,
    document.body
  );
}