import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, X } from 'lucide-react';

import { TYPE_META } from '../admin/alerts/alertMeta';
import { STAFF_ROLES } from '../../lib/appwrite/order';
import { useAppDispatch, useAppSelector } from '../../store/slices/hooks';
import { selectAuthChecked, selectProfile } from '../../store/slices/authSlice';
import {
  dismissAlert,
  fetchAlertPopups,
  markAlertSeen,
  selectAlertPopups,
  trackAlertImpression,
} from '../../store/slices/alertSlice';
import usePageAlerts from './usePageAlerts';
import AppIcon, { resolveAppIconName } from '../../ui/custom/AppIcon';
import { tint, toneVar } from '../../ui/graphs/utils';

const REFRESH_INTERVAL = 60_000;

export default function AlertPopupHost() {
  const dispatch = useAppDispatch();
  const authChecked = useAppSelector(selectAuthChecked);
  const profile = useAppSelector(selectProfile);
  const popups = useAppSelector(selectAlertPopups);
  const popup = usePageAlerts(popups)[0] ?? null;
  const [loadedFor, setLoadedFor] = useState(null);
  const dialogRef = useRef(null);
  const userId = profile?.userId ?? profile?.$id ?? null;
  const userKey = userId || 'guest';
  const isStaff = STAFF_ROLES.includes(profile?.role);

  useEffect(() => {
    let active = true;
    setLoadedFor(null);
    if (!authChecked || isStaff) {
      if (authChecked) setLoadedFor(userKey);
      return () => { active = false; };
    }

    const load = async () => {
      await dispatch(fetchAlertPopups());
      if (active) setLoadedFor(userKey);
    };
    load();
    const interval = window.setInterval(load, REFRESH_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [authChecked, dispatch, isStaff, userKey]);

  const visiblePopup = loadedFor === userKey && !isStaff ? popup : null;

  useEffect(() => {
    if (!visiblePopup) return undefined;
    dispatch(trackAlertImpression({ alert: visiblePopup }));
  }, [dispatch, visiblePopup]);

  const popupId = visiblePopup?.$id;
  const popupEndsAt = visiblePopup?.endsAt;

  useEffect(() => {
    if (!popupId) return undefined;
    const end = popupEndsAt ? new Date(popupEndsAt).getTime() : null;
    if (!end || Number.isNaN(end)) return undefined;
    const timer = window.setTimeout(
      () => {
        dispatch(dismissAlert(popupId));
        dispatch(fetchAlertPopups());
      },
      Math.max(0, end - Date.now() + 20),
    );
    return () => window.clearTimeout(timer);
  }, [dispatch, popupEndsAt, popupId]);

  useEffect(() => {
    if (!popupId) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') dispatch(dismissAlert(popupId));
    };
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [dispatch, popupId]);

  if (!visiblePopup) return null;

  const meta = TYPE_META[visiblePopup.type] || TYPE_META.info;
  const color = toneVar(meta.tone);
  const Icon = meta.icon;
  const link = visiblePopup.link?.trim();
  const isExternal = /^https?:\/\//i.test(link || '');
  const closeForNavigation = () => dispatch(dismissAlert(visiblePopup.$id));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) dispatch(dismissAlert(visiblePopup.$id));
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-alert-title"
        tabIndex={-1}
        className="relative w-full max-w-md animate-rise rounded-xl border border-border bg-surface p-5 shadow-2xl outline-none sm:p-6"
      >
        <button
          type="button"
          onClick={() => dispatch(dismissAlert(visiblePopup.$id))}
          aria-label="Hide this alert on this browser"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X size={17} aria-hidden="true" />
        </button>
        <div className="text-center">
          <span
            className="mx-auto grid size-12 place-items-center rounded-full"
            style={{ background: tint(color, 14), color }}
          >
            <AppIcon name={resolveAppIconName(Icon, 'alert')} tone={meta.tone} className="size-7 object-contain" />
          </span>
          <h2 id="visitor-alert-title" className="heading-sm mt-3 break-words text-text">
            {visiblePopup.title}
          </h2>
          <p className="mt-2 whitespace-pre-line break-words text-sm text-muted">
            {visiblePopup.message}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {link && (isExternal ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeForNavigation}
              className="btn btn-primary gap-1.5"
            >
              Open <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          ) : (
            <Link to={link} onClick={closeForNavigation} className="btn btn-primary gap-1.5">
              Open <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ))}
          <button
            type="button"
            onClick={() => dispatch(markAlertSeen({ alert: visiblePopup }))}
            className={link ? 'btn btn-ghost' : 'btn btn-primary'}
          >
            {visiblePopup.buttonText?.trim() || 'Got it'}
          </button>
        </div>
      </section>
    </div>
  );
}
