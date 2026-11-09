import { countByDay, dayKey, groupBy, monthlySeries } from '../../../ui/graphs/utils';
import { isTeamRole, providerOf } from './userFields';

const DAY = 86400000;
const time = (value) => {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

// Everything the Users tabs draw, computed from the rows already in the store.
// Only `lastLoginAt` and `$createdAt` exist per user, so the login calendar shows each
// user's most recent login day (not a full history).
export function buildUserAnalytics(users = []) {
  const now = Date.now();
  const todayKey = dayKey(new Date());
  const monthNow = new Date();

  const withLogin = users.filter((u) => time(u.lastLoginAt) !== null);
  const active7 = withLogin.filter((u) => now - time(u.lastLoginAt) <= 7 * DAY).length;
  const today = withLogin.filter((u) => dayKey(u.lastLoginAt) === todayKey).length;
  const newThisMonth = users.filter((u) => {
    const t = time(u.$createdAt);
    if (t === null) return false;
    const d = new Date(t);
    return d.getFullYear() === monthNow.getFullYear() && d.getMonth() === monthNow.getMonth();
  }).length;

  // 24 buckets: which hour of the day people last signed in (local time)
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 }));
  withLogin.forEach((u) => { hours[new Date(u.lastLoginAt).getHours()].value += 1; });
  const peak = hours.reduce((best, h) => (h.value > best.value ? h : best), hours[0]);

  const methods = groupBy(users, providerOf); // [{ label: 'google', value: 3 }]
  const methodList = methods.map((m) => {
    const rows = users.filter((u) => providerOf(u) === m.label);
    const last = rows.reduce((best, u) => {
      const t = time(u.lastLoginAt);
      return t !== null && (best === null || t > best) ? t : best;
    }, null);
    return { key: m.label, count: m.value, last: last ? new Date(last).toISOString() : null };
  });

  return {
    total: users.length,
    active7,
    today,
    newThisMonth,
    never: users.length - withLogin.length,
    methods,
    methodList,
    roles: groupBy(users, (u) => u.role || 'new'),
    hours,
    peakHour: peak.value > 0 ? peak.hour : null,
    cities: groupBy(users, (u) => (u.lastCity || '').trim()).slice(0, 6),
    spenders: users.filter((u) => Number(u.totalSpent) > 0).sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent)).slice(0, 5),
    team: users.filter((u) => isTeamRole(u.role)),
    loginDays: countByDay(users, (u) => u.lastLoginAt),
    joinDays: countByDay(users, (u) => u.$createdAt),
    signups: monthlySeries(users, (u) => u.$createdAt, 6),
    signupsYear: monthlySeries(users, (u) => u.$createdAt, 12), // for the Overview trend line
  };
}

// Login calendar data for one method (or everyone when `key` is empty).
export const loginDaysFor = (users, key) =>
  countByDay(key ? users.filter((u) => providerOf(u) === key) : users, (u) => u.lastLoginAt);