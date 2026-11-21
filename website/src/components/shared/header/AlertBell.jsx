import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell, CheckCheck } from 'lucide-react';

import { alertText, alertTitle } from './useHeaderData';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function timeAgo(value) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const seconds = Math.round((time - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs >= 7 * 86400) return new Date(time).toLocaleDateString('en', { day: 'numeric', month: 'short' });
  for (const [unit, size] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'Just now';
}

function AlertGroup({ title, alerts, unread, open, onOpen }) {
  if (alerts.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title} · {alerts.length}
      </h3>
      <ul className="divide-y divide-border">
        {alerts.map((alert) => (
          <li key={alert.$id}>
            <button
              type="button"
              onClick={() => onOpen(alert)}
              tabIndex={open ? 0 : -1}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-border/40 motion-reduce:transition-none ${
                unread ? 'bg-accent/5' : ''
              } ${FOCUS}`}
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-transparent'}`}
              />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${unread ? 'font-semibold text-text' : 'text-muted'}`}>
                  {alertTitle(alert)}
                </span>
                {alertText(alert) && (
                  <span className="mt-0.5 line-clamp-2 block break-words text-sm text-muted">{alertText(alert)}</span>
                )}
                <span className="mt-1 block text-xs text-muted">{timeAgo(alert.$createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AlertBell({ data }) {
  const { alerts, alertsStatus, unreadCount, isUnread, markSeen, markAllSeen, refresh, alertPath } = data;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) refresh();
    setOpen(!open);
  };

  const openAlert = (alert) => {
    markSeen(alert.$id);
    setOpen(false);
    navigate(`${alertPath}?alert=${encodeURIComponent(alert.$id)}`);
  };

  // Every alert is listed: new ones first, then the ones already read.
  const newAlerts = alerts.filter(isUnread);
  const earlierAlerts = alerts.filter((alert) => !isUnread(alert));
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div ref={rootRef} className="sm:relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="alert-popup"
        aria-label={unreadCount > 0 ? `Alerts, ${unreadCount} unread` : 'Alerts'}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full text-text transition-colors duration-200 hover:bg-border/40 motion-reduce:transition-none ${FOCUS} ${
          open ? 'bg-border/40' : ''
        }`}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-surface">
            {badge}
          </span>
        )}
      </button>

      {/* Fixed size: the panel never grows or shrinks with the number of alerts. */}
      <div
        id="alert-popup"
        role="region"
        aria-label="Recent alerts"
        className={`fixed inset-x-3 top-[4.25rem] z-50 flex h-[min(30rem,calc(100dvh_-_6rem))] origin-top-right flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 ${
          open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-1 scale-95 opacity-0'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-text">Alerts</h2>
            <p className="text-xs text-muted">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllSeen}
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-accent transition-colors duration-200 hover:bg-accent/10 motion-reduce:transition-none ${FOCUS}`}
            >
              <CheckCheck size={16} aria-hidden="true" />
              Mark all as read
            </button>
          )}
        </div>

        {/* The only part that scrolls. thin-scroll = themed slim scrollbar from index.css;
            show-scrollbar = opts out of the app-wide "hide all scrollbars" rule. */}
        <div className="thin-scroll show-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain text-text">
          {alerts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <Bell size={24} className="text-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-text">
                {alertsStatus === 'loading' ? 'Loading alerts…' : alertsStatus === 'failed' ? 'Could not load alerts' : 'No alerts yet'}
              </p>
              <p className="text-sm text-muted">
                {alertsStatus === 'failed'
                  ? 'Please try opening the notification panel again.'
                  : 'Updates about your orders and the store will appear here.'}
              </p>
            </div>
          ) : (
            <>
              <AlertGroup title="New" alerts={newAlerts} unread open={open} onOpen={openAlert} />
              <AlertGroup title="Earlier" alerts={earlierAlerts} unread={false} open={open} onOpen={openAlert} />
            </>
          )}
        </div>

        <Link
          to={alertPath}
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          className={`block shrink-0 border-t border-border px-4 py-3 text-center text-sm font-medium text-text transition-colors duration-200 hover:bg-border/40 motion-reduce:transition-none ${FOCUS}`}
        >
          View all alerts
        </Link>
      </div>
    </div>
  );
}