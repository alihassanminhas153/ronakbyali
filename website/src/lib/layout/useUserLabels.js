import { useMemo } from 'react';

import { useAppSelector } from '../../store/slices/hooks';
import { selectProfile } from '../../store/slices/authSlice';

// Labels from the signed-in Appwrite Auth account. The users-table role/labels are mirrors only.
// The array only changes when its content changes, so it is safe in dependency lists.
export default function useUserLabels() {
  const profile = useAppSelector(selectProfile);
  const labels = Array.isArray(profile?.labels) ? profile.labels : [];
  const key = [...new Set(labels)].join('|');

  return useMemo(() => [...new Set(key ? key.split('|') : [])], [key]);
}
