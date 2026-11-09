import { X } from 'lucide-react';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { TYPE_META } from './alertMeta';

// How an alert looks to customers. Works with a form or a table row.
//   alert: { type, title, message, popup, link, buttonText }
export default function AlertPreview({ alert }) {
  const meta = TYPE_META[alert.type] || TYPE_META.info;
  const color = toneVar(meta.tone);
  const Icon = meta.icon;
  const title = alert.title?.trim() || 'Alert title';
  const message = alert.message?.trim() || 'Your message appears here.';

  if (alert.popup) {
    return (
      <div className="mx-auto w-full max-w-xs rounded-lg border border-border bg-surface p-5 text-center shadow-soft" style={{ borderTop: `3px solid ${color}` }}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full" style={{ background: tint(color, 14), color }}>
          <Icon size={22} />
        </span>
        <h4 className="heading-sm mt-3 break-words text-text">{title}</h4>
        <p className="mt-1.5 whitespace-pre-line break-words text-xs text-muted">{message}</p>
        <span className="mt-4 inline-block rounded-md px-4 py-2 text-xs font-medium text-white" style={{ background: color }}>
          {alert.buttonText?.trim() || 'Got it'}
        </span>
        {alert.link?.trim() && <p className="mt-2 truncate text-[11px] text-muted">Opens {alert.link.trim()}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5" style={{ background: tint(color, 10), borderLeft: `3px solid ${color}` }}>
      <span className="mt-0.5 shrink-0" style={{ color }}><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-text">{title}</p>
        <p className="whitespace-pre-line break-words text-xs text-muted">{message}</p>
        {alert.link?.trim() && <span className="mt-1 inline-block text-xs font-medium underline" style={{ color }}>Learn more</span>}
      </div>
      <span className="shrink-0 text-muted"><X size={14} /></span>
    </div>
  );
}