import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  signIn,
  continueWithGoogle,
  clearAuthError,
  selectAuthError,
  selectAuthStatus,
} from '../../../store/slices/authSlice';
import AuthShell, { EmailChip, FormError, OrDivider } from '../auth/AuthShell';
import AuthField from '../auth/AuthField';
import AuthButton from '../auth/AuthButton';
import GoogleButton from '../auth/GoogleButton';
import { homePathFor } from './authRedirect';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1 -> Google, or an email. Step 2 -> password for that email.
export default function Signin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const authError = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  const [step, setStep] = useState('email'); // 'email' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  // starts with the error sent back by /auth/callback when Google login fails
  const [localError, setLocalError] = useState(location.state?.error || '');
  const [googleBusy, setGoogleBusy] = useState(false);

  const from = location.state?.from?.pathname;
  const busy = status === 'loading' || googleBusy;
  const error = localError || authError || '';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onEmailSubmit = (e) => {
    e.preventDefault();
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmail(clean);
    setEmailError('');
    setLocalError('');
    dispatch(clearAuthError());
    setStep('password');
  };

  const onChangeEmail = () => {
    setStep('email');
    setPassword('');
    setLocalError('');
    dispatch(clearAuthError());
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setLocalError('Enter your password.');
      return;
    }
    setLocalError('');

    const result = await dispatch(signIn({ email, password }));
    if (signIn.fulfilled.match(result)) {
      // the profile (all columns of the users row) is now in state.auth.profile
      navigate(homePathFor(result.payload, from), { replace: true });
    }
  };

  const onGoogle = () => {
    setLocalError('');
    setGoogleBusy(true);
    dispatch(continueWithGoogle()); // the browser leaves for Google
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle={step === 'email' ? 'Log in to continue.' : 'Enter your password.'}
      footer={
        <>
          New to Ronak By Ali?{' '}
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

          <form onSubmit={onEmailSubmit} noValidate className="flex flex-col gap-4">
            <AuthField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              error={emailError}
              disabled={busy}
            />

            <FormError message={error} />

            <AuthButton disabled={busy}>Continue with email</AuthButton>
          </form>
        </>
      ) : (
        <>
          <EmailChip email={email} onChange={onChangeEmail} disabled={busy} />

          <form onSubmit={onPasswordSubmit} noValidate className="flex flex-col gap-4">
            {/* lets password managers pair the password with this email */}
            <input type="email" name="email" value={email} autoComplete="username" readOnly tabIndex={-1} className="sr-only" aria-hidden="true" />

            <AuthField
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Your password"
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
              disabled={busy}
            />

            <FormError message={error} />

            <AuthButton loading={status === 'loading'} disabled={busy}>Log in</AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}