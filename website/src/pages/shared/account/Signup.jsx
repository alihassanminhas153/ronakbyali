import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Lock, Mail } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  registerWithEmail,
  continueWithGoogle,
  clearAuthError,
  selectAuthError,
  selectAuthStatus,
  selectPendingProfile,
} from '../../../store/slices/authSlice';
import AuthShell, { EmailChip, FormError, Notice, OrDivider } from '../auth/AuthShell';
import AuthField from '../auth/AuthField';
import AuthButton from '../auth/AuthButton';
import GoogleButton from '../auth/GoogleButton';
import ProfileStep from '../auth/ProfileStep';
import { PATHS } from '../../../router/path';

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
          onDone={() => navigate(PATHS.products, { replace: true })}
        />
      )}
    </>
  );
}

// 0 = too short, 1-4 = weak .. strong
function passwordScore(pw) {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const SCORE_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

function PasswordMeter({ password }) {
  if (!password) return null;
  const score = passwordScore(password);

  return (
    <div className="-mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${n <= score ? 'bg-accent' : 'bg-border'}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">Password strength: {SCORE_LABELS[score]}</p>
    </div>
  );
}

function CredentialsStep() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const authError = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  // Sent here by Signin after 3 failed log-ins: keep the email they typed.
  const fromFailedLogin = location.state?.reason === 'attempts';

  const [step, setStep] = useState('email'); // 'email' | 'password'
  const [email, setEmail] = useState(location.state?.email || '');
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
      imageTitle="Make it yours."
      imageText="Save your favourites, track every order and check out faster."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/welcome-back" className="font-medium text-accent hover:text-accent-hover hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {fromFailedLogin && (
        <Notice>
          We could not log you in after 3 tries. Create a new account below, or{' '}
          <Link to="/welcome-back" className="font-medium text-accent hover:underline">
            try logging in again
          </Link>
          .
        </Notice>
      )}

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

          <form onSubmit={onPasswordSubmit} noValidate className="flex flex-col gap-5">
            {/* lets password managers pair the new password with this email */}
            <input type="email" name="email" value={email} autoComplete="username" readOnly tabIndex={-1} className="sr-only" aria-hidden="true" />

            <AuthField
              label="Password"
              type="password"
              name="password"
              icon={Lock}
              autoComplete="new-password"
              placeholder="Create a password"
              hint="At least 8 characters."
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors({}); }}
              error={fieldErrors.password}
              disabled={busy}
            />

            <PasswordMeter password={password} />

            <FormError message={authError} />

            <AuthButton loading={status === 'loading'} disabled={busy}>Create account</AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}