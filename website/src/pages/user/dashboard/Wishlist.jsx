// src/pages/user/dashboard/Wishlist.jsx   (route: /:username/wishlist)
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchWishlist,
  toggleWishlist,
  clearWishlist,
  selectWishlistIds,
  selectWishlistProducts,
  selectWishlistStatus,
  selectWishlistError,
} from "../../../store/slices/wishlistSlice";
import { addToCart, selectCartLines, selectCartUpdating } from "../../../store/slices/cartSlice";
import { getMainImageUrl } from "../../../store/slices/productsSlice";
import { PATHS } from "../../../router/path";

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

export default function Wishlist() {
  const dispatch = useDispatch();
  const ids = useSelector(selectWishlistIds);
  const products = useSelector(selectWishlistProducts);
  const status = useSelector(selectWishlistStatus);
  const error = useSelector(selectWishlistError);
  const cartLines = useSelector(selectCartLines);
  const cartBusy = useSelector(selectCartUpdating);

  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  // Filtering by ids makes removal instant, and a failed save puts the card back.
  const items = useMemo(() => products.filter((p) => ids.includes(p.$id)), [products, ids]);
  const inCartIds = useMemo(() => new Set(cartLines.map((l) => l.productId)), [cartLines]);

  const loadingFirst = status === "idle" || (status === "loading" && products.length === 0);
  if (loadingFirst) return <Skeleton />;

  if (status === "failed" && products.length === 0) {
    return (
      <Shell>
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error || "Could not load your wishlist."}
        </p>
        <button
          type="button"
          onClick={() => dispatch(fetchWishlist())}
          className="mt-4 rounded-md bg-neutral-900 px-5 py-2.5 font-semibold text-white dark:bg-white dark:text-neutral-900"
        >
          Try again
        </button>
      </Shell>
    );
  }

  if (items.length === 0) {
    return (
      <Shell>
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-lg font-medium text-neutral-900 dark:text-white">Nothing saved yet</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Tap the heart on any product to keep it here.
          </p>
          <Link
            to={PATHS.products}
            className="mt-6 inline-block rounded-md bg-neutral-900 px-6 py-3 font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Browse products
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      subtitle={`${items.length} saved ${items.length === 1 ? "product" : "products"}`}
      action={
        confirmClear ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-neutral-600 dark:text-neutral-300">Remove all saved products?</span>
            <button
              type="button"
              onClick={() => {
                dispatch(clearWishlist());
                setConfirmClear(false);
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white"
            >
              Yes, clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:text-white"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="text-sm text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
          >
            Clear wishlist
          </button>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <WishCard
            key={p.$id}
            product={p}
            inCart={inCartIds.has(p.$id)}
            cartBusy={cartBusy}
            onRemove={() => dispatch(toggleWishlist({ productId: p.$id }))}
            onAdd={() => dispatch(addToCart({ productId: p.$id, quantity: 1, toast: true }))}
          />
        ))}
      </ul>
    </Shell>
  );
}

function WishCard({ product: p, inCart, cartBusy, onRemove, onAdd }) {
  const remaining = p.remaining == null ? null : Number(p.remaining);
  const out = p.status === "outOfStock" || (remaining != null && remaining <= 0);
  const original = Number(p.originalPrice) || 0;
  const price = Number(p.price) || 0;
  const hasDiscount = original > price;
  const img = getMainImageUrl(p);
  const href = PATHS.product(p.category, p.group, p.slug);

  return (
    <li className="flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Link to={href} className="block h-full w-full" aria-label={p.name}>
          {img && (
            <img
              src={img}
              alt=""
              loading="lazy"
              className={`h-full w-full object-cover ${out ? "opacity-50" : ""}`}
            />
          )}
        </Link>
        {out && (
          <span className="absolute left-2 top-2 rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${p.name} from wishlist`}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-600 shadow hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
      </div>

      <Link to={href} className="mt-2 truncate font-medium text-neutral-900 hover:underline dark:text-white">
        {p.name}
      </Link>
      <p className="text-sm tabular-nums text-neutral-700 dark:text-neutral-200">
        {p.priceFormat || money(price)}
        {hasDiscount && (
          <span className="ml-2 text-neutral-500 line-through dark:text-neutral-400">{money(original)}</span>
        )}
      </p>

      <button
        type="button"
        onClick={onAdd}
        disabled={out || cartBusy}
        className="mt-3 rounded-md border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
      >
        {out ? "Unavailable" : inCart ? "Add one more" : "Add to cart"}
      </button>
    </li>
  );
}

function Shell({ children, action, subtitle }) {
  return (
    <section className="w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-['Barlow_Condensed',sans-serif] text-4xl font-bold text-neutral-900 dark:text-white">Your wishlist</h1>
          {subtitle && <p className="text-neutral-600 dark:text-neutral-300">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Skeleton() {
  const b = "animate-pulse rounded bg-neutral-200 dark:bg-neutral-800";
  return (
    <section aria-busy="true" aria-label="Loading wishlist">
      <div className={`mb-6 h-10 w-56 ${b}`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`aspect-[4/5] ${b}`} />
        ))}
      </div>
    </section>
  );
}