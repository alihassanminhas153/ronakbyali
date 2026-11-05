import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Loader2 } from 'lucide-react';

import { useAppDispatch } from '../../../store/slices/hooks';
import { logout } from '../../../store/slices/authSlice';
import { PATHS } from '../../../router/path';

export default function LogoutButton() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    if (busy) return;
    setBusy(true);
    const result = await dispatch(logout());
    setBusy(false);
    if (logout.fulfilled.match(result)) {
      navigate(PATHS.signin, { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOut size={16} aria-hidden="true" />
      )}
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
