import { useMemo } from 'react';

import { paidAmountForOrder } from '../../../lib/orderMath';
import { ORDER_STATUS } from '../../../lib/appwrite/order';
import { BarChart, ChartCard, Donut, HeatmapCalendar, Histogram, TrendGraph, compact, countByDay } from '../../../ui/graphs';
import { colorFor } from '../../../ui/graphs/utils';
import ActionButton from '../../../ui/custom/button/ActionButton';
import AppIcon from '../../../ui/custom/AppIcon';
import { METHOD_LABEL, STATUS_META, toneColor } from './orderMeta';

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const shortMoney = (value) => `Rs ${compact(value)}`;

function salesByMonth(orders) {
  const months = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      key: monthKey(date),
      label: date.toLocaleString('en', { month: 'short' }),
      value: 0,
    });
  }
  const index = new Map(months.map((month) => [month.key, month]));

  orders.forEach((order) => {
    const date = new Date(order.$createdAt);
    if (Number.isNaN(date.getTime())) return;
    const month = index.get(monthKey(date));
    if (month) month.value += paidAmountForOrder(order);
  });
  return months;
}

export default function OrderAnalytics({ orders = [], status, error, onRetry }) {
  const insights = useMemo(() => {
    const statusCounts = new Map(ORDER_STATUS.map((value) => [value, 0]));
    const paidOrders = [];
    orders.forEach((order) => {
      statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
      if (paidAmountForOrder(order) > 0) paidOrders.push(order);
    });

    const statusMix = ORDER_STATUS
      .map((value) => ({
        label: STATUS_META[value].label,
        value: statusCounts.get(value) || 0,
        color: toneColor(STATUS_META[value].tone),
      }))
      .filter((item) => item.value > 0);

    const methodRevenue = new Map();
    paidOrders.forEach((order) => {
      const method = METHOD_LABEL[order.paymentMethod] || 'Not specified';
      methodRevenue.set(method, (methodRevenue.get(method) || 0) + paidAmountForOrder(order));
    });
    const revenueByMethod = [...methodRevenue.entries()]
      .map(([label, value]) => ({ label, value, color: colorFor(label) }))
      .sort((a, b) => b.value - a.value);

    return {
      activity: countByDay(orders),
      monthlySales: salesByMonth(orders),
      statusMix,
      revenueByMethod,
      paidAmounts: paidOrders.map(paidAmountForOrder),
    };
  }, [orders]);

  if (status === 'loading' && !orders.length) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5 text-sm text-muted shadow-soft">
        <AppIcon name="graph" tone={1} className="size-8 shrink-0 object-contain" />
        Loading order insights…
      </div>
    );
  }

  if (status === 'failed' && !orders.length) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/40 bg-error/10 p-4 text-sm text-error">
        <span>{error || 'Could not load order insights.'}</span>
        <ActionButton variant="secondary" onClick={onRetry}>Retry insights</ActionButton>
      </div>
    );
  }

  return (
    <section aria-label="Order and sales insights" className="space-y-3">
      {status === 'failed' && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <span>{error || 'Could not refresh order insights. Showing the last loaded data.'}</span>
          <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}
      {status === 'loading' && orders.length > 0 && (
        <p role="status" className="text-right text-xs text-muted">Refreshing order insights…</p>
      )}
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartCard title="Order activity" subtitle="Orders placed daily, last 26 weeks" appIcon="calendar" tone={2}>
          <HeatmapCalendar data={insights.activity} weeks={26} label="orders" />
        </ChartCard>
        <ChartCard title="Sales trend" subtitle="Paid and partially paid orders by month" appIcon="graph" tone={7}>
          <TrendGraph data={insights.monthlySales} format={shortMoney} color="var(--accent-tone-7)" empty="No sales recorded in this period." />
        </ChartCard>
        <ChartCard title="Orders by status" subtitle="Status categories, last 26 weeks" appIcon="donut_chart" tone={5}>
          <Donut data={insights.statusMix} centerLabel="orders" format={(value) => compact(value)} empty="No orders in this period." />
        </ChartCard>
        <ChartCard title="Sales by payment method" subtitle="Amount received, last 26 weeks" appIcon="coins" tone={3}>
          <BarChart data={insights.revenueByMethod} format={shortMoney} empty="No payments recorded in this period." />
        </ChartCard>
        <ChartCard title="Paid order values" subtitle="Distribution per paid or partially paid order (Rs)" appIcon="histogram" tone={4} className="xl:col-span-2">
          <Histogram values={insights.paidAmounts} bins={6} format={shortMoney} empty="No paid orders to group yet." />
        </ChartCard>
      </div>
    </section>
  );
}
