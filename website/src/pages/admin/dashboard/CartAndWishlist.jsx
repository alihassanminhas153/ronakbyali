// src/pages/admin/dashboard/CartAndWishlist.jsx   (route: /team/:username/cart-and-wishlist)
//
// Needs cartService.listCarts() and wishlistService.listWishlists() (see the
// snippets in the chat) and table-level READ permission for the admin team.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";

import cartService from "../../../lib/appwrite/cart";
import wishlistService from "../../../lib/appwrite/wishlist";
import productService from "../../../lib/appwrite/product";
import { PATHS } from "../../../router/path";

const PAGE = 50;
const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

// Normalised view of a row: { id, who, contact, items: [{ productId, quantity, variant }] }
const fromCart = (row) => ({
  id: row.$id,
  row,
  items: cartService.parseItems(row).map((i) => ({ ...i, quantity: Number(i.quantity) || 0 })),
});
const fromWish = (row) => ({
  id: row.$id,
  row,
  items: (row.productIds || []).map((productId) => ({ productId, quantity: 1, variant: null })),
});

export default function CartAndWishlist() {
  const [tab, setTab] = useState("cart");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [state, setState] = useState({
    cart: { rows: [], total: 0 },
    wish: { rows: [], total: 0 },
    loading: true,
    more: null, // "cart" | "wish" while loading another page
    error: null,
  });
  const [products, setProducts] = useState({});
  const known = useRef(new Set());

  const hydrate = useCallback(async (entries) => {
    const ids = [...new Set(entries.flatMap((e) => e.items.map((i) => i.productId)))].filter(
      (id) => id && !known.current.has(id)
    );
    if (!ids.length) return;
    ids.forEach((id) => known.current.add(id));
    const rows = await productService.getProductsByIds(ids);
    if (!Array.isArray(rows)) return;
    setProducts((prev) => ({ ...prev, ...Object.fromEntries(rows.map((p) => [p.$id, p])) }));
  }, []);

  const fetchKind = useCallback(
    async (kind, offset) => {
      const res =
        kind === "cart"
          ? await cartService.listCarts({ limit: PAGE, offset })
          : await wishlistService.listWishlists({ limit: PAGE, offset });
      if (!res) throw new Error(kind);
      const entries = res.rows.map(kind === "cart" ? fromCart : fromWish);
      await hydrate(entries);
      return { entries, total: res.total };
    },
    [hydrate]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, w] = await Promise.all([fetchKind("cart", 0), fetchKind("wish", 0)]);
        if (!alive) return;
        setState({
          cart: { rows: c.entries, total: c.total },
          wish: { rows: w.entries, total: w.total },
          loading: false,
          more: null,
          error: null,
        });
      } catch {
        if (alive)
          setState((s) => ({
            ...s,
            loading: false,
            error:
              "Could not load carts and wishlists. Check that your admin team has Read permission on both tables in Appwrite.",
          }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchKind]);

  const loadMore = async (kind) => {
    setState((s) => ({ ...s, more: kind }));
    try {
      const { entries, total } = await fetchKind(kind, state[kind].rows.length);
      setState((s) => ({
        ...s,
        [kind]: { rows: [...s[kind].rows, ...entries], total },
        more: null,
      }));
    } catch {
      setState((s) => ({ ...s, more: null, error: "Could not load more rows." }));
    }
  };

  /* ---------- derived ---------- */

  const priceOf = (id) => Number(products[id]?.price) || 0;
  const withItems = (list) => list.filter((e) => e.items.length > 0);

  const cartEntries = useMemo(() => withItems(state.cart.rows), [state.cart.rows]);
  const wishEntries = useMemo(() => withItems(state.wish.rows), [state.wish.rows]);

  const stats = useMemo(() => {
    const units = cartEntries.reduce((n, e) => n + e.items.reduce((m, i) => m + i.quantity, 0), 0);
    const value = cartEntries.reduce(
      (n, e) => n + e.items.reduce((m, i) => m + priceOf(i.productId) * i.quantity, 0),
      0
    );
    const saved = wishEntries.reduce((n, e) => n + e.items.length, 0);
    return { shoppers: cartEntries.length, units, value, wishers: wishEntries.length, saved };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartEntries, wishEntries, products]);

  const top = (entries, weight) => {
    const map = new Map();
    entries.forEach((e) =>
      e.items.forEach((i) => map.set(i.productId, (map.get(i.productId) || 0) + weight(i)))
    );
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  const topCart = useMemo(() => top(cartEntries, (i) => i.quantity), [cartEntries]);
  const topWish = useMemo(() => top(wishEntries, () => 1), [wishEntries]);

  const q = query.trim().toLowerCase();
  const list = (tab === "cart" ? cartEntries : wishEntries).filter(
    (e) =>
      !q ||
      [e.row.name, e.row.username, e.row.email, e.row.phone, e.row.city].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
  );
  const current = state[tab];
  const hasMore = current.rows.length < current.total;

  /* ---------- render ---------- */

  return (
    <section className="w-full">
      <header className="mb-6">
        <h1 className="font-['Barlow_Condensed',sans-serif] text-4xl font-bold text-neutral-900 dark:text-white">
          Carts and wishlists
        </h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          What shoppers are holding right now, and what they have saved for later.
        </p>
      </header>

      {state.error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      {state.loading ? (
        <p className="text-neutral-600 dark:text-neutral-300" aria-busy="true">Loading...</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Shoppers with a cart" value={stats.shoppers} />
            <Stat label="Units in carts" value={stats.units} />
            <Stat label="Value in carts" value={money(stats.value)} />
            <Stat label="Products saved to wishlists" value={stats.saved} />
          </dl>
          {(state.cart.rows.length < state.cart.total || state.wish.rows.length < state.wish.total) && (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Totals cover the rows loaded so far. Load more below to include the rest.
            </p>
          )}

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <TopList title="Most in carts" unit="units" data={topCart} products={products} />
            <TopList title="Most wished for" unit="saves" data={topWish} products={products} />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Carts or wishlists" className="flex rounded-md border border-neutral-300 p-1 dark:border-neutral-700">
              {[
                ["cart", `Carts (${cartEntries.length})`],
                ["wish", `Wishlists (${wishEntries.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={tab === key}
                  onClick={() => {
                    setTab(key);
                    setOpen(null);
                  }}
                  className={`rounded px-4 py-1.5 text-sm font-medium ${
                    tab === key
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone or city"
              aria-label="Search shoppers"
              className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 sm:w-72 dark:border-neutral-700 dark:text-white"
            />
          </div>

          {list.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
              {q
                ? "No shoppers match that search."
                : tab === "cart"
                  ? "No one has anything in their cart."
                  : "No one has saved a product yet."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {list.map((e) => (
                <ShopperRow
                  key={e.id}
                  entry={e}
                  kind={tab}
                  products={products}
                  expanded={open === e.id}
                  onToggle={() => setOpen(open === e.id ? null : e.id)}
                />
              ))}
            </ul>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => loadMore(tab)}
              disabled={state.more === tab}
              className="mt-4 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:text-white"
            >
              {state.more === tab ? "Loading..." : `Load more (${current.total - current.rows.length} left)`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function ShopperRow({ entry, kind, products, expanded, onToggle }) {
  const { row, items } = entry;
  const who = row.name || row.username || row.email || row.$id;
  const contact = [row.email, row.phone, row.city].filter(Boolean).join(" | ");
  const units = items.reduce((n, i) => n + i.quantity, 0);
  const value = items.reduce((n, i) => n + (Number(products[i.productId]?.price) || 0) * i.quantity, 0);
  const summary =
    kind === "cart"
      ? `${units} ${units === 1 ? "item" : "items"} | ${money(value)}`
      : `${items.length} saved`;

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-neutral-900 dark:text-white">{who}</span>
          {contact && <span className="block truncate text-sm text-neutral-500 dark:text-neutral-400">{contact}</span>}
        </span>
        <span className="shrink-0 text-sm tabular-nums text-neutral-700 dark:text-neutral-300">
          {summary}
          <span aria-hidden="true" className="ml-3">{expanded ? "−" : "+"}</span>
        </span>
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2 pl-0 sm:pl-4">
          {items.map((i, idx) => {
            const p = products[i.productId];
            const img = p ? productService.getMainImageUrl(p) : null;
            return (
              <li key={`${i.productId}:${idx}`} className="flex items-center gap-3 text-sm">
                <span className="h-12 w-10 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                  {img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  {p ? (
                    <Link
                      to={PATHS.product(p.category, p.group, p.slug)}
                      className="block truncate text-neutral-900 hover:underline dark:text-white"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span className="block truncate text-neutral-500 dark:text-neutral-400">
                      Product removed ({i.productId})
                    </span>
                  )}
                  {i.variant && <span className="text-neutral-500 dark:text-neutral-400">Option: {i.variant}</span>}
                </span>
                {kind === "cart" && (
                  <span className="shrink-0 tabular-nums text-neutral-700 dark:text-neutral-300">
                    {i.quantity} x {money(p?.price)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <dt className="text-sm text-neutral-600 dark:text-neutral-300">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">{value}</dd>
    </div>
  );
}

function TopList({ title, unit, data, products }) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-semibold text-neutral-900 dark:text-white">{title}</h2>
      {data.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Nothing yet.</p>
      ) : (
        <ol className="mt-3 space-y-2 text-sm">
          {data.map(([id, n]) => (
            <li key={id} className="flex justify-between gap-3">
              <span className="truncate text-neutral-900 dark:text-white">{products[id]?.name || "Product removed"}</span>
              <span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-300">
                {n} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}