import { useCallback, useEffect, useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { selectProfile } from '../../../store/slices/authSlice';
import { selectMe } from '../../../store/slices/userSlice';
import userService, { isStaffRole } from '../../../lib/appwrite/user';
import { dashboardHome, PATHS } from '../../../router/path';
import {
  fetchAlertBars,
  fetchAlertNotifications,
  selectAlertBars,
  selectAlertNotifications,
  selectAlertNotificationsStatus,
  trackAlertImpression,
} from '../../../store/slices/alertSlice';
import useSeenAlerts from './useSeenAlerts';
import usePageAlerts from '../usePageAlerts';

export const alertTitle = (alert) => alert.title ?? alert.subject ?? 'Alert';
export const alertText = (alert) => alert.message ?? alert.body ?? alert.description ?? '';

const userName = (user) => user?.name ?? user?.fullName ?? user?.email ?? '';

export default function useHeaderData({ showOffers = false } = {}) {
  const dispatch = useAppDispatch();
  const authProfile = useAppSelector(selectProfile);
  const user = useAppSelector(selectMe);
  const bars = useAppSelector(selectAlertBars);
  const list = useAppSelector(selectAlertNotifications);
  const pageBars = usePageAlerts(bars);
  const visibleBar = pageBars[0] ?? null;
  const pageAlerts = usePageAlerts(list);
  const alertsStatus = useAppSelector(selectAlertNotificationsStatus);
  const userId = authProfile?.userId ?? authProfile?.$id ?? user?.$id ?? null;
  const { seen, markSeen } = useSeenAlerts(userId);
  const username = user?.username ?? authProfile?.username ?? '';
  const isStaff = isStaffRole(user?.role ?? authProfile?.role);
  const cartPath = username && !isStaff ? PATHS.user.cart(username) : null;
  const alertPath = username
    ? isStaff
      ? PATHS.admin.alerts(username)
      : PATHS.user.alerts(username)
    : PATHS.signin;
  const accountPath = username ? dashboardHome(username, isStaff) : PATHS.signin;
  const avatar = user?.avatarFileId ? userService.getAvatarUrl({ fileId: user.avatarFileId }) : '';

  // Offer bars are fetched only by product pages; personal notifications remain available
  // wherever the shared header is rendered.
  const refresh = useCallback(() => {
    if (showOffers) dispatch(fetchAlertBars());
    if (userId) {
      dispatch(fetchAlertNotifications());
    }
  }, [dispatch, showOffers, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (showOffers && visibleBar) {
      dispatch(trackAlertImpression({ alert: visibleBar }));
    }
  }, [dispatch, showOffers, visibleBar]);

  const alerts = useMemo(
    () =>
      [...(Array.isArray(pageAlerts) ? pageAlerts : [])].sort(
        (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime(),
      ),
    [pageAlerts],
  );

  const isUnread = useCallback((alert) => !seen.includes(alert.$id), [seen]);
  const unreadCount = alerts.filter(isUnread).length;
  const markAllSeen = useCallback(() => markSeen(alerts.map((alert) => alert.$id)), [alerts, markSeen]);

  return {
    signedIn: Boolean(userId),
    name: userName(user) || userName(authProfile),
    avatar,
    accountPath,
    alertPath,
    cartPath,
    bars: visibleBar ? [visibleBar] : [],
    alerts,
    alertsStatus,
    unreadCount,
    isUnread,
    markSeen,
    markAllSeen,
    refresh,
  };
}