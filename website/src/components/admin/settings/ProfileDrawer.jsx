import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

import { useAppDispatch } from '../../../store/slices/hooks';
import { changeAvatar, refreshProfile, updateName } from '../../../store/slices/authSlice';
import { refreshMyProfile, removeMyAvatar, updateMyProfile } from '../../../store/slices/userSlice';
import TextInput from '../../../ui/custom/input/TextInput';
import ActionButton from '../../../ui/custom/button/ActionButton';
import { Avatar, Banner, SlideDrawer, smallButton } from './SettingsParts';

const TEXT_FIELDS = ['name', 'username', 'phone', 'lastCity', 'lastAddress'];
const MAX_PHOTO = 5 * 1024 * 1024; // same limit as the Google avatar import

const validate = (v) => {
  const errors = {};
  if (v.name.trim().length < 2) errors.name = 'Enter your name.';
  if (!/^[a-z0-9._-]{3,30}$/i.test(v.username.trim())) errors.username = 'Use 3 to 30 letters, numbers, dots, dashes or underscores.';
  if (v.phone.trim() && !/^\+?[0-9\s-]{7,16}$/.test(v.phone.trim())) errors.phone = 'Enter a valid phone number, e.g. +923001234567.';
  return errors;
};

const fromProfile = (me) => ({
  name: me?.name || '',
  username: me?.username || '',
  phone: me?.phone || '',
  lastCity: me?.lastCity || '',
  lastAddress: me?.lastAddress || '',
});

// Opens with the WHOLE form; the field you clicked "Change" on is scrolled to the top.
export default function ProfileDrawer({ open, field, me, onClose, onSaved }) {
  const dispatch = useAppDispatch();
  const boxes = useRef({});
  const fileInput = useRef(null);

  const [values, setValues] = useState(fromProfile(me));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // fresh form every time the drawer opens
  useEffect(() => {
    if (!open) return;
    setValues(fromProfile(me));
    setFile(null);
    setRemovePhoto(false);
    setErrors({});
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // after the slide-in, bring the clicked field to the top and focus it
  useEffect(() => {
    if (!open || !field) return undefined;
    const id = setTimeout(() => {
      const box = boxes.current[field];
      if (!box) return;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      box.querySelector('input, textarea, button')?.focus({ preventScroll: true });
    }, 380);
    return () => clearTimeout(id);
  }, [open, field]);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (key) => (e) => setValues((cur) => ({ ...cur, [key]: e.target.value }));
  const ref = (key) => (el) => {
    boxes.current[key] = el;
  };

  const pickFile = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (!picked.type.startsWith('image/')) return setError('Choose an image file.');
    if (picked.size > MAX_PHOTO) return setError('The photo must be 5 MB or smaller.');
    setError('');
    setFile(picked);
    setRemovePhoto(false);
  };

  const save = async () => {
    const found = validate(values);
    setErrors(found);
    setError('');
    if (Object.keys(found).length) return;

    setSaving(true);
    let failure = '';

    const data = {};
    TEXT_FIELDS.forEach((key) => {
      const next = String(values[key] || '').trim();
      if (next !== String(me?.[key] || '')) data[key] = key === 'username' ? next.toLowerCase() : next;
    });

    if (Object.keys(data).length) {
      const result = await dispatch(updateMyProfile(data));
      if (!updateMyProfile.fulfilled.match(result)) {
        failure = typeof result.payload === 'string' ? result.payload : 'Could not save your profile.';
      } else if (data.name) {
        await dispatch(updateName({ name: data.name })); // keeps the Appwrite Auth name in step
      }
    }

    if (!failure && file) {
      const result = await dispatch(changeAvatar({ file, oldFileId: me?.avatarFileId }));
      if (!changeAvatar.fulfilled.match(result)) failure = typeof result.payload === 'string' ? result.payload : 'Could not upload your photo.';
    } else if (!failure && removePhoto && me?.avatarFileId) {
      const result = await dispatch(removeMyAvatar());
      if (!removeMyAvatar.fulfilled.match(result)) failure = typeof result.payload === 'string' ? result.payload : 'Could not remove your photo.';
    }

    await Promise.all([dispatch(refreshMyProfile()), dispatch(refreshProfile())]);
    setSaving(false);
    if (failure) setError(failure);
    else onSaved?.('Profile saved.');
  };

  const showAvatar = removePhoto ? { avatarFileId: null, name: values.name } : me;

  return (
    <SlideDrawer
      open={open}
      title="Edit profile"
      subtitle={me?.email}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</ActionButton>
          <ActionButton variant="primary" onClick={save} loading={saving}>Save changes</ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Banner kind="error">{error}</Banner>}

        <div ref={ref('avatar')} className="scroll-mt-4">
          <span className="mb-2 block text-[0.8rem] font-medium text-muted lg:text-sm">Photo</span>
          <div className="flex items-center gap-4">
            <Avatar user={showAvatar} src={preview} size="size-16 text-lg" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} className={smallButton}>
                <ImagePlus size={14} aria-hidden="true" /> {preview || me?.avatarFileId ? 'Choose another' : 'Choose photo'}
              </button>
              {(preview || (me?.avatarFileId && !removePhoto)) && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setRemovePhoto(Boolean(me?.avatarFileId));
                  }}
                  className={smallButton}
                >
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          </div>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickFile} />
        </div>

        <div ref={ref('name')} className="scroll-mt-4">
          <TextInput label="Name" value={values.name} onChange={set('name')} error={errors.name} autoComplete="name" required />
        </div>
        <div ref={ref('username')} className="scroll-mt-4">
          <TextInput label="Username" prefix="@" value={values.username} onChange={set('username')} error={errors.username} autoComplete="username" required />
        </div>
        <div ref={ref('phone')} className="scroll-mt-4">
          <TextInput label="Phone" type="tel" value={values.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" placeholder="+923001234567" />
        </div>
        <div ref={ref('lastCity')} className="scroll-mt-4">
          <TextInput label="City" value={values.lastCity} onChange={set('lastCity')} autoComplete="address-level2" />
        </div>
        <div ref={ref('lastAddress')} className="scroll-mt-4">
          <TextInput label="Address" as="textarea" rows={3} value={values.lastAddress} onChange={set('lastAddress')} autoComplete="street-address" />
        </div>

        {/* lets the last fields scroll up to the top too */}
        <div className="h-40" aria-hidden="true" />
      </div>
    </SlideDrawer>
  );
}
