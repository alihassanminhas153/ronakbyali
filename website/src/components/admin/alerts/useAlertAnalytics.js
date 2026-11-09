import { useMemo } from 'react';
import { alertState } from '../../../lib/appwrite/alert';
import { countByDay, groupBy, monthlySeries, toneVar } from '../../../ui/graphs/utils';
import { STATE_META, TYPE_META } from './alertMeta';

// rows: every alert. Returns everything the charts need.
export default function useAlertAnalytics(rows = []) {
  return useMemo(() => {
    const states = rows.map((r) => alertState(r));
    const count = (s) => states.filter((x) => x === s).length;
    const impressions = rows.reduce((sum, r) => sum + (Number(r.impressions) || 0), 0);
    const seen = rows.reduce((sum, r) => sum + (Number(r.seenCount) || 0), 0);

    const byState = groupBy(rows, (r) => alertState(r)).map((d) => ({
      label: STATE_META[d.label].label,
      value: d.value,
      color: toneVar(STATE_META[d.label].tone),
    }));
    const byType = groupBy(rows, (r) => r.type).map((d) => ({
      label: (TYPE_META[d.label] || TYPE_META.info).label,
      value: d.value,
      color: toneVar((TYPE_META[d.label] || TYPE_META.info).tone),
    }));
    const top = [...rows]
      .filter((r) => Number(r.impressions) > 0)
      .sort((a, b) => (Number(b.impressions) || 0) - (Number(a.impressions) || 0))
      .slice(0, 6)
      .map((r) => ({
        label: r.title,
        value: Number(r.impressions) || 0,
        hint: r.popup ? `${Math.min(100, Math.round(((Number(r.seenCount) || 0) / (Number(r.impressions) || 1)) * 100))}% confirmed` : 'bar',
        color: toneVar((TYPE_META[r.type] || TYPE_META.info).tone),
      }));

    const now = Date.now();
    const ending = rows
      .filter((r) => alertState(r) !== 'expired' && r.endsAt && new Date(r.endsAt).getTime() > now)
      .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))
      .slice(0, 5);
    const rates = rows
      .filter((r) => r.popup && Number(r.impressions) > 0)
      .map((r) => ({
        label: r.title,
        value: Math.min(100, Math.round(((Number(r.seenCount) || 0) / Number(r.impressions)) * 100)),
        hint: `${Number(r.seenCount) || 0}/${Number(r.impressions)}`,
        color: toneVar((TYPE_META[r.type] || TYPE_META.info).tone),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      ending,
      rates,
      total: rows.length,
      live: count('active'),
      scheduled: count('scheduled'),
      inactive: count('inactive'),
      expired: count('expired'),
      popups: rows.filter((r) => r.popup).length,
      bars: rows.filter((r) => !r.popup).length,
      impressions,
      seen,
      confirmRate: impressions ? Math.min(100, Math.round((seen / impressions) * 100)) : 0,
      byState,
      byType,
      top,
      monthly: monthlySeries(rows),
      heat: countByDay(rows),
      priorities: rows.map((r) => Number(r.priority) || 0),
    };
  }, [rows]);
}