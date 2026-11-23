import { useEffect, useSyncExternalStore } from 'react';

import navLayoutService from '../appwrite/navLayout';

// One shared copy of the `ronakbyali_panel_access` table for the whole app.
// The Sidebar and the AccessGate read it; Settings > Layout & access writes it and calls setPanelRows(),
// so both update at once. status: 'idle' | 'loading' | 'ready' | 'error'
let state = { status: 'idle', rows: [] };
const listeners = new Set();

const emit = (next) => {
  state = next;
  listeners.forEach((fn) => fn());
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getState = () => state;

export async function loadPanelAccess(force = false) {
  if (!force && (state.status === 'loading' || state.status === 'ready')) return;
  emit({ ...state, status: 'loading' });
  const res = await navLayoutService.listRows();
  // if the table cannot be read nothing is hidden or blocked (the app keeps working)
  emit(res.ok
    ? { status: 'ready', rows: res.rows, statusCode: null }
    : { status: 'error', rows: state.rows, message: res.message, statusCode: res.code });
}

export const setPanelRows = (rows) => emit({ status: 'ready', rows, statusCode: null });

export default function usePanelAccess() {
  useEffect(() => {
    loadPanelAccess();
  }, []);
  return useSyncExternalStore(subscribe, getState, getState);
}
