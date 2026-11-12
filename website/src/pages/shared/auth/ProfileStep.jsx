import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Camera, Loader2, User } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  saveName,
  clearAuthError,
  selectAuthStatus,
} from '../../../store/slices/authSlice';

const MAX_IMAGE_MB = 5;

// Small first-time popup: profile photo (optional) + name, submitted with the arrow.
//   profile.name       -> prefilled name (e.g. from Google)
//   profile.avatarUrl  -> prefilled photo (e.g. from Google)
//   onDone(profile)    -> called with the saved profile; the parent decides where to go next
export default function ProfileStep({ profile, onDone }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  const nameId = useId();
  const fileRef = useRef(null);

  const [name, setName] = useState(profile?.name || '');
  const [file, setFile] = useState(null);
  const [localPreview, setLocalPreview] = useState('');
  const [brokenUrl, setBrokenUrl] = useState('');
  const [error, setError] = useState('');

  const busy = status === 'loading';
  const imageSrc = localPreview || profile?.avatarUrl || '';
  const showImage = imageSrc && imageSrc !== brokenUrl;
  const message = error;

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  // Revoke the object URL when the selected preview is replaced or unmounted.
  useEffect(() => {
    if (!localPreview) return undefined;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const onPick = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again
    if (!picked) return;
    if (!picked.type.startsWith('image/')) return setError('Choose an image file.');
    if (picked.size > MAX_IMAGE_MB * 1024 * 1024) return setError(`Image must be under ${MAX_IMAGE_MB} MB.`);
    setError('');
    setFile(picked);
    setLocalPreview(URL.createObjectURL(picked));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 2) return setError('Enter your name (at least 2 characters).');
    if (clean.length > 128) return setError('That name is too long.');
    setError('');

    // avatarFile is null when the person skipped the photo (or kept the Google one).
    const result = await dispatch(saveName({ name: clean, avatarFile: file, toast: true }));
    if (saveName.fulfilled.match(result)) onDone?.(result.payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up your profile"
        className="w-full max-w-xs rounded-lg border border-border bg-surface p-6 sm:p-8"
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col items-center gap-6">
          {/* Profile photo */}
          <div className="relative">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-alt text-muted">
              {showImage ? (
                <img
                  src={imageSrc}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setBrokenUrl(imageSrc)}
                  className="size-full object-cover"
                />
              ) : (
                <User size={36} aria-hidden="true" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label={showImage ? 'Change profile photo' : 'Upload profile photo'}
              className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-surface bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <Camera size={15} aria-hidden="true" />
            </button>

            <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
          </div>

          {/* Name + arrow submit */}
          <div className="relative w-full">
            <label htmlFor={nameId} className="sr-only">Your name</label>
            <input
              id={nameId}
              type="text"
              name="name"
              autoComplete="name"
              autoFocus
              maxLength={128}
              placeholder="Your name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              disabled={busy}
              aria-invalid={message ? true : undefined}
              className={`h-12 w-full rounded-md border bg-bg pl-4 pr-14 text-base text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:opacity-60 ${
                message ? 'border-error' : 'border-border'
              }`}
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              aria-label="Save and continue"
              className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-sm bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight size={18} aria-hidden="true" />
              )}
            </button>
          </div>

          {message && (
            <p role="alert" className="-mt-3 w-full text-center text-sm text-error">{message}</p>
          )}

        </form>
      </div>
    </div>
  );
}