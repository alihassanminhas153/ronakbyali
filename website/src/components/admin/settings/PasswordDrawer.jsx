import { useEffect, useState } from 'react';

import { changePassword } from '../../../lib/appwrite/accountExtras';
import TextInput from '../../../ui/custom/input/TextInput';
import ActionButton from '../../../ui/custom/button/ActionButton';
import { Banner, SlideDrawer } from './SettingsParts';

export default function PasswordDrawer({ open, googleOnly = false, onClose, onSaved }) {
  const [oldPassword, setOld] = useState('');
  const [password, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOld('');
    setNew('');
    setConfirm('');
    setErrors({});
    setError('');
  }, [open]);

  const save = async () => {
    const next = {};
    if (!googleOnly && !oldPassword) next.oldPassword = 'Enter your current password.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    else if (password === oldPassword) next.password = 'Choose a different password.';
    if (confirm !== password) next.confirm = 'The passwords do not match.';
    setErrors(next);
    setError('');
    if (Object.keys(next).length) return;

    setSaving(true);
    const res = await changePassword({ oldPassword: oldPassword || undefined, password });
    setSaving(false);
    if (res.ok) onSaved?.('Password changed. Other devices stay signed in until you log them out in Devices.');
    else setError(res.message);
  };

  return (
    <SlideDrawer
      open={open}
      title="Change password"
      subtitle="Updates your Appwrite account password"
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</ActionButton>
          <ActionButton variant="primary" onClick={save} loading={saving}>Update password</ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Banner kind="error">{error}</Banner>}
        <TextInput
          type="password"
          label="Current password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          error={errors.oldPassword}
          hint={googleOnly ? 'Signed up with Google and never set a password? Leave this empty.' : undefined}
        />
        <TextInput type="password" label="New password" autoComplete="new-password" value={password} onChange={(e) => setNew(e.target.value)} error={errors.password} />
        <TextInput type="password" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      </div>
    </SlideDrawer>
  );
}
