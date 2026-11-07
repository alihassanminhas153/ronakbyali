import { useCallback, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useStore } from 'react-redux';
import { Loader2 } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../store/slices/hooks';
import { selectIsLoggedIn } from '../store/slices/authSlice';
import {
  loadMyProfile,
  refreshMyProfile,
  selectIsBlocked,
  selectMeStatus,
} from '../store/slices/userSlice';
import Blocked from '../pages/shared/structure/Blocked';
import useProfileSync, { toAuthUser } from './useProfileSync';

const REFRESH_MS = 60_000; // while the tab is visible
const MIN_GAP_MS = 2_000; // focus + visibilitychange often fire together

// Pathless layout route that wraps EVERY route in App.jsx (all layouts, GuestRoute,
// ProtectedRoute, CatchAllRoute, SlugRoute, /auth/callback).
//
//  - signed in and isBlocked  -> <Blocked /> instead of <Outlet />, on every URL.
//    No redirect and no exceptions, so there is nothing to loop and the gate also
//    wins over GuestRoute / ProtectedRoute.
//  - signed in, profile still loading -> a neutral full-screen loader is drawn OVER
//    the routes (they stay mounted, so e.g. AuthCallback keeps its state) and no real
//    page is ever visible before the block state is known.
//  - a failed load/refresh is ignored: the last known state is kept, so a network
//    error never blocks or unblocks anybody.
export default function BlockedGate() {
  const dispatch = useAppDispatch();
  const store = useStore();
  const { pathname } = useLocation();
  const lastRun = useRef(0);

  useProfileSync();

  const loggedIn = useAppSelector(selectIsLoggedIn);
  const blocked = useAppSelector(selectIsBlocked);
  const meStatus = useAppSelector(selectMeStatus);

  const recheck = useCallback(
    (throttle = false) => {
      const now = Date.now();
      if (throttle && now - lastRun.current < MIN_GAP_MS) return;
      const { auth, users } = store.getState();
      if (!auth.profile) return; // signed out: nothing to check
      lastRun.current = now;

      if (users.meId) {
        dispatch(refreshMyProfile());
      } else if (users.meStatus !== 'loading') {
        // The first load failed earlier (or never ran): try it again.
        dispatch(loadMyProfile({ user: toAuthUser(auth.profile) }));
      }
    },
    [dispatch, store]
  );

  // Every route change (and the first render).
  useEffect(() => {
    recheck();
  }, [pathname, recheck]);

  // Window focus, tab becoming visible, and every 60 s while visible.
  useEffect(() => {
    const onFocus = () => recheck(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') recheck(true);
    };
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') recheck();
    }, REFRESH_MS);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [recheck]);

  if (loggedIn && blocked) return <Blocked />;

  const resolving = loggedIn && (meStatus === 'idle' || meStatus === 'loading');

  return (
    <>
      <Outlet />
      {resolving && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bg text-muted"
        >
          <Loader2 size={28} className="animate-spin text-accent" aria-hidden="true" />
          <span className="sr-only">Loading your account</span>
        </div>
      )}
    </>
  );
}