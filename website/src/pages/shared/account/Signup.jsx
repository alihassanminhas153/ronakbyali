import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  registerWithEmail,
  continueWithGoogle,
  clearAuthError,
  selectAuthError,
  selectAuthStatus,
  selectPendingProfile,
} from '../../../store/slices/authSlice';
import AuthShell, { EmailChip, FormError, OrDivider } from '../auth/AuthShell';
import AuthField from '../auth/AuthField';
import AuthButton from '../auth/AuthButton';
import GoogleButton from '../auth/GoogleButton';
import ProfileStep from '../auth/ProfileStep';
import { homePathFor } from './authRedirect';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1 -> Google, or an email. Step 2 -> choose a password.
// Once the account exists the slice sets pendingProfile and the small profile popup opens.
export default function Signup() {
  const navigate = useNavigate();
  const pendingProfile = useAppSelector(selectPendingProfile);

  return (
    <>
      <CredentialsStep />
      {pendingProfile && (
        <ProfileStep
          profile={pendingProfile}
          onDone={(saved) => navigate(homePathFor(saved), { replace: true })}
        />
      )}
    </>
  );
}

function CredentialsStep() {
  const dispatch = useAppDispatch();
  const authError = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  const [step, setStep] = useState('email'); // 'email' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [googleBusy, setGoogleBusy] = useState(false);

  const busy = status === 'loading' || googleBusy;

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onEmailSubmit = (e) => {
    e.preventDefault();
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setEmail(clean);
    setFieldErrors({});
    dispatch(clearAuthError());
    setStep('password');
  };

  const onChangeEmail = () => {
    setStep('email');
    setPassword('');
    setFieldErrors({});
    dispatch(clearAuthError());
  };

  const onPasswordSubmit = (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setFieldErrors({ password: 'Use at least 8 characters.' });
      return;
    }
    setFieldErrors({});

    // On success the slice stores pendingProfile and <ProfileStep /> opens.
    dispatch(registerWithEmail({ email, password }));
  };

  const onGoogle = () => {
    setGoogleBusy(true);
    dispatch(continueWithGoogle()); // Google creates the account if it is new; name + photo come from Google
  };

  return (
    <AuthShell
      title="Create account"
      subtitle={step === 'email' ? 'Sign up to get started.' : 'Choose a password.'}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/welcome-back" className="font-medium text-accent hover:text-accent-hover hover:underline">
            Log in
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
              onChange={(e) => { setEmail(e.target.value); setFieldErrors({}); }}
              error={fieldErrors.email}
              disabled={busy}
            />

            <FormError message={authError} />

            <AuthButton disabled={busy}>Continue with email</AuthButton>
          </form>
        </>
      ) : (
        <>
          <EmailChip email={email} onChange={onChangeEmail} disabled={busy} />

          <form onSubmit={onPasswordSubmit} noValidate className="flex flex-col gap-4">
            {/* lets password managers pair the new password with this email */}
            <input type="email" name="email" value={email} autoComplete="username" readOnly tabIndex={-1} className="sr-only" aria-hidden="true" />

            <AuthField
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Create a password"
              hint="At least 8 characters."
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors({}); }}
              error={fieldErrors.password}
              disabled={busy}
            />

            <FormError message={authError} />

            <AuthButton loading={status === 'loading'} disabled={busy}>Create account</AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}