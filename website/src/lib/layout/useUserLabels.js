import { useMemo } from 'react';

import { useAppSelector } from '../../store/slices/hooks';
import { selectProfile } from '../../store/slices/authSlice';
import { selectMe } from '../../store/slices/userSlice';
import useSession from '../../router/useSession';

// Every label of the signed-in person: the role column plus the Appwrite Auth labels.
// The array only changes when its content changes, so it is safe in dependency lists.
export default function useUserLabels() {
  const { user } = useSession();
  const profile = useAppSelector(selectProfile);
  const me = useAppSelector(selectMe);

  const key = [user, profile, me]
    .flatMap((source) => [source?.role, ...(Array.isArray(source?.labels) ? source.labels : [])])
    .filter(Boolean)
    .join('|');

  return useMemo(() => [...new Set(key ? key.split('|') : [])], [key]);
}
