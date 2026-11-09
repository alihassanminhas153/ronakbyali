import { useCallback, useEffect, useRef, useState } from 'react';
import orderService from '../../../lib/appwrite/order';
import productService from '../../../lib/appwrite/product';
import cartService from '../../../lib/appwrite/cart';
import wishlistService from '../../../lib/appwrite/wishlist';
import financeService from '../../../lib/appwrite/finance';

// listFn({ limit, offset }) -> { rows, total } | false   ->   every row
async function pageAll(listFn) {
  const rows = [];
  for (let offset = 0; ; offset += 100) {
    const res = await listFn({ limit: 100, offset });
    if (!res?.rows?.length) break;
    rows.push(...res.rows);
    if (rows.length >= res.total) break;
  }
  return rows;
}

const EMPTY = { orders: [], products: [], carts: [], wishlists: [], ledger: [] };

// Loads everything the finance page needs. reload() = all, reloadLedger() = only the manual entries.
export default function useFinanceData() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [orders, products, carts, wishlists, ledger] = await Promise.all([
      orderService.searchOrders({}),
      productService.getProducts(),
      pageAll((o) => cartService.listCarts(o)),
      pageAll((o) => wishlistService.listWishlists(o)),
      financeService.getEntries(),
    ]);
    if (!alive.current) return;
    const failed = [!orders && 'orders', !products && 'products', !ledger && 'finance entries'].filter(Boolean);
    setError(failed.length ? `Could not load: ${failed.join(', ')}.` : '');
    setData({
      orders: orders || [], products: products || [], carts: carts || [], wishlists: wishlists || [], ledger: ledger || [],
    });
    setLoading(false);
  }, []);

  const reloadLedger = useCallback(async () => {
    const ledger = await financeService.getEntries();
    if (alive.current && ledger) setData((d) => ({ ...d, ledger }));
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => { alive.current = false; };
  }, [reload]);

  return { ...data, loading, error, reload, reloadLedger };
}