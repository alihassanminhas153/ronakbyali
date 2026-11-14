import { useEffect, useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { selectPendingUserIds, setUserAccess } from '../../../store/slices/userSlice';
import labelService from '../../../lib/appwrite/labels';
import SelectInput from '../../../ui/custom/input/SelectInput';
import TagInput from '../../../ui/custom/input/TagInput';
import ActionButton from '../../../ui/custom/button/ActionButton';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import { Avatar, Banner, Chip, Portal, RoleChip, SlideDrawer } from './SettingsParts';
import { MAX_EXTRA_LABELS, ROLE_OPTIONS, buildLabels, labelsError, splitLabels } from './settingsMeta';

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

  // every time the drawer opens, read the TRUE labels from Auth (the table copy can drift)
  useEffect(() => {
    if (!open || !user) return undefined;
    let live = true;
    setCurrent(null);
    setResult(null);
    setNote('');
    setRole(user.role || 'new');
    setExtras(splitLabels(user.labels || []).extras);
    labelService.getAccess({ userId: user.$id }).then((res) => {
      if (!live) return;
      const labels = res.ok ? res.labels : user.labels || [];
      setCurrent(labels);
      setExtras(splitLabels(labels).extras);
      setNote(res.ok ? '' : `Could not read live labels (${res.message}). Showing the saved copy.`);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.$id]);

  const next = useMemo(() => buildLabels(role, extras), [role, extras]);
  const added = current ? next.filter((l) => !current.includes(l)) : [];
  const removed = current ? current.filter((l) => !next.includes(l)) : [];
  const roleChanged = user ? role !== (user.role || 'new') : false;
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
        <>
          <ActionButton variant="secondary" onClick={onClose} disabled={pending}>Close</ActionButton>
          <ActionButton variant="primary" onClick={() => setConfirmOpen(true)} disabled={!dirty || Boolean(tagError) || disabled} loading={pending}>
            Save changes
          </ActionButton>
        </>
      }
    >
      {user && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Avatar user={user} size="size-12 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{user.name || user.username}</p>
              <p className="truncate text-xs text-muted">@{user.username || '—'}</p>
            </div>
            <RoleChip role={user.role} />
          </div>

          {locked && <Banner kind="error">You cannot change your own access. Ask another admin.</Banner>}
          {note && <Banner kind="error">{note}</Banner>}
          {result && <Banner kind={result.kind} onDismiss={() => setResult(null)}>{result.text}</Banner>}

          <SelectInput
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(v) => v && setRole(v)}
            disabled={disabled}
            hint="Admin, Support and Manager also become Appwrite labels."
          />

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

          <div className="border-t border-border pt-4 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">What will change</p>
            {current === null ? (
              <p className="text-muted">Reading current labels…</p>
            ) : (
              <dl className="space-y-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <dt className="w-16 text-muted">Role</dt>
                  <dd className="text-text">
                    {roleChanged ? (
                      <>{user.role || 'new'} → <span className="font-medium">{role}</span></>
                    ) : (
                      <span className="text-muted">No change</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <dt className="w-16 text-muted">Labels</dt>
                  <dd className="flex flex-wrap gap-1.5">
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