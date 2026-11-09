import BarChart from './BarChart';
import { histogramBins } from './utils';

// values: plain numbers (prices, stock, ratings...). Groups them into `bins` ranges.
export default function Histogram({ values = [], bins = 6, format, height = 180, empty }) {
  const data = histogramBins(values, bins, format);
  return <BarChart data={data} orientation="vertical" height={height} format={(n) => n} empty={empty} />;
}