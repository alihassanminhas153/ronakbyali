import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Loader2 } from 'lucide-react';

import { useAppDispatch } from '../../../store/slices/hooks';
import { logout } from '../../../store/slices/authSlice';
import { PATHS } from '../../../router/path';

const DEFAULT_CLASS =
  'inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-60';

// Logs out (clears every user slice via isSessionEnded) and goes to the sign-in page.
// Pass `className` to restyle it, e.g. as a sidebar row.
export default function LogoutButton({ className = DEFAULT_CLASS }) {
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
    <button type="button" onClick={onLogout} disabled={busy} className={className}>
      {busy ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOut size={18} aria-hidden="true" />
      )}
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}