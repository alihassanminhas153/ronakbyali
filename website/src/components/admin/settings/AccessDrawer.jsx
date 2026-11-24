import { useEffect, useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { selectPendingUserIds, setUserAccess } from '../../../store/slices/userSlice';
import labelService from '../../../lib/appwrite/labels';
import AdminSearchSelect from '../AdminSearchSelect';
import TagInput from '../../../ui/custom/input/TagInput';
import ActionButton from '../../../ui/custom/button/ActionButton';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import { Avatar, Banner, Chip, Portal, RoleChip, SlideDrawer } from './SettingsParts';
import { MAX_EXTRA_LABELS, ROLE_OPTIONS, STAFF_ROLES, buildLabels, labelsError, splitLabels } from './settingsMeta';

// Role + labels for one user. One save updates Appwrite Auth AND the users table.
export default function AccessDrawer({ open, user, locked, onClose }) {
  const dispatch = useAppDispatch();
  const pending = useAppSelector(selectPendingUserIds).includes(user?.$id);

  const [current, setCurrent] = useState(null); // live labels from Auth
  const [role, setRole] = useState('new');
  const [extras, setExtras] = useState([]);
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // every time the drawer opens, read the TRUE labels from Auth (the table copy can drift)
  useEffect(() => {
    if (!open || !user) return undefined;
    let live = true;
    setCurrent(null);
    setLoadFailed(false);
    setResult(null);
    setNote('');
    setRole(user.role || 'new');
    setExtras(splitLabels(user.labels || []).extras);
    // If the labels service has no getAccess method (or the call fails) the drawer must not crash, and it must
    // not offer Save: with unknown live labels a save could remove labels the user really has.
    const read =
      typeof labelService?.getAccess === 'function'
        ? Promise.resolve(labelService.getAccess({ userId: user.$id })).catch((e) => ({ ok: false, message: e?.message || 'Request failed.' }))
        : Promise.resolve({ ok: false, message: 'lib/appwrite/labels.js has no getAccess method' });
    read.then((res) => {
      if (!live) return;
      if (res?.ok) {
        const labels = res.labels || [];
        const liveStaffRole = splitLabels(labels).staff;
        const tableRole = STAFF_ROLES.includes(user.role) ? 'new' : user.role || 'new';
        setRole(liveStaffRole || tableRole);
        setCurrent(labels);
        setExtras(splitLabels(labels).extras);
        setNote('');
      } else {
        setLoadFailed(true);
        setNote(`Could not read the live labels (${res?.message || 'unknown error'}). Saving is turned off so no label is removed by mistake.`);
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.$id]);

  const next = useMemo(() => buildLabels(role, extras), [role, extras]);
  const added = current ? next.filter((l) => !current.includes(l)) : [];
  const removed = current ? current.filter((l) => !next.includes(l)) : [];
  const liveRole = current
    ? splitLabels(current).staff || (STAFF_ROLES.includes(user?.role) ? 'new' : user?.role || 'new')
    : user?.role || 'new';
  const roleChanged = user && current !== null ? role !== liveRole : false;
  const dirty = roleChanged || added.length > 0 || removed.length > 0;
  const tagError = labelsError(extras);
  const grantsAdmin = added.includes('admin');
  const removesAdmin = removed.includes('admin');
  const disabled = locked || pending || current === null;

  const save = async () => {
    const action = await dispatch(setUserAccess({ userId: user.$id, role, labels: extras }));
    setConfirmOpen(false);
    if (setUserAccess.fulfilled.match(action)) {
      setCurrent(action.payload.labels || next);
      setResult({ kind: 'success', text: 'Saved. Appwrite labels and the role column now match.' });
    } else {
      setResult({ kind: 'error', text: action.payload || 'Could not save.' });
    }
  };

  const message = grantsAdmin
    ? 'This gives the user the admin label: full read and write access to every profile. Only continue if you trust them.'
    : removesAdmin
      ? 'This removes admin access from the user.'
      : 'Their Appwrite labels and the role column will be updated together.';

  return (
    <>
    <SlideDrawer
      open={open}
      title="Role and labels"
      subtitle={user?.email}
      onClose={onClose}
      busy={pending}
      footer={
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
          <ActionButton variant="secondary" onClick={onClose} disabled={pending}>Close</ActionButton>
          <ActionButton variant="primary" onClick={() => setConfirmOpen(true)} disabled={!dirty || Boolean(tagError) || disabled} loading={pending}>
            Save changes
          </ActionButton>
        </div>
      }
    >
      {user && (
        <div className="w-full min-w-0 space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2.5 border-b border-border pb-3 sm:gap-3 sm:pb-4">
            <Avatar user={user} size="size-10 text-xs sm:size-12 sm:text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{user.name || user.username}</p>
              <p className="truncate text-xs text-muted">@{user.username || '—'}</p>
            </div>
            <span className="shrink-0"><RoleChip role={current ? liveRole : user.role} /></span>
          </div>

          {locked && <Banner kind="error">You cannot change your own access. Ask another admin.</Banner>}
          {note && <div className="min-w-0 break-words"><Banner kind="error">{note}</Banner></div>}
          {result && <Banner kind={result.kind} onDismiss={() => setResult(null)}>{result.text}</Banner>}

          <div className="min-w-0">
            <AdminSearchSelect
              className="min-w-0 w-full"
              label="Role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(v) => v && setRole(v)}
              disabled={disabled}
              hint="Admin, Support and Manager also become Appwrite labels."
            />
          </div>

          <div className="min-w-0 [&_*]:max-w-full">
            <TagInput
              label="Extra labels"
              value={extras}
              onChange={setExtras}
              max={MAX_EXTRA_LABELS}
              maxLength={36}
              placeholder="e.g. vip, wholesale"
              disabled={disabled}
              error={tagError}
              hint="Letters and numbers only. Press Enter to add."
            />
          </div>

          <div className="min-w-0 border-t border-border pt-3 text-[13px] sm:pt-4 sm:text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">What will change</p>
            {current === null ? (
              <p className="text-muted">{loadFailed ? 'Live labels are unavailable.' : 'Reading current labels…'}</p>
            ) : (
              <dl className="min-w-0 space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-x-3">
                  <dt className="shrink-0 text-muted sm:w-16">Role</dt>
                  <dd className="min-w-0 break-words text-text">
                    {roleChanged ? (
                      <>{liveRole} → <span className="font-medium">{role}</span></>
                    ) : (
                      <span className="text-muted">No change</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-x-3">
                  <dt className="shrink-0 text-muted sm:w-16">Labels</dt>
                  <dd className="flex min-w-0 flex-wrap gap-1.5 break-all">
                    {next.length === 0 && removed.length === 0 && <span className="text-muted">No labels</span>}
                    {next.map((l) => <Chip key={l} tone={added.includes(l) ? 'add' : 'plain'}>{l}</Chip>)}
                    {removed.map((l) => <Chip key={`r-${l}`} tone="remove">{l}</Chip>)}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      )}

    </SlideDrawer>

    <Portal>
      <ConfirmDialog
        open={confirmOpen}
        title="Apply these changes?"
        message={message}
        confirmLabel="Apply"
        danger={grantsAdmin || removesAdmin}
        busy={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={save}
      />
    </Portal>
    </>
  );
}