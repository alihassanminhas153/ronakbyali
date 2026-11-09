import { useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, Link2Off } from 'lucide-react';

import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import { tint } from '../../../ui/graphs/utils';
import { STATUS_META, fullDate, timeAgo, toneColor } from './orderMeta';

const SHOW = 3;

// Courier-style order tracking: the courier link on top, then the timeline
// (newest first) with a dropdown for the older steps.
//   order   : the order row (orderNumber, trackingId)
//   tracker : { link, updates[] } from the tracker table, or null while loading
// Display only, so the customer's order page can reuse it as it is.
export default function OrderTracker({ order, tracker, loading = false }) {
  const [all, setAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const updates = tracker?.updates || [];
  const shown = all ? updates : updates.slice(0, SHOW);
  const link = tracker?.link || null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  return (
    <div className="space-y-4">
      {/* courier link */}
      {link ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text">Track with the courier</p>
            {order?.trackingId && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                Tracking no. <b className="font-semibold tabular-nums text-text">{order.trackingId}</b>
                <button type="button" onClick={copy} aria-label="Copy tracking number" className="rounded p-1 transition-colors hover:bg-surface-alt hover:text-text">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </p>
            )}
          </div>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost min-h-10 gap-2 px-3.5 py-2 text-sm"
          >
            Open tracking <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm text-muted">
          <Link2Off size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            No courier link yet. Once the parcel is handed to TCS (or another courier), paste its tracking link here.
            Until then the steps below are the only updates.
          </p>
        </div>
      )}

      {/* timeline */}
      {loading && !updates.length ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-surface-alt motion-reduce:animate-none" />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <p className="text-sm text-muted">No updates yet.</p>
      ) : (
        <>
          <ol className="relative">
            {shown.map((u, i) => {
              const color = toneColor(STATUS_META[u.status]?.tone ?? 1);
              const last = i === shown.length - 1;
              return (
                <li key={u.id} className="relative pb-5 pl-8 last:pb-0">
                  {!last && <span aria-hidden="true" className="absolute left-[9px] top-5 h-full w-px bg-border" />}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1 grid size-5 place-items-center rounded-full"
                    style={{ background: tint(color, i === 0 ? 28 : 14) }}
                  >
                    <span className={`size-2.5 rounded-full ${i === 0 ? 'animate-pulse motion-reduce:animate-none' : ''}`} style={{ background: color }} />
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className={`text-sm ${i === 0 ? 'font-semibold text-text' : 'font-medium text-text/90'}`}>{u.title}</p>
                    {u.at && (
                      <Tooltip label={fullDate(u.at)}>
                        <time dateTime={u.at} className="whitespace-nowrap text-xs text-muted">{timeAgo(u.at)}</time>
                      </Tooltip>
                    )}
                  </div>
                  {u.note && <p className="mt-0.5 text-xs text-muted">{u.note}</p>}
                </li>
              );
            })}
          </ol>
          {updates.length > SHOW && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              aria-expanded={all}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
            >
              {all ? 'Show fewer updates' : `Show all ${updates.length} updates`}
              <ChevronDown size={14} className={`transition-transform duration-200 ${all ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
}