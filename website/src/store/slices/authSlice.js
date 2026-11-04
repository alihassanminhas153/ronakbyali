// USAGE
//   const dispatch = useAppDispatch();
//   const profile = useAppSelector(selectProfile);
//   dispatch(signIn({ email, password, toast: true }));      // toast: true shows an error toast
//   useEffect(() => { dispatch(initAuth()); }, []);          // or use initApp() from appThunks.js
//   if (!useAppSelector(selectAuthChecked)) return <Spinner />;
import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import { authService, userService } from '../services';
import { fail, getUserId, isRow, stripToast } from '../utils';

const STAFF_ROLES = ['admin', 'support', 'manager'];

const flagsFor = (profile) => {
  const role = profile?.role || null;
  return { role, isAdmin: role === 'admin', isStaff: STAFF_ROLES.includes(role) };
};

const initialState = {
  profile: null,
  authChecked: false,
  status: 'idle',
  error: null,
  roleFlags: flagsFor(null),
};

/* ---------- app start ---------- */

// Restores the session. Uses getCurrentProfile (NOT completeLogin).
export const initAuth = createAsyncThunk('auth/init', async () => {
  try {
    return (await authService.getCurrentProfile()) || null;
  } catch {
    return null;
  }
});

/* ---------- login / signup (return the profile row or false) ---------- */

const profileThunk = (type, call) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    const profile = await call(stripToast(arg));
    if (!profile) {
      return fail(rejectWithValue, authService.lastError || 'Something went wrong. Please try again.', arg);
    }
    return profile;
  });

export const signUp = profileThunk('auth/signUp', (a) => authService.signUp(a)); // { email, password, name }
export const signIn = profileThunk('auth/signIn', (a) => authService.signIn(a)); // { email, password }
export const continueWithEmail = profileThunk('auth/continueWithEmail', (a) => authService.continueWithEmail(a));
export const completeLogin = profileThunk('auth/completeLogin', () => authService.completeLogin()); // /auth/callback, call once

// Redirects the browser to Google (sync service call).
export const continueWithGoogle = createAsyncThunk('auth/continueWithGoogle', async () => {
  authService.continueWithGoogle();
  return true;
});

/* ---------- logout ---------- */

export const logout = createAsyncThunk('auth/logout', async (arg, { rejectWithValue }) => {
  const ok = await authService.logout();
  if (ok === false) return fail(rejectWithValue, authService.lastError || 'Could not log out.', arg);
  return true;
});

export const logoutAll = createAsyncThunk('auth/logoutAll', async (arg, { rejectWithValue }) => {
  const ok = await authService.logoutAll();
  if (ok === false) return fail(rejectWithValue, authService.lastError || 'Could not log out of all devices.', arg);
  return true;
});

// Every user-specific slice listens to this to reset itself.
export const isSessionEnded = isAnyOf(logout.fulfilled, logoutAll.fulfilled);

/* ---------- profile ---------- */

// Reloads the profile row (used after placing an order, etc).
export const refreshProfile = createAsyncThunk('auth/refreshProfile', async (_, { getState, rejectWithValue }) => {
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue('Not logged in');
  const profile = await userService.getProfile({ userId });
  if (!profile) return rejectWithValue('Could not refresh your profile.');
  return profile;
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (arg, { getState, rejectWithValue }) => {
  const { data } = stripToast(arg); // dispatch(updateProfile({ data: { phone } }))
  const profile = getState().auth.profile;
  const result = await userService.updateProfile({ userId: getUserId(profile), data });
  if (!result) return fail(rejectWithValue, 'Could not update your profile.', arg);
  return isRow(result) ? result : { ...profile, ...data };
});

// File objects are passed as an argument only, never stored in state.
export const changeAvatar = createAsyncThunk('auth/changeAvatar', async (arg, { getState, rejectWithValue }) => {
  const { file, oldFileId } = stripToast(arg);
  const profile = getState().auth.profile;
  const userId = getUserId(profile);
  const result = await userService.changeAvatar({ userId, file, oldFileId });
  if (!result) return fail(rejectWithValue, 'Could not change your photo.', arg);
  if (isRow(result)) return result;
  return (await userService.getProfile({ userId })) || profile;
});

export const updateName = createAsyncThunk('auth/updateName', async (arg, { getState, rejectWithValue }) => {
  const { name } = stripToast(arg);
  const profile = getState().auth.profile;
  const result = await authService.updateName({ name });
  if (result === false) return fail(rejectWithValue, authService.lastError || 'Could not update your name.', arg);
  return (await userService.getProfile({ userId: getUserId(profile) })) || { ...profile, name };
});

/* ---------- password / verification ---------- */

const actionThunk = (type, call, message) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    const result = await call(stripToast(arg));
    if (result === false) return fail(rejectWithValue, authService.lastError || message, arg);
    return true;
  });

export const sendPasswordRecovery = actionThunk('auth/sendPasswordRecovery', (a) => authService.sendPasswordRecovery(a), 'Could not send the recovery email.');
export const confirmPasswordRecovery = actionThunk('auth/confirmPasswordRecovery', (a) => authService.confirmPasswordRecovery(a), 'Could not reset your password.');
export const sendVerification = actionThunk('auth/sendVerification', () => authService.sendVerification(), 'Could not send the verification email.');
export const confirmVerification = actionThunk('auth/confirmVerification', (a) => authService.confirmVerification(a), 'Could not verify your email.');
export const updatePassword = actionThunk('auth/updatePassword', (a) => authService.updatePassword(a), 'Could not change your password.');

/* ---------- slice ---------- */

const profileSetters = [
  initAuth, signUp, signIn, continueWithEmail, completeLogin,
  refreshProfile, updateProfile, changeAvatar, updateName,
];
const trackedThunks = [
  signUp, signIn, continueWithEmail, completeLogin, continueWithGoogle, logout, logoutAll,
  updateProfile, changeAvatar, updateName,
  sendPasswordRecovery, confirmPasswordRecovery, sendVerification, confirmVerification, updatePassword,
];

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.fulfilled, (state) => {
        state.authChecked = true;
      })
      .addCase(initAuth.rejected, (state) => {
        state.authChecked = true;
      })
      .addMatcher(isSessionEnded, () => ({ ...initialState, authChecked: true }))
      .addMatcher(isAnyOf(...profileSetters.map((t) => t.fulfilled)), (state, action) => {
        state.profile = action.payload || null;
        state.roleFlags = flagsFor(state.profile);
      })
      .addMatcher(isAnyOf(...trackedThunks.map((t) => t.pending)), (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addMatcher(isAnyOf(...trackedThunks.map((t) => t.fulfilled)), (state) => {
        state.status = 'succeeded';
      })
      .addMatcher(isAnyOf(...trackedThunks.map((t) => t.rejected)), (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message || 'Something went wrong.';
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;

/* ---------- selectors ---------- */
export const selectProfile = (state) => state.auth.profile;
export const selectIsLoggedIn = (state) => Boolean(state.auth.profile);
export const selectAuthChecked = (state) => state.auth.authChecked;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;
export const selectRole = (state) => state.auth.roleFlags.role;
export const selectIsStaff = (state) => state.auth.roleFlags.isStaff;
export const selectIsAdmin = (state) => state.auth.roleFlags.isAdmin;

// Sync service helper (no state involved).
export const getAvatarUrl = (fileId) => userService.getAvatarUrl({ fileId });
