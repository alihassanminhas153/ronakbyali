import {
  Boxes, CalendarDays, Flame, LineChart, PackageCheck, PackageX, PieChart, Percent,
  ShoppingBag, Tag, TrendingUp, Trophy, TriangleAlert, Wallet, BarChart3, Layers, Coins,
} from 'lucide-react';
import {
  BarChart, ChartCard, Donut, HeatmapCalendar, Histogram, StatTile, TrendGraph,
  colorFor, compact, countByDay, groupBy, monthlySeries, topWithOthers,
} from '../../../ui/graphs';

const rsFmt = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`;
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const grid = 'grid gap-4 lg:grid-cols-2';
const colored = (data) => data.map((d) => ({ ...d, color: colorFor(d.label) })); // same name = same colour everywhere

// Tab 1 (below the list): when products were created.
export function CreationCharts({ rows }) {
  return (
    <div className={grid}>
      <ChartCard title="Products created" subtitle="Every day, last 6 months" icon={CalendarDays} tone={2} delay={0}>
        <HeatmapCalendar data={countByDay(rows)} weeks={26} label="products" />
      </ChartCard>
      <ChartCard title="Monthly trend" subtitle="New products per month" icon={LineChart} tone={1} delay={80}>
        <TrendGraph data={monthlySeries(rows, undefined, 6)} />
      </ChartCard>
    </div>
  );
}

export function StockTab({ rows }) {
  const out = rows.filter((r) => r.status === 'outOfStock' || !(Number(r.remaining) > 0));
  const low = rows
    .filter((r) => Number(r.remaining) > 0)
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 8)
    .map((r) => ({ label: r.name, value: r.remaining, hint: `of ${r.totalAvailable}` }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total units" value={sum(rows, 'totalAvailable')} format={(n) => compact(n)} icon={Boxes} tone={1} delay={0} />
        <StatTile label="Units sold" value={sum(rows, 'sold')} format={(n) => compact(n)} icon={ShoppingBag} tone={7} delay={50} />
        <StatTile label="Units left" value={sum(rows, 'remaining')} format={(n) => compact(n)} icon={PackageCheck} tone={2} delay={100} />
        <StatTile label="Out of stock" value={out.length} hint={`of ${rows.length} products`} icon={PackageX} tone={4} delay={150} />
      </div>
      <div className={grid}>
        <ChartCard title="Stock status" subtitle="Products in and out of stock" icon={PieChart} tone={2}>
          <Donut
            centerLabel="products"
            data={[
              { label: 'In stock', value: rows.length - out.length, color: 'var(--graph-2)' },
              { label: 'Out of stock', value: out.length, color: 'var(--graph-4)' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Running low" subtitle="Fewest units left (still in stock)" icon={TriangleAlert} tone={3} delay={80}>
          <BarChart data={low} colorful={false} empty="Nothing running low." />
        </ChartCard>
        <ChartCard title="Best sellers" subtitle="Most units sold" icon={Trophy} tone={6} delay={160} className="lg:col-span-2">
          <BarChart
            data={[...rows].sort((a, b) => b.sold - a.sold).filter((r) => r.sold > 0).slice(0, 8).map((r) => ({ label: r.name, value: r.sold }))}
            empty="No sales recorded yet."
          />
        </ChartCard>
      </div>
    </div>
  );
}

export function CategoriesTab({ rows }) {
  const byCategory = groupBy(rows, (r) => r.category);
  const byGroup = topWithOthers(groupBy(rows, (r) => r.group), 5);
  const soldByCategory = groupBy(rows, (r) => r.category, (r) => Number(r.sold) || 0).filter((d) => d.value > 0);
  return (
    <div className={grid}>
      <ChartCard title="Products per category" subtitle={`${byCategory.length} categories`} icon={BarChart3} tone={6}>
        <BarChart data={colored(byCategory.slice(0, 8))} />
      </ChartCard>
      <ChartCard title="Groups" subtitle="Share of products by group" icon={Layers} tone={5} delay={80}>
        <Donut data={colored(byGroup)} centerLabel="grouped" empty="No groups set yet." />
      </ChartCard>
      <ChartCard title="Units sold per category" subtitle="Which categories sell" icon={Flame} tone={4} delay={160} className="lg:col-span-2">
        <BarChart data={colored(soldByCategory.slice(0, 8))} empty="No sales recorded yet." />
      </ChartCard>
    </div>
  );
}

export function PricingTab({ rows }) {
  const prices = rows.map((r) => Number(r.price) || 0);
  const avg = prices.length ? sum(rows, 'price') / prices.length : 0;
  const discounted = rows.filter((r) => Number(r.discountPercentage) > 0);
  const withCost = rows.filter((r) => Number(r.costPrice) > 0 && Number(r.price) > 0);
  const margin = withCost.length
    ? (withCost.reduce((s, r) => s + (r.price - r.costPrice) / r.price, 0) / withCost.length) * 100
    : null;
  const stockValue = rows.reduce((s, r) => s + (Number(r.price) || 0) * (Number(r.remaining) || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Average price" value={avg} format={rsFmt} icon={Tag} tone={3} delay={0} />
        <StatTile label="On discount" value={discounted.length} hint={`of ${rows.length} products`} icon={Percent} tone={4} delay={50} />
        <StatTile
          label="Avg. margin"
          value={margin == null ? '—' : margin}
          format={(n) => `${Math.round(n)}%`}
          hint="where cost price is set"
          icon={TrendingUp}
          tone={7}
          delay={100}
        />
        <StatTile label="Stock value" value={stockValue} format={(n) => `Rs ${compact(n)}`} icon={Wallet} tone={5} delay={150} />
      </div>
      <div className={grid}>
        <ChartCard title="Price ranges" subtitle="Products in each price range (Rs)" icon={Coins} tone={3}>
          <Histogram values={prices} bins={6} format={(n) => compact(n)} />
        </ChartCard>
        <ChartCard title="Biggest discounts" subtitle="Highest discount percentage" icon={Percent} tone={4} delay={80}>
          <BarChart
            data={[...discounted].sort((a, b) => b.discountPercentage - a.discountPercentage).slice(0, 8).map((r) => ({ label: r.name, value: r.discountPercentage }))}
            format={(n) => `${n}%`}
            empty="No discounted products."
          />
        </ChartCard>
      </div>
    </div>
  );
}