import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Lock, Mail } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  authenticateWithEmail,
  continueWithGoogle,
  clearAuthError,
  selectAuthStatus,
  selectPendingProfile,
} from '../../../store/slices/authSlice';
import { addToast } from '../../../store/slices/uiSlice';
import AuthShell, { EmailChip, OrDivider } from '../auth/AuthShell';
import AuthField from '../auth/AuthField';
import AuthButton from '../auth/AuthButton';
import GoogleButton from '../auth/GoogleButton';
import ProfileStep from '../auth/ProfileStep';
import { homePathFor } from './authRedirect';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1 -> Google, or an email. Step 2 -> password for that email.
export default function Signin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const status = useAppSelector(selectAuthStatus);
  const pendingProfile = useAppSelector(selectPendingProfile);

  const [step, setStep] = useState('email'); // 'email' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const shownLocationError = useRef('');

  const from = location.state?.from?.pathname;
  const busy = status === 'loading' || googleBusy;

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (location.state?.error && shownLocationError.current !== location.state.error) {
      shownLocationError.current = location.state.error;
      dispatch(addToast({ type: 'error', message: location.state.error }));
    }
  }, [dispatch, location.state?.error]);

  const onEmailSubmit = (e) => {
    e.preventDefault();
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmail(clean);
    setEmailError('');
    setPasswordError('');
    dispatch(clearAuthError());
    setStep('password');
  };

  const onChangeEmail = () => {
    setStep('email');
    setPassword('');
    setPasswordError('');
    dispatch(clearAuthError());
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!password) {
      setPasswordError('Enter your password.');
      return;
    }
    setPasswordError('');

    const result = await dispatch(authenticateWithEmail({ email, password, toast: true }));
    if (authenticateWithEmail.fulfilled.match(result)) {
      const { profile, created } = result.payload;
      if (created) {
        dispatch(addToast({ type: 'success', message: 'Account created. Finish setting up your profile.' }));
      } else {
        dispatch(addToast({ type: 'success', message: 'You are now logged in.' }));
        navigate(homePathFor(profile, from), { replace: true });
      }
    }
  };

  const onGoogle = () => {
    setGoogleBusy(true);
    dispatch(continueWithGoogle()); // the browser leaves for Google
  };

  if (pendingProfile) {
    return (
      <ProfileStep
        profile={pendingProfile}
        onDone={(profile) => navigate(homePathFor(profile, from), { replace: true })}
      />
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={step === 'email' ? 'Log in to continue.' : 'Enter your password.'}
      imageTitle="Good to see you again."
      imageText="Pick up where you left off: your cart, wishlist and orders are waiting."
      footer={
        <>
          New here?{' '}
          <Link to="/create-account" className="font-medium text-accent hover:text-accent-hover hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {step === 'email' ? (
        <>
          <GoogleButton onClick={onGoogle} loading={googleBusy} disabled={busy} />
          <OrDivider />

          <form onSubmit={onEmailSubmit} noValidate className="flex flex-col gap-5">
            <AuthField
              label="Email"
              type="email"
              name="email"
              icon={Mail}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              error={emailError}
              disabled={busy}
            />

            <AuthButton disabled={busy}>Continue with email</AuthButton>
          </form>
        </>
      ) : (
        <>
          <EmailChip email={email} onChange={onChangeEmail} disabled={busy} />

          <form onSubmit={onPasswordSubmit} noValidate className="flex flex-col gap-5">
            {/* lets password managers pair the password with this email */}
            <input type="email" name="email" value={email} autoComplete="username" readOnly tabIndex={-1} className="sr-only" aria-hidden="true" />

            <AuthField
              label="Password"
              type="password"
              name="password"
              icon={Lock}
              autoComplete="current-password"
              placeholder="Your password"
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              error={passwordError}
              disabled={busy}
            />

            <AuthButton loading={status === 'loading'} disabled={busy}>Log in</AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}