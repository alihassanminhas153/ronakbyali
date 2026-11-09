// USAGE (visitors: customers and guests. Staff get empty lists, they never see alerts)
//   dispatch(fetchAlertBars());                         // announcement bars
//   const bars = useSelector(selectAlertBars);
//   dispatch(fetchAlertPopups());                       // popups still unseen
//   const popup = useSelector(selectCurrentPopup);      // highest priority one, or null
//   dispatch(trackAlertImpression({ alert: popup }));   // once per session
//   dispatch(markAlertSeen({ alert: popup }));          // "Got it": never again (localStorage + Appwrite)
//   dispatch(dismissAlert({ alertId: popup.$id }));     // X / outside click: until the next visit
//   Call fetchAlertBars / fetchAlertPopups again after sign-in or sign-out (userId changes).
//
// USAGE (admin)
//   dispatch(syncExpiredAlerts());                      // writes "expired" on overdue rows
//   dispatch(fetchAlertsPage({ limit: 10, offset: 0, status: 'active', type: '', popup: '' }));
//   dispatch(fetchAllAlerts());                         // for the charts
//   dispatch(createAlert({ data }));
//   dispatch(saveAlert({ alertId, data }));
//   dispatch(setAlertStatus({ alertId, status: 'inactive' }));   // inactive <-> active only
//   dispatch(resetAlertSeen({ alertId }));
//   dispatch(removeAlert({ alertId }));
//   const rows = useSelector(selectAlertRows);
import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import alertService from '../../lib/appwrite/alert';
import { STAFF_ROLES } from '../../lib/appwrite/order';
import { fail, getUserId, stripToast } from './utils';
import { isSessionEnded } from './authSlice';

// No sortComparer: the page keeps the order Appwrite returned (newest / oldest / priority).
const adapter = createEntityAdapter({ selectId: (a) => a.$id });

const initialState = adapter.getInitialState({
  // admin list (one page at a time)
  total: 0,
  status: 'idle',
  error: null,
  // every alert, for the charts
  all: [],
  allStatus: 'idle',
  // admin writes
  saving: false,
  saveError: null,
  // what visitors see
  visitor: { bars: [], popups: [], status: 'idle' },
});

/* ---------- helpers ---------- */

// Staff = admin, support, manager. They never see alerts as a customer does.
const isStaff = (profile) => !!profile?.role && STAFF_ROLES.includes(profile.role);
// Only admins write (Appwrite enforces it with the admin label; this is the friendly check).
const notAdmin = (profile) => profile?.role && profile.role !== 'admin';

const putAll = (state, row) => {
  const i = state.all.findIndex((a) => a.$id === row.$id);
  if (i >= 0) state.all[i] = row;
  else state.all.unshift(row);
};

/* ---------- visitors ---------- */

export const fetchAlertBars = createAsyncThunk('alerts/bars', async (_arg, { getState }) => {
  const profile = getState().auth.profile;
  if (isStaff(profile)) return [];
  return alertService.getActiveAlerts({ userId: getUserId(profile) });
});

export const fetchAlertPopups = createAsyncThunk('alerts/popups', async (_arg, { getState }) => {
  const profile = getState().auth.profile;
  if (isStaff(profile)) return [];
  return alertService.getPopupAlerts({ userId: getUserId(profile) });
});

export const trackAlertImpression = createAsyncThunk('alerts/impression', async (arg, { getState }) => {
  const { alert } = stripToast(arg);
  const profile = getState().auth.profile;
  if (!alert || isStaff(profile)) return false;
  return alertService.trackImpression(alert, getUserId(profile));
});

export const markAlertSeen = createAsyncThunk('alerts/seen', async (arg, { getState }) => {
  const { alert } = stripToast(arg);
  const profile = getState().auth.profile;
  if (!alert || isStaff(profile)) return false;
  return alertService.markSeen({ alert, userId: getUserId(profile) });
});

export const dismissAlert = createAsyncThunk('alerts/dismiss', async (arg) => {
  const alertId = typeof arg === 'string' ? arg : stripToast(arg).alertId;
  alertService.dismiss(alertId);
  return alertId;
});

/* ---------- admin: read ---------- */

export const fetchAlertsPage = createAsyncThunk('alerts/fetchPage', async (arg, { getState, rejectWithValue }) => {
  const { limit = 10, offset = 0, ...filters } = stripToast(arg);
  const profile = getState().auth.profile;
  if (profile?.role && !isStaff(profile)) return rejectWithValue('You do not have access to alerts.');
  const result = await alertService.getAlertsPage({ limit, offset, ...filters });
  if (!result) return fail(rejectWithValue, alertService.lastError || 'Could not load alerts.', arg);
  return { rows: result.rows, total: result.total };
});

export const fetchAllAlerts = createAsyncThunk('alerts/fetchAll', async (arg, { rejectWithValue }) => {
  const rows = await alertService.getAllAlerts();
  if (!rows) return fail(rejectWithValue, alertService.lastError || 'Could not load alerts.', arg);
  return rows;
});

// Returns how many alerts were marked expired.
export const syncExpiredAlerts = createAsyncThunk('alerts/syncExpired', async (_arg, { getState }) => {
  if (notAdmin(getState().auth.profile)) return 0;
  return alertService.expireOverdue();
});

/* ---------- admin: write ---------- */

const writeThunk = (type, call, message) =>
  createAsyncThunk(type, async (arg, { getState, rejectWithValue }) => {
    if (notAdmin(getState().auth.profile)) return rejectWithValue('Only admins can change alerts.');
    const args = stripToast(arg);
    alertService.lastError = null;
    const row = await call(args);
    if (!row) return fail(rejectWithValue, alertService.lastError || message, arg);
    return row;
  });

