import { Activity, BarChart3, Bell, CalendarClock, CalendarDays, CheckCheck, Eye, Layers, Megaphone, PieChart, TrendingUp } from 'lucide-react';
import { BarChart, ChartCard, Donut, HeatmapCalendar, Histogram, StatTile, TrendGraph } from '../../../ui/graphs';
import { describeSchedule } from './alertMeta';
import useAlertAnalytics from './useAlertAnalytics';

// Every component takes `rows`: every alert (not just the current page).

// Under the list on the Alerts tab.
export function CreationCharts({ rows }) {
  const a = useAlertAnalytics(rows);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Created per month" subtitle="Last 6 months" icon={TrendingUp} tone={1}>
        <TrendGraph data={a.monthly} empty="Create an alert to see the trend." />
      </ChartCard>
      <ChartCard title="Creation activity" subtitle="Alerts created per day" icon={CalendarDays} tone={4} delay={60}>
        <HeatmapCalendar data={a.heat} label="alerts" />
      </ChartCard>
    </div>
  );
}

export function StatusTab({ rows }) {
  const a = useAlertAnalytics(rows);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Live now" value={a.live} icon={Activity} tone={2} delay={0} />
        <StatTile label="Scheduled" value={a.scheduled} hint="start later" icon={CalendarClock} tone={5} delay={50} />
        <StatTile label="Inactive" value={a.inactive} hint="turned off" icon={Bell} tone={3} delay={100} />
        <StatTile label="Expired" value={a.expired} hint="read-only" icon={Layers} tone={4} delay={150} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By status" subtitle={`${a.total} alerts in total`} icon={PieChart} tone={2}>
          <Donut data={a.byState} centerLabel="alerts" empty="No alerts yet." />
        </ChartCard>
        <ChartCard title="Ending soon" subtitle="Next alerts to expire" icon={CalendarClock} tone={3} delay={60}>
          {a.ending.length ? (
            <ul className="space-y-2">
              {a.ending.map((r) => (
                <li key={r.$id} className="flex items-center justify-between gap-3 rounded-md bg-surface-alt/60 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-text">{r.title}</span>
                  <span className="shrink-0 text-xs text-muted">{describeSchedule(r)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid h-32 place-items-center rounded-md border border-dashed border-border text-xs text-muted">No alerts have an end time.</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export function TypesTab({ rows }) {
  const a = useAlertAnalytics(rows);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="By type" subtitle="What you announce most" icon={Layers} tone={6}>
        <Donut data={a.byType} centerLabel="alerts" empty="No alerts yet." />
      </ChartCard>
      <ChartCard title="Popups and bars" subtitle="How alerts are shown" icon={Megaphone} tone={5} delay={60}>
        <BarChart
          orientation="vertical"
          height={170}
          data={[
            { label: 'Popups', value: a.popups, color: 'var(--graph-5)' },
            { label: 'Bars', value: a.bars, color: 'var(--graph-1)' },
          ]}
          empty="No alerts yet."
        />
      </ChartCard>
      <ChartCard title="Priority spread" subtitle="How alerts are ranked" icon={BarChart3} tone={3} className="lg:col-span-2">
        <Histogram values={a.priorities} bins={6} height={160} empty="No alerts yet." />
      </ChartCard>
    </div>
  );
}

export function ReachTab({ rows }) {
  const a = useAlertAnalytics(rows);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Views" value={a.impressions} hint="signed-in visitors" icon={Eye} tone={5} delay={0} />
        <StatTile label="Confirmed" value={a.seen} hint="pressed the button" icon={CheckCheck} tone={2} delay={50} />
        <StatTile label="Confirm rate" value={a.confirmRate} format={(n) => `${Math.round(n)}%`} icon={Activity} tone={3} delay={100} />
        <StatTile label="Popups" value={a.popups} hint={`${a.bars} bars`} icon={Megaphone} tone={6} delay={150} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Most viewed" subtitle="Views per alert" icon={BarChart3} tone={5}>
          <BarChart data={a.top} empty="Views show up once visitors see an alert." />
        </ChartCard>
        <ChartCard title="Popups confirmed" subtitle="Share who pressed the button" icon={CheckCheck} tone={2} delay={60}>
          <BarChart data={a.rates} format={(n) => `${n}%`} empty="No popup has been viewed yet." />
        </ChartCard>
      </div>
    </div>
  );
}