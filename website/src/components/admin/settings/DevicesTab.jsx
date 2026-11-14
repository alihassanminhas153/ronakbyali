import { useCallback, useEffect, useState } from 'react';

import { useAppDispatch } from '../../../store/slices/hooks';
import { logoutAll } from '../../../store/slices/authSlice';
import authService from '../../../lib/appwrite/auth';
import ActionButton from '../../../ui/custom/button/ActionButton';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import { Banner, Chip, Ico, Portal, smallButton } from './SettingsParts';
import { fmtDate } from './settingsMeta';

// Where this account is signed in, as one table.
export default function DevicesTab() {
  const dispatch = useAppDispatch();
  const [sessions, setSessions] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    const list = await authService.listSessions();
    if (list === false) setError('Could not load your devices.');
    setSessions(list || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (sessionId) => {
    setBusyId(sessionId);
    setError('');
    const ok = await authService.deleteSession({ sessionId });
    setBusyId(null);
    if (!ok) return setError('Could not log that device out.');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-accent-soft via-surface to-surface-alt p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Security</p>
            <h3 className="mt-1 text-lg font-semibold text-text">Active sessions</h3>
          </div>
          <ActionButton variant="secondary" size="sm" onClick={() => setConfirmAll(true)}>Log out everywhere</ActionButton>
        </div>
        <p className="mt-2 text-sm text-muted">Devices where your account is currently signed in.</p>
      </div>
      {error && <Banner kind="error" onDismiss={() => setError('')}>{error}</Banner>}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-alt/60 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                <th scope="col" className="px-3 py-2 sm:px-4">Device</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell sm:px-4">Location</th>
                <th scope="col" className="hidden px-3 py-2 md:table-cell md:px-4">Signed in</th>
                <th scope="col" className="px-3 py-2 text-right sm:px-4"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {sessions === null && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
              )}
              {sessions?.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No devices found.</td></tr>
              )}
              {(sessions || []).map((s) => (
                <tr key={s.$id} className="border-t border-border">
                  <td className="px-3 py-3 sm:px-4">
                    <span className="flex items-center gap-3">
                      <Ico name="wrist_watch" className="size-8" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text">
                          {[s.clientName, s.osName].filter(Boolean).join(' on ') || s.deviceName || 'Unknown device'}
                        </span>
                        <span className="block truncate text-xs text-muted sm:hidden">{[s.countryName, fmtDate(s.$createdAt)].filter(Boolean).join(' · ')}</span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-muted sm:table-cell sm:px-4">{[s.countryName, s.ip].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="hidden px-3 py-3 text-muted md:table-cell md:px-4">{fmtDate(s.$createdAt)}</td>
                  <td className="px-3 py-3 text-right sm:px-4">
                    {s.current ? (
                      <Chip tone="add">This device</Chip>
                    ) : (
                      <button type="button" onClick={() => revoke(s.$id)} disabled={busyId === s.$id} className={smallButton}>
                        {busyId === s.$id ? 'Working…' : 'Log out'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Portal>
      <ConfirmDialog
        open={confirmAll}
        title="Log out of all devices?"
        message="You will be signed out here too and need to log in again."
        confirmLabel="Log out everywhere"
        danger
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => dispatch(logoutAll())}
      />
      </Portal>
    </div>
  );
}


/*

redesign the settings page like all the other pages in the admin pannel like using the icons and the hue roationa and also the profile should look like modern and the inputs like the enum and such types should be treated and edited by the ui components like buttons and the inputs, use all of these and make the look better of that page also as you can now creatly see the label handeling so in the user tab where i can edit the user label or the role when i edit the role of the user i should update or assign it a label as i am assigning it from the settings page also one more thing to do like in the user form where i only can change the like the admin only can change the role (col and the label of the appwrite) and the isBlocked so expect these two things make every use data like the readonly and don't show these details in the inputs show them in modern form without seprating in differetn cutted sections display them in a modern way and show these all the detials at one place in the form the image should be of bigger in size and when clicked option to see it like in bigger size in the popup or whatever the styling you can do before the order talbe show the complete bar like having the lable text and the icon where for now you are only showing the icons also one more thing like in the order table in the overview page where you are showing the orders with the donut chart show only the most recent 4 orders and then a button to see all and display the number of total orders having the state pending (like the pending state will represent the new ones) also in the both pannels like the user pannel and the admin pannel remove the lables links at the bottom of the over viwe page like the links of all the pages remove them all also one more thing in teh app like when i navigate from one page to another first i redirect to that page and after the page is beign load i see the loading for a sec or more and then the loading removes and i see the page also when i moves to the account creation pages like the signup and signin for a little moment i see a black page having only the link of the home page and the text of the link is : "store", so now analyze the app and now give me the correct app add the theme toggle in the settings and in the side bar and also one more thing like use the context written for theme changing like in all over the app

*/