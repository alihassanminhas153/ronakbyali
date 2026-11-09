import { useCallback, useEffect, useRef, useState } from 'react';
import productService from '../../../lib/appwrite/product';

// Loads EVERY product row once (the list on screen is paged, charts need all rows).
// reload() fetches again, e.g. from the Refresh button or after a save / delete.
export default function useProductAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const all = await productService.getProducts();
    if (!alive.current) return;
    if (all) { setRows(all); setError(''); } else setError('Could not load analytics.');
    setLoading(false);
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => { alive.current = false; };
  }, [reload]);

  return { rows, loading, error, reload };
}