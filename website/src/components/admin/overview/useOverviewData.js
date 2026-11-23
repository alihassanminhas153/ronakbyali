import { useCallback, useEffect, useRef, useState } from 'react';
import orderService from '../../../lib/appwrite/order';
import productService from '../../../lib/appwrite/product';
import userService from '../../../lib/appwrite/user';
import alertService from '../../../lib/appwrite/alert';
import reviewService from '../../../lib/appwrite/review';
import cartService from '../../../lib/appwrite/cart';
import wishlistService from '../../../lib/appwrite/wishlist';
import financeService from '../../../lib/appwrite/finance';
import { isAccessDeniedError } from '../../../lib/appwrite/accessErrors';

// listFn({ limit, offset }) -> { rows, total } | false   ->   every row
async function pageAll(listFn) {
  const rows = [];
  for (let offset = 0; ; offset += 100) {
    const res = await listFn({ limit: 100, offset });
    if (!res || !Array.isArray(res.rows)) throw new Error('Could not load the paginated records.');
    if (!res.rows.length) break;
    rows.push(...res.rows);
    if (rows.length >= res.total) break;
  }
  return rows;
}

const EMPTY = { orders: [], products: [], users: [], alerts: [], reviews: [], carts: [], wishlists: [], ledger: [] };

// Loads everything the overview shows, in parallel. A failing source never blocks the others.
export default function useOverviewData() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    const results = await Promise.allSettled([
      orderService.searchOrders({}),
      productService.getProducts(),
      userService.getProfiles(),
      alertService.getAllAlerts(),
      pageAll((o) => reviewService.getReviewsPage(o)),
      pageAll((o) => cartService.listCarts(o)),
      pageAll((o) => wishlistService.listWishlists(o)),
      financeService.getEntries(),
    ]);
    if (!alive.current) return;
    const names = ['orders', 'products', 'users', 'alerts', 'reviews', 'carts', 'wishlists', 'finance entries'];
    const failed = results.flatMap((result, index) =>
      result.status === 'rejected' || result.value === false || (index === 4 && reviewService.lastAccessDenied)
        ? [names[index]]
        : []
    );
    const denied = results.some((result) => result.status === 'rejected' && isAccessDeniedError(result.reason))
      || [
        orderService,
        productService,
        userService,
        alertService,
        reviewService,
        cartService,
        wishlistService,
        financeService,
      ].some((service) => service.lastAccessDenied);
    const rows = (result) =>
      result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
    const [orders, products, users, alerts, reviews, carts, wishlists, ledger] = results.map(rows);
    setAccessDenied(denied);
    setError(failed.length ? `Could not load: ${failed.join(', ')}.` : financeService.lastError || '');
    setData({
      orders, products, users, alerts, reviews, carts, wishlists, ledger,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => { alive.current = false; };
  }, [reload]);

  return { ...data, loading, error, accessDenied, reload };
}