import { entityColorStep, iconToneClass } from '../../lib/entityColors';

const ICON_ASSETS = {
  Activity: 'graph',
  AlertCircle: 'alert',
  AlertTriangle: 'alert',
  ArrowUpRight: 'arrow_trend_up',
  BarChart3: 'histogram',
  Bell: 'alert',
  BellRing: 'alert',
  CalendarClock: 'calendar',
  CalendarDays: 'calendar',
  ChartColumn: 'histogram',
  ChartLine: 'graph',
  ChartPie: 'donut_chart',
  Check: 'success',
  CheckCheck: 'success',
  CheckCircle2: 'success',
  Clock: 'clock',
  Coins: 'coins',
  Eye: 'alert',
  FileText: 'list',
  Flame: 'popular',
  Heart: 'heart',
  Image: 'layers',
  ImagePlus: 'layers',
  Info: 'disclaimer',
  KeyRound: 'user',
  Layers: 'layers',
  LineChart: 'graph',
  MapPin: 'network',
  Megaphone: 'hand_speaker',
  PackageCheck: 'single_box',
  PackagePlus: 'boxes',
  PackageX: 'single_box',
  Percent: 'discount_tag',
  PieChart: 'donut_chart',
  Receipt: 'pkr',
  ShieldCheck: 'user',
  ShoppingBag: 'cart',
  ShoppingCart: 'cart',
  Sparkles: 'popular',
  Star: 'reviews',
  TrendingDown: 'arrow_trend_down',
  TrendingUp: 'arrow_trend_up',
  TriangleAlert: 'alert',
  Truck: 'truck',
  UserRound: 'user',
  Wallet: 'wallet',
  XCircle: 'fail_error_cross',
};

export function resolveAppIconName(icon, fallback = 'graph') {
  const componentName =
    typeof icon === 'string'
      ? icon
      : icon?.render?.displayName || icon?.displayName || icon?.name;
  return ICON_ASSETS[componentName] || fallback;
}

export default function AppIcon({ name, tone = 1, entity, hueRotate = true, className = 'size-6', style }) {
  if (!name) return null;
  const resolvedTone = entity ? entityColorStep('entity', entity) : tone;
  const toneClass = hueRotate ? iconToneClass(resolvedTone) : '';

  return (
    <img
      src={`${import.meta.env.BASE_URL}images/icons/app_icons/${name}.ico`}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`icon ${toneClass} object-contain ${className}`}
      style={style}
    />
  );
}
