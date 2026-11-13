// src/store/slices/checkoutThunks.js
//
// USAGE
//   // guest, email + password (the order button asks for the password first):
//   const res = await dispatch(placeGuestOrder({ product, quantity, form, password }));
//
//   // on the /auth/callback page, right after completeLogin() succeeded:
//   const res = await dispatch(finishGoogleCheckout());
//   const next = res.payload;          // { to, state } or { to: null }
//   if (next?.to) navigate(next.to, { replace: true, state: next.state });
//
// Nothing is sent to Appwrite until the details pass validateDetails().
import { createAsyncThunk } from '@reduxjs/toolkit';
import { authenticateWithEmail, saveName } from './authSlice';
import { placeDirectOrder } from './ordersSlice';
import { fetchProductById } from './productsSlice';
import { PATHS } from '../../router/path';
import { clearDraft, fillFromProfile, loadDraft, saveDraft, validateDetails } from '../../lib/checkoutDraft';

const MIN_PASSWORD = 8; // Appwrite's minimum

/* ---------- guest: email + password ---------- */
// Existing account  -> signs in (wrong password = error, no account is created).
// New email         -> creates the account, saves the name, then signs in.
//                      (phone, city and address are saved on the profile by the order itself)
// Then the order is created.
export const placeGuestOrder = createAsyncThunk('checkout/placeGuest', async (arg, { dispatch, rejectWithValue }) => {
  const { product, quantity, form = {}, password } = arg;

  // client-side checks first
  if (Object.keys(validateDetails(form, { needEmail: true })).length) {
    return rejectWithValue('Please complete the form.');
  }
  if (!password || password.length < MIN_PASSWORD) {
    return rejectWithValue(`Password must be at least ${MIN_PASSWORD} characters.`);
  }

  const email = form.customerEmail.trim().toLowerCase();
  const auth = await dispatch(authenticateWithEmail({ email, password }));
  if (!authenticateWithEmail.fulfilled.match(auth)) {
    return rejectWithValue(auth.payload || 'Could not sign you in. Please try again.');
  }

  if (auth.payload.created) {
    const named = await dispatch(saveName({ name: form.customerName.trim() }));
    if (!saveName.fulfilled.match(named)) {
      return rejectWithValue(named.payload || 'Your account was created, but we could not save your name.');
    }
  }

  const placed = await dispatch(placeDirectOrder({ product, quantity, form: { ...form, customerEmail: email }, toast: true }));
  if (!placeDirectOrder.fulfilled.match(placed)) {
    return rejectWithValue(placed.payload || 'You are signed in, but the order could not be placed. Please try again.');
  }
  clearDraft();
  return placed.payload; // the order row
});

/* ---------- guest: Google ---------- */
// Runs after Google login. Places the saved order only when everything needed
// is there; otherwise sends the user back to the product with the form open.
let inFlight = null; // guards against a double run (React StrictMode)

const finish = async ({ dispatch, getState }) => {
  const profile = getState().auth.profile;
  const draft = loadDraft();
  if (!profile || !draft) return { to: null };

  const back = { to: draft.returnPath || PATHS.products, state: { reopenCheckout: true } };
  const form = fillFromProfile(draft.form, profile);

  // 1. client-side check: no Appwrite call if something is missing
  if (Object.keys(validateDetails(form)).length) {
    saveDraft({ ...draft, form });
    return back;
  }

  // 2. the product is needed for price + stock
  const fetched = await dispatch(fetchProductById(draft.productId));
  if (!fetchProductById.fulfilled.match(fetched)) return back;

  // 3. place the order
  clearDraft(); // taken before sending, so it can never be placed twice
  const placed = await dispatch(placeDirectOrder({ product: fetched.payload, quantity: draft.quantity, form, toast: true }));
  if (!placeDirectOrder.fulfilled.match(placed)) {
    saveDraft({ ...draft, form });
    return back;
  }
  return { to: PATHS.user.orders(placed.payload.username || profile.username), state: null };
};

export const finishGoogleCheckout = createAsyncThunk('checkout/finishGoogle', (_, api) => {
  if (!inFlight) inFlight = finish(api).finally(() => { inFlight = null; });
  return inFlight;
});