import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CheckCircle2 } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  registerWithEmail,
  saveName,
  continueWithGoogle,
  clearAuthError,
  selectAuthError,
  selectAuthStatus,
  selectPendingProfile,
} from '../../../store/slices/authSlice';
import AuthShell, { FormError, OrDivider } from '../auth/AuthShell';
import AuthField from '../auth/AuthField';
import AuthButton from '../auth/AuthButton';
import GoogleButton from '../auth/GoogleButton';
import { homePathFor } from './authRedirect';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1 -> email + password (or Google). Step 2 -> name, once the account exists.
export default function Signup() {
  const pendingProfile = useAppSelector(selectPendingProfile);
  return pendingProfile ? <NameStep profile={pendingProfile} /> : <CredentialsStep />;
}

/* ---------------- step 1 ---------------- */

function CredentialsStep() {
  const dispatch = useAppDispatch();
  const authError = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [googleBusy, setGoogleBusy] = useState(false);

  const busy = status === 'loading' || googleBusy;

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const errors = {};
    if (!EMAIL_RE.test(cleanEmail)) errors.email = 'Enter a valid email address.';
    if (password.length < 8) errors.password = 'Use at least 8 characters.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    // On success the slice stores pendingProfile and this component swaps to <NameStep />.
    dispatch(registerWithEmail({ email: cleanEmail, password }));
  };

  const onGoogle = () => {
    setGoogleBusy(true);
    dispatch(continueWithGoogle()); // Google creates the account if it is new; name comes from Google
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Sign up with your email, or continue with Google."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/welcome-back" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton onClick={onGoogle} loading={googleBusy} disabled={busy} label="Sign up with Google" />
      <OrDivider />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: '' })); }}
          error={fieldErrors.email}
          disabled={busy}
        />
        <AuthField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: '' })); }}
          error={fieldErrors.password}
          disabled={busy}
        />

        <FormError message={authError} />

        <AuthButton loading={status === 'loading' && !googleBusy} disabled={busy}>
          Create account
        </AuthButton>
      </form>
    </AuthShell>
  );
}

/* ---------------- step 2 ---------------- */

function NameStep({ profile }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authError = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const busy = status === 'loading';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 2) return setNameError('Enter your name (at least 2 characters).');
    if (clean.length > 128) return setNameError('That name is too long.');
    setNameError('');

    const result = await dispatch(saveName({ name: clean }));
    if (saveName.fulfilled.match(result)) {
      navigate(homePathFor(result.payload), { replace: true });
    }
  };

  return (
    <AuthShell title="One last thing" subtitle="What should we call you? This name shows on your orders and profile.">
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 size={18} aria-hidden="true" />
        Account created for <span className="font-medium text-text">{profile.email}</span>
      </p>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <AuthField
          label="Your name"
          name="name"
          autoComplete="name"
          placeholder="Full name"
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(''); }}
          error={nameError}
          disabled={busy}
        />

        <FormError message={authError} />

        <AuthButton loading={busy}>Save and continue</AuthButton>
      </form>
    </AuthShell>
  );
}