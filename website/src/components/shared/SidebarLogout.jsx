import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Loader2 } from 'lucide-react';

import { useAppDispatch } from '../../store/slices/hooks';
import { logout } from '../../store/slices/authSlice';
import { PATHS } from '../../router/path';
import Fold, { IconCell } from './SidebarFold';

// Sidebar-only sign out row. Same geometry as the nav links:
//   expanded  -> icon + "Sign out" label
//   collapsed -> icon only (label folds away, tooltip + aria-label keep it clear)
// Logging out clears every user slice (isSessionEnded) and returns to sign-in.
export default function SidebarLogout({ collapsed = false }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    if (busy) return;
    setBusy(true);
    const result = await dispatch(logout());
    if (logout.fulfilled.match(result)) {
      navigate(PATHS.signin, { replace: true });
    } else {
      setBusy(false); // on success the page unmounts, so only reset on failure
    }
  };

  const label = busy ? 'Signing out…' : 'Sign out';

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      aria-busy={busy}
      aria-label={collapsed ? 'Sign out' : undefined}
      title={collapsed ? 'Sign out' : undefined}
      className="flex h-11 w-full items-center rounded-md text-sm text-muted transition-colors hover:bg-error/10 hover:text-error focus-visible:-outline-offset-2 focus-visible:outline-error disabled:opacity-60"
    >
      <IconCell>
        {busy ? (
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
        )}
      </IconCell>
      <Fold collapsed={collapsed}>{label}</Fold>
    </button>
  );
}