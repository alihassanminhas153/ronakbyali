// Small helpers shared by the slices.
import { createAsyncThunk } from '@reduxjs/toolkit';

// Used as a rejection payload when a guest tries a logged-in action.
export const LOGIN_REQUIRED = 'LOGIN_REQUIRED';

// Appwrite rows are plain objects with a $id.
export const isRow = (v) =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v) && Boolean(v.$id);

// Account id used by the services ({ userId }). Falls back to the profile row id.
export const getUserId = (profile) => profile?.userId || profile?.$id || null;

// Rows from a result that may be an array or { rows }.
export const toRows = (r) => (Array.isArray(r) ? r : r?.rows || []);

// Reject with a readable message. Pass the thunk argument so `toast: true` works.
export const fail = (rejectWithValue, message, arg) =>
  rejectWithValue(message, {
    toast: arg && typeof arg === 'object' && !Array.isArray(arg) && arg.toast
      ? arg.toast
      : false,
  });

// Remove the `toast` flag before forwarding an argument object to a service.
export const stripToast = (arg) => {
  if (!arg || typeof arg !== 'object' || Array.isArray(arg)) return {};
  const { toast, ...rest } = arg; // eslint-disable-line no-unused-vars
  return rest;
};

// Generic thunk for admin methods whose exact signature is passed through.
// Call it with an ARRAY of the service arguments: dispatch(thunk([rowId, data])).
// `single: true` sends the argument as-is (useful when the argument is itself an array).
// `after(dispatch, result, args)` can reload data once the call worked.
export const serviceThunk = (type, service, method, opts = {}) => {
  const { single = false, toast = true, message, after } = opts;
  return createAsyncThunk(type, async (args, { dispatch, rejectWithValue }) => {
    const list = single ? [args] : args === undefined ? [] : Array.isArray(args) ? args : [args];
    const result = await service[method](...list);
    if (result === false) return rejectWithValue(message || `Could not ${method}.`, { toast });
    if (after) await after(dispatch, result, args);
    return result ?? true;
  });
};
