import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';

import { useAppDispatch } from '../../../store/slices/hooks';
import { completeLogin } from '../../../store/slices/authSlice';
import ProfileStep from '../auth/ProfileStep';
import { homePathFor } from './authRedirect';

// Google sends the user back here (successUrl in authService.continueWithGoogle).
// completeLogin loads the profile row, or creates it with the Google name/email/photo
// for a brand-new account.
//   - returning user -> straight home
//   - new user       -> the small profile popup (name + photo, prefilled from Google), then home
export default function AuthCallback() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const started = useRef(false); // React StrictMode runs effects twice in dev
  const [newProfile, setNewProfile] = useState(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    dispatch(completeLogin({})).then((result) => {
      if (completeLogin.fulfilled.match(result)) {
        if (result.payload?.isNew) {
          setNewProfile(result.payload);
        } else {
          navigate(homePathFor(result.payload), { replace: true });
        }
      } else {
        navigate('/welcome-back', {
          replace: true,
          state: { error: result.payload || 'Google login failed. Please try again.' },
        });
      }
    });
  }, [dispatch, navigate]);

  return (
    <>
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-4 text-muted">
        {!newProfile && (
          <>
            <Loader2 size={28} className="animate-spin text-accent" aria-hidden="true" />
            <p role="status">Signing you in…</p>
          </>
        )}
      </main>

      {newProfile && (
        <ProfileStep
          profile={newProfile}
          onDone={(saved) => navigate(homePathFor(saved), { replace: true })}
        />
      )}
    </>
  );
}