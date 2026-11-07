import { useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '../store/slices/hooks';
import { selectProfile } from '../store/slices/authSlice';
import { clearUsers, loadMyProfile, refreshMyProfile } from '../store/slices/userSlice';

// The shape userService.ensureProfile({ user }) needs, built from the auth profile row.
export const toAuthUser = (profile) => ({
  $id: profile.userId || profile.$id,
  email: profile.email,
  name: profile.name,
});

// Keeps state.users in step with the auth session, from ONE place:
//   - a session appears (app start, email login, Google callback, signup name step)
//       -> loadMyProfile({ user })
//   - same account, name/email changed (e.g. ProfileStep saved the name)
//       -> refreshMyProfile()
//   - session ends (logout, expired session) -> clearUsers()
// Because every login path ends with state.auth.profile being set, no login page,
// AuthCallback or LogoutButton needs to dispatch anything itself.
export default function useProfileSync() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);

  const userId = profile ? profile.userId || profile.$id : null;
  const email = profile?.email;
  const name = profile?.name;

  const lastKey = useRef('');
  const lastId = useRef(null);

  useEffect(() => {
    const key = userId ? `${userId}|${email}|${name}` : '';
    if (key === lastKey.current) return; // also keeps StrictMode's double effect harmless
    const previousId = lastId.current;
    lastKey.current = key;
    lastId.current = userId;

    if (!userId) {
      if (previousId) dispatch(clearUsers());
      return;
    }
    if (userId !== previousId) dispatch(loadMyProfile({ user: { $id: userId, email, name } }));
    else dispatch(refreshMyProfile());
  }, [userId, email, name, dispatch]);
}