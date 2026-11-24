// src/store/slices/checkoutThunks.js
//
// USAGE
//   // guest: the form generates the password; pass it in. result.meta.accountCreated says if it was used to create the account:
//   const res = await dispatch(placeGuestOrder({ product, quantity, form, password, designs }));  // designs only for products with designs
//
//   // on the /auth/callback page, right after completeLogin() succeeded:
//   const res = await dispatch(finishGoogleCheckout());
//   const next = res.payload;          // { to, state } or { to: null }
//   if (next?.to) navigate(next.to, { replace: true, state: next.state });
//
// Nothing is sent to Appwrite until the details pass validateDetails().
import { createAsyncThunk } from '@reduxjs/toolkit';
import { authenticateWithEmail, saveName } from './authSlice';
import { placeCustomOrder, placeDirectOrder } from './ordersSlice';
import { fetchProductById } from './productsSlice';
import { PATHS } from '../../router/path';
import { getDesigns, picksToLines } from '../../lib/designPicks';
import { clearDraft, fillFromProfile, loadDraft, saveDraft, validateDetails } from '../../lib/checkoutDraft';

const MIN_PASSWORD = 8; // Appwrite's minimum

/* ---------- guest: email + password ---------- */
// Existing account  -> signs in (wrong password = error, no account is created).
// New email         -> creates the account, saves the name, then signs in.
//                      (phone, city and address are saved on the profile by the order itself)
// Then the order is created.
export const placeGuestOrder = createAsyncThunk('checkout/placeGuest', async (arg, { dispatch, rejectWithValue, fulfillWithValue }) => {
  const { product, quantity, form = {}, password, designs } = arg;

  // meta.accountCreated tells the form that THIS call created the account, so it
  // can show the generated password (also when a later step fails).
  let accountCreated = false;
  const fail = (message) => rejectWithValue(message, { accountCreated });

  // client-side checks first
  if (Object.keys(validateDetails(form, { needEmail: true })).length) {
    return fail('Please complete the form.');
  }
  if (!password || password.length < MIN_PASSWORD) {
    return fail(`Password must be at least ${MIN_PASSWORD} characters.`);
  }

  const email = form.customerEmail.trim().toLowerCase();
  const auth = await dispatch(authenticateWithEmail({ email, password }));
  if (!authenticateWithEmail.fulfilled.match(auth)) {
    return fail(auth.payload || 'Could not sign you in. Please try again.');
  }
  accountCreated = Boolean(auth.payload.created);

  if (accountCreated) {
    const named = await dispatch(saveName({ name: form.customerName.trim() }));
    if (!saveName.fulfilled.match(named)) {
      return fail(named.payload || 'Your account was created, but we could not save your name.');
    }
  }

  const placed = await dispatch(placeDirectOrder({ product, quantity, designs, form: { ...form, customerEmail: email }, toast: true }));
  if (!placeDirectOrder.fulfilled.match(placed)) {
    return fail(placed.payload || 'You are signed in, but the order could not be placed. Please try again.');
  }
  clearDraft();
  return fulfillWithValue(placed.payload, { accountCreated }); // payload is still the order row
});

export const placeGuestCustomOrder = createAsyncThunk('checkout/placeGuestCustom', async (arg, { dispatch, rejectWithValue }) => {
  const { product, quantity, selectedIds, form = {}, files = [], password } = arg;
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

  const placed = await dispatch(placeCustomOrder({
    product,
    quantity,
    selectedIds,
    files,
    form: { ...form, customerEmail: email },
    toast: true,
  }));
  if (!placeCustomOrder.fulfilled.match(placed)) {
    return rejectWithValue(placed.payload || 'You are signed in, but the customization request could not be placed.');
  }
  clearDraft();
  return placed.payload;
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

  if (draft.isCustom) {
    saveDraft({ ...draft, form, needsReferenceFiles: Boolean(draft.hasReferenceFiles) });
    return {
      to: draft.returnPath || PATHS.products,
      state: { reopenCustomizeCheckout: true, needsReferenceFiles: Boolean(draft.hasReferenceFiles) },
    };
  }

  // 1. client-side check: no Appwrite call if something is missing
  if (Object.keys(validateDetails(form)).length) {
    saveDraft({ ...draft, form });
    return back;
  }

  // 2. the product is needed for price + stock
  const fetched = await dispatch(fetchProductById(draft.productId));
  if (!fetchProductById.fulfilled.match(fetched)) return back;

  // 2b. a product with designs needs the saved design choice (draft.designs = [{ imageId, name, quantity }])
  const designs = getDesigns(fetched.payload).length ? picksToLines(fetched.payload, draft.designs) : undefined;
  if (designs && !designs.length) {
    saveDraft({ ...draft, form });
    return back;
  }

  // 3. place the order
  clearDraft(); // taken before sending, so it can never be placed twice
  const placed = await dispatch(placeDirectOrder({ product: fetched.payload, quantity: draft.quantity, designs, form, toast: true }));
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