export const createAlert = writeThunk('alerts/create', ({ data }) => alertService.createAlert(data), 'Could not create the alert.');
export const saveAlert = writeThunk('alerts/save', ({ alertId, data }) => alertService.saveAlert(alertId, data), 'Could not save the alert.');
export const setAlertStatus = writeThunk('alerts/status', ({ alertId, status }) => alertService.setStatus(alertId, status), 'Could not change the status.');
export const resetAlertSeen = writeThunk('alerts/resetSeen', ({ alertId }) => alertService.resetSeen(alertId), 'Could not reset who has seen it.');

export const removeAlert = createAsyncThunk('alerts/remove', async (arg, { getState, rejectWithValue }) => {
  if (notAdmin(getState().auth.profile)) return rejectWithValue('Only admins can delete alerts.');
  const { alertId } = stripToast(arg);
  alertService.lastError = null;
  const ok = await alertService.deleteAlert(alertId);
  if (!ok) return fail(rejectWithValue, alertService.lastError || 'Could not delete the alert.', arg);
  return alertId;
});

const rowWrites = [saveAlert, setAlertStatus, resetAlertSeen];

/* ---------- slice ---------- */

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearAlertError: (state) => {
      state.error = null;
      state.saveError = null;
    },
  },
  // Every addCase comes first. addMatcher must stay last (Redux Toolkit rule).
  extraReducers: (builder) => {
    builder
      // visitors
      .addCase(fetchAlertBars.pending, (state) => {
        state.visitor.status = 'loading';
      })
      .addCase(fetchAlertBars.fulfilled, (state, action) => {
        state.visitor.bars = action.payload;
        state.visitor.status = 'succeeded';
      })
      .addCase(fetchAlertBars.rejected, (state) => {
        state.visitor.status = 'failed';
      })
      .addCase(fetchAlertPopups.fulfilled, (state, action) => {
        state.visitor.popups = action.payload;
      })
      // gone from the screen at once; the saving happens in the background
      .addCase(markAlertSeen.pending, (state, action) => {
        const id = action.meta.arg?.alert?.$id;
        if (!id) return;
        state.visitor.popups = state.visitor.popups.filter((a) => a.$id !== id);
        state.visitor.bars = state.visitor.bars.filter((a) => a.$id !== id);
      })
      .addCase(dismissAlert.fulfilled, (state, action) => {
        state.visitor.popups = state.visitor.popups.filter((a) => a.$id !== action.payload);
        state.visitor.bars = state.visitor.bars.filter((a) => a.$id !== action.payload);
      })

      // admin: lists
      .addCase(fetchAlertsPage.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAlertsPage.fulfilled, (state, action) => {
        adapter.setAll(state, action.payload.rows);
        state.total = action.payload.total;
        state.status = 'succeeded';
      })
      .addCase(fetchAlertsPage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      })
      .addCase(fetchAllAlerts.pending, (state) => {
        state.allStatus = 'loading';
      })
      .addCase(fetchAllAlerts.fulfilled, (state, action) => {
        state.all = action.payload;
        state.allStatus = 'succeeded';
      })
      .addCase(fetchAllAlerts.rejected, (state) => {
        state.allStatus = 'failed';
      })

      // admin: create
      .addCase(createAlert.pending, (state) => {
        state.saving = true;
        state.saveError = null;
      })
      .addCase(createAlert.fulfilled, (state, action) => {
        state.saving = false;
        putAll(state, action.payload);
      })
      .addCase(createAlert.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload || action.error?.message;
      })

      // admin: delete
      .addCase(removeAlert.pending, (state) => {
        state.saving = true;
        state.saveError = null;
      })
      .addCase(removeAlert.fulfilled, (state, action) => {
        state.saving = false;
        if (state.entities[action.payload]) state.total = Math.max(0, state.total - 1);
        adapter.removeOne(state, action.payload);
        state.all = state.all.filter((a) => a.$id !== action.payload);
      })
      .addCase(removeAlert.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload || action.error?.message;
      });

    // admin: edit / status / reset
    rowWrites.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
          state.saveError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.saving = false;
          if (state.entities[action.payload.$id]) adapter.upsertOne(state, action.payload);
          putAll(state, action.payload);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          state.saveError = action.payload || action.error?.message;
        });
    });

    builder.addMatcher(isSessionEnded, () => initialState);
  },
});

export const { clearAlertError } = alertSlice.actions;
export default alertSlice.reducer;

/* ---------- selectors ---------- */

const sel = adapter.getSelectors((s) => s.alerts);

// admin
export const selectAlertRows = sel.selectAll;
export const selectAlertTotal = (s) => s.alerts.total;
export const selectAlertStatus = (s) => s.alerts.status;
export const selectAlertError = (s) => s.alerts.error;
export const selectAllAlerts = (s) => s.alerts.all;
export const selectAllAlertsStatus = (s) => s.alerts.allStatus;
export const selectAlertSaving = (s) => s.alerts.saving;
export const selectAlertSaveError = (s) => s.alerts.saveError;
// one alert, from the current page or from the full list
export const selectAlertById = (id) => (s) =>
  (id && (s.alerts.entities[id] ?? s.alerts.all.find((a) => a.$id === id))) || null;

// visitors
export const selectAlertBars = (s) => s.alerts.visitor.bars;
export const selectAlertPopups = (s) => s.alerts.visitor.popups;
export const selectCurrentPopup = (s) => s.alerts.visitor.popups[0] ?? null;
export const selectVisitorAlertsStatus = (s) => s.alerts.visitor.status;