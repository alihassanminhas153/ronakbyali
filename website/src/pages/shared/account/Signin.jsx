import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Lock, Mail } from 'lucide-react';

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

// After this many failed password attempts the visitor is sent to /create-account.
const MAX_ATTEMPTS = 3;

// Problems that are not the person's fault (no internet, rate limit) do not use up an attempt.
const NOT_A_PASSWORD_PROBLEM = /network|fetch|timeout|offline|too many|rate limit/i;

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
  const [attempts, setAttempts] = useState(0);

  const from = location.state?.from?.pathname;
  const busy = status === 'loading' || googleBusy;
  const error = localError || authError || '';
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  // Counts one failed attempt. On the last one, move the visitor to the signup page.
  const registerFailure = (message) => {
    const used = attempts + 1;
    setAttempts(used);

    if (used >= MAX_ATTEMPTS) {
      navigate('/create-account', { replace: true, state: { email, reason: 'attempts' } });
      return;
    }
    if (message) setLocalError(message);
  };

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
    setAttempts(0); // a different email starts a fresh count
    setLocalError('');
    dispatch(clearAuthError());
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!password) {
      registerFailure('Enter your password.');
      return;
    }
    setLocalError('');

    const result = await dispatch(signIn({ email, password }));
    if (signIn.fulfilled.match(result)) {
      // the profile (all columns of the users row) is now in state.auth.profile
      navigate(homePathFor(result.payload, from), { replace: true });
      return;
    }

    const message = typeof result.payload === 'string' ? result.payload : result.error?.message || '';
    if (!NOT_A_PASSWORD_PROBLEM.test(message)) registerFailure();
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

            <FormError message={error} />

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
              onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
              disabled={busy}
            />

            <FormError message={error} />

            {attempts > 0 && (
              <p className="-mt-2 text-sm text-muted" role="status">
                {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left. After that we will take you to create an account.
              </p>
            )}

            <AuthButton loading={status === 'loading'} disabled={busy}>Log in</AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}