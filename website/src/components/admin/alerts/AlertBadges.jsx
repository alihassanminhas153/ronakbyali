import { Layers, PanelTop } from 'lucide-react';
import { alertState } from '../../../lib/appwrite/alert';
import { entityColorStep } from '../../../lib/entityColors';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { STATE_META, TYPE_META } from './alertMeta';

function Pill({ color, icon: Icon, children, dot = false }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: tint(color, 14), color }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {Icon && <Icon size={13} />}
      {children}
    </span>
  );
}

export function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.info;
  return <Pill color={toneVar(meta.tone)} icon={meta.icon}>{meta.label}</Pill>;
}

// Shows the real state (an overdue alert reads "Expired" even before the row is updated).
export function StateBadge({ alert }) {
  const meta = STATE_META[alertState(alert)] || STATE_META.inactive;
  return <Pill color={toneVar(meta.tone)} dot>{meta.label}</Pill>;
}

export function DisplayBadge({ popup }) {
  return popup ? (
    <Pill color={toneVar(entityColorStep('alertDisplay', 'popup'))} icon={Layers}>Popup</Pill>
  ) : (
    <Pill color={toneVar(entityColorStep('alertDisplay', 'bar'))} icon={PanelTop}>Bar</Pill>
  );
}