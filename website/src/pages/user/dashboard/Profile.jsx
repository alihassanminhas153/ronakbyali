import { useRef, useState } from 'react';
import { Camera, Loader2, User } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { changeAvatar, getAvatarUrl, updateName } from '../../../store/slices/authSlice';
import {
  refreshMyProfile,
  selectMe,
  selectMeStatus,
  updateMyProfile,
} from '../../../store/slices/userSlice';
import ActionButton from '../../../ui/custom/button/ActionButton';
import TextInput from '../../../ui/custom/input/TextInput';
import useEntered from '../../../ui/custom/motion/useEntered';

const MAX_IMAGE_MB = 5;

const clean = (text) => String(text || '').trim().replace(/\s+/g, ' ');
const toForm = (me) => ({
  name: me.name || '',
  phone: me.phone || '',
  lastCity: me.lastCity || '',
  lastAddress: me.lastAddress || '',
});

function validate(form) {
  const errors = {};
  const name = clean(form.name);
  if (name.length < 2) errors.name = 'Enter your name (at least 2 characters).';
  else if (name.length > 128) errors.name = 'That name is too long.';
  if (form.phone.trim() && !/^[+\d\s()-]{5,20}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (form.lastCity.length > 100) errors.lastCity = 'City must be 100 characters or fewer.';
  if (form.lastAddress.length > 500) errors.lastAddress = 'Address must be 500 characters or fewer.';
  return errors;
}

function ProfileForm({ me }) {
  const dispatch = useAppDispatch();
  const fileRef = useRef(null);
  const entered = useEntered();

  const [form, setForm] = useState(() => toForm(me));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [brokenUrl, setBrokenUrl] = useState('');

  const saved = toForm(me);
  const dirty = Object.keys(saved).some((key) => saved[key] !== form[key]);
  const avatarUrl = getAvatarUrl(me.avatarFileId);
  const showAvatar = avatarUrl && avatarUrl !== brokenUrl;

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage({ type: '', text: '' });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (saving || !dirty) return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setMessage({ type: '', text: '' });
    const data = {
      name: clean(form.name),
      phone: form.phone.trim(),
      lastCity: clean(form.lastCity),
      lastAddress: form.lastAddress.trim(),
    };
    const result = await dispatch(updateMyProfile(data));
    setSaving(false);

    if (updateMyProfile.fulfilled.match(result)) {
      setForm(toForm(result.payload));
      setMessage({ type: 'ok', text: 'Profile saved.' });
      // The sidebar still reads the auth profile, so keep its name in step.
      if (data.name !== me.name) dispatch(updateName({ name: data.name }));
    } else {
      setMessage({ type: 'error', text: result.payload || 'Could not save your profile.' });
    }
  };

  const onPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be picked again
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return setMessage({ type: 'error', text: 'Choose an image file.' });
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      return setMessage({ type: 'error', text: `Image must be under ${MAX_IMAGE_MB} MB.` });
    }

    setPhotoBusy(true);
    setMessage({ type: '', text: '' });
    // changeAvatar uploads and writes avatarFileId; refreshMyProfile then pulls the
    // updated row into the users slice, which is what this page reads.
    const result = await dispatch(changeAvatar({ file, oldFileId: me.avatarFileId }));
    if (changeAvatar.fulfilled.match(result)) await dispatch(refreshMyProfile());
    else setMessage({ type: 'error', text: result.payload || 'Could not change your photo.' });
    setPhotoBusy(false);
  };

  return (
    <div
      className={`mx-auto max-w-2xl space-y-6 transition-opacity duration-300 motion-reduce:transition-none ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <h1 className="text-2xl font-semibold text-text">Profile</h1>

      <section className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="relative shrink-0">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-alt text-muted">
            {showAvatar ? (
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setBrokenUrl(avatarUrl)}
                className="size-full object-cover"
              />
            ) : (
              <User size={32} aria-hidden="true" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            aria-label={showAvatar ? 'Change profile photo' : 'Upload profile photo'}
            className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-surface bg-accent text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {photoBusy ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Camera size={15} aria-hidden="true" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-text">{me.name || me.username}</p>
          <p className="truncate text-sm text-muted">@{me.username}</p>
        </div>
      </section>

      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6"
      >
        <TextInput
          label="Email"
          value={me.email || ''}
          readOnly
          disabled
          hint="Your email can’t be changed here."
        />
        <TextInput
          label="Name"
          required
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          maxLength={128}
          autoComplete="name"
          disabled={saving}
        />
        <TextInput
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
          maxLength={20}
          disabled={saving}
        />
        <TextInput
          label="City"
          value={form.lastCity}
          onChange={set('lastCity')}
          error={errors.lastCity}
          maxLength={100}
          autoComplete="address-level2"
          disabled={saving}
        />
        <TextInput
          label="Address"
          as="textarea"
          rows={3}
          value={form.lastAddress}
          onChange={set('lastAddress')}
          error={errors.lastAddress}
          maxLength={500}
          showCount
          autoComplete="street-address"
          disabled={saving}
        />

        {message.text && (
          <p
            role={message.type === 'error' ? 'alert' : 'status'}
            className={`text-sm ${message.type === 'error' ? 'text-error' : 'text-success'}`}
          >
            {message.text}
          </p>
        )}

        <div className="flex justify-end">
          <ActionButton type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </ActionButton>
        </div>
      </form>
    </div>
  );
}

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

  // key: start with fresh form state if the account ever changes.
  return <ProfileForm key={me.$id} me={me} />;
}