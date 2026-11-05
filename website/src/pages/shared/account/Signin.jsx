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
import AuthShell, { FormError, OrDivider } from '../auth/AuthShell';
import AuthField from '../auth/AuthField';
import AuthButton from '../auth/AuthButton';
import GoogleButton from '../auth/GoogleButton';
import { homePathFor } from './authRedirect';

export default function Signin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const authError = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  const from = location.state?.from?.pathname;
  const busy = status === 'loading' || googleBusy;
  // errorFromCallback: set by /auth/callback when Google login fails
  const error = localError || authError || location.state?.error || '';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLocalError('Enter your email and password.');
      return;
    }
    setLocalError('');

    const result = await dispatch(signIn({ email: cleanEmail, password }));
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
      subtitle="Log in to see your orders, cart and wishlist."
      footer={
        <>
          New to Ronak By Ali?{' '}
          <Link to="/create-account" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton onClick={onGoogle} loading={googleBusy} disabled={busy} />
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
          onChange={(e) => { setEmail(e.target.value); setLocalError(''); }}
          disabled={busy}
        />
        <AuthField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
          disabled={busy}
        />

        <FormError message={error} />

        <AuthButton loading={status === 'loading' && !googleBusy} disabled={busy}>
          Log in
        </AuthButton>
      </form>
    </AuthShell>
  );
}