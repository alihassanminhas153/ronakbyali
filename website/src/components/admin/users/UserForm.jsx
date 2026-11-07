import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  clearUserError,
  selectPendingUserIds,
  selectUserById,
  selectUsersError,
  setUserRole,
} from '../../../store/slices/userSlice';

import ActionButton from '../../../ui/custom/button/ActionButton';
import SelectInput from '../../../ui/custom/input/SelectInput';
import SwitchInput from '../../../ui/custom/input/SwitchInput';
import Modal from '../../../ui/custom/modal/Modal';
import { Avatar, BlockedBadge, ProviderChip, RoleBadge } from './UserBadges';
import UserErrorBanner from './UserErrorBanner';
import {
  ROLE_EDIT_OPTIONS,
  USER_SECTIONS,
  blockLockReason,
  readField,
  roleLockReason,
} from './userFields';

// Detail drawer, same Modal pattern as ProductForm.
//   userId           -> row to show (read live from the store, so the optimistic
//                       block switch and role changes show up immediately)
//   meId             -> the signed-in user, for the self guards
//   onToggleBlocked  -> (user, nextBlocked); the page owns the confirm dialog
// Only role (setUserRole) and isBlocked (setUserBlocked) can be edited; the rest is read-only.
export default function UserForm({ open = true, userId = null, meId = null, onClose, onToggleBlocked }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => (userId ? selectUserById(state, userId) : undefined));
  const pendingIds = useAppSelector(selectPendingUserIds);
  const error = useAppSelector(selectUsersError);

  if (!user) return null;

  const pending = pendingIds.includes(user.$id);
  const blockLock = blockLockReason(user, meId);
  const roleLock = roleLockReason(user, meId);

  const onRole = (role) => {
    if (role && role !== user.role) dispatch(setUserRole({ userId: user.$id, role }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      title={user.name || user.username || 'User'}
      description="User details"
      footer={
        <div className="flex justify-end">
          <ActionButton variant="secondary" onClick={onClose}>
            Close
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-8">
        {error && <UserErrorBanner message={error} onDismiss={() => dispatch(clearUserError())} />}

        <div className="flex items-center gap-4">
          <Avatar user={user} size="size-16 text-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              {user.isBlocked && <BlockedBadge />}
              <ProviderChip provider={user.authProvider} />
            </div>
          </div>
        </div>

        <section>
          <h3 className="mb-3 text-sm font-medium text-text">Access</h3>
          <div className="space-y-3">
            <SelectInput
              label="Role"
              options={ROLE_EDIT_OPTIONS}
              value={user.role || 'new'}
              onChange={onRole}
              disabled={pending || Boolean(roleLock)}
              hint={roleLock || (pending ? 'Saving…' : undefined)}
            />
            <SwitchInput
              label="Blocked"
              description={blockLock || 'A blocked user only sees the blocked page, on every URL.'}
              checked={user.isBlocked === true}
              onChange={(next) => onToggleBlocked?.(user, next)}
              disabled={pending || Boolean(blockLock)}
            />
          </div>
        </section>

        {USER_SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="mb-3 text-sm font-medium text-text">{section.title}</h3>
            <dl className="grid gap-x-6 gap-y-4 rounded-md border border-border bg-bg p-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs text-muted">{field.label}</dt>
                  <dd className="mt-0.5 break-words text-sm text-text">{readField(user, field)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}