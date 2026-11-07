// src/pages/shared/products/Product.jsx
//
// Routes that render this page (see App.jsx):
//   /:category/:group/:productId   (productId is the slug)
//   /:productId                    (rendered by SlugRoute: pass the slug as the `slug` prop)
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchProductBySlug,
  fetchRelatedProducts,
  clearProductDetail,
  selectProductDetail,
  selectProductDetailStatus,
  selectProductDetailError,
  selectRelatedProducts,
  getProductImageUrls,
  getMainImageUrl,
} from "../../../store/slices/productsSlice";
import { PATHS } from "../../../router/path";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";
import {
  addToCart,
  selectCartLines,
  selectCartUpdating,
} from "../../../store/slices/cartSlice";
import {
  toggleWishlist,
  selectIsWished,
} from "../../../store/slices/wishlistSlice";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

const LOW_STOCK_AT = 5;
const MAX_QTY_WITHOUT_LIMIT = 10;

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function Product({ slug: slugProp }) {
  const dispatch = useDispatch();
  const params = useParams();

  // Long form uses :productId; the short form lives under :username in App.jsx.
  const slug = slugProp ?? params.productId ?? params.username;

  const product = useSelector(selectProductDetail);
  const status = useSelector(selectProductDetailStatus);
  const error = useSelector(selectProductDetailError);
  const related = useSelector(selectRelatedProducts);

  useEffect(() => {
    if (!slug) return undefined;
    window.scrollTo({ top: 0 });
    dispatch(fetchProductBySlug(slug));
    return () => {
      dispatch(clearProductDetail());
    };
  }, [dispatch, slug]);

  useEffect(() => {
    if (product?.$id) dispatch(fetchRelatedProducts({ product, limit: 4 }));
  }, [dispatch, product?.$id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "failed") return <NotFound message={error} />;
  if (!product || product.slug !== slug) return <PageSkeleton />;

  // /wrong-category/wrong-group/slug -> fix the URL (long form only).
  if (
    params.category &&
    (params.category !== product.category || params.group !== product.group)
  ) {
    return (
      <Navigate
        to={PATHS.product(product.category, product.group, product.slug)}
        replace
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <Breadcrumb product={product} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <Gallery product={product} />
        <Details key={product.$id} product={product} />
      </div>

      {related.length > 0 && <Related items={related} />}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* breadcrumb                                                          */
/* ------------------------------------------------------------------ */

function Breadcrumb({ product }) {
  const crumb = "transition-colors hover:text-neutral-900 dark:hover:text-white";
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-neutral-500 dark:text-neutral-400">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link to={PATHS.home} className={crumb}>Home</Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to={PATHS.products} className={crumb}>Products</Link>
        </li>
        {product.category && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                to={`${PATHS.products}?category=${encodeURIComponent(product.category)}`}
                className={crumb}
              >
                {product.category}
              </Link>
            </li>
          </>
        )}
        {product.group && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                to={`${PATHS.products}?category=${encodeURIComponent(product.category)}&group=${encodeURIComponent(product.group)}`}
                className={crumb}
              >
                {product.group}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-medium text-neutral-900 dark:text-white">
          {product.name}
        </li>
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* gallery                                                             */
/* ------------------------------------------------------------------ */

function Gallery({ product }) {
  const images = useMemo(() => getProductImageUrls(product), [product]);
  const [index, setIndex] = useState(0);

  // Reset when a different product is shown.
  useEffect(() => setIndex(0), [product.$id]);

  const count = images.length;
  const go = useCallback(
    (step) => setIndex((i) => (count ? (i + step + count) % count : 0)),
    [count]
  );

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  };

  if (count === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg bg-neutral-100 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        No photos yet
      </div>
    );
  }

  return (
    <section
      aria-label={`${product.name} photos`}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <img
          key={images[index]}
          src={images[index]}
          alt={`${product.name}, photo ${index + 1} of ${count}`}
          className="h-full w-full object-cover"
          loading={index === 0 ? "eager" : "lazy"}
        />

        {count > 1 && (
          <>
            <ArrowButton side="left" label="Previous photo" onClick={() => go(-1)} />
            <ArrowButton side="right" label="Next photo" onClick={() => go(1)} />
            <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs tabular-nums text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`block h-20 w-16 overflow-hidden rounded-md border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white ${
                  i === index
                    ? "border-neutral-900 dark:border-white"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ArrowButton({ side, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={side === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* details + buying                                                    */
/* ------------------------------------------------------------------ */

function Details({ product }) {
  const dispatch = useDispatch();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState(null);

  const wished = useSelector(selectIsWished(product.$id));
  const lines = useSelector(selectCartLines);
  const updating = useSelector(selectCartUpdating);
  const inCart = lines
    .filter((l) => l.productId === product.$id)
    .reduce((n, l) => n + (Number(l.quantity) || 0), 0);

  const price = Number(product.price) || 0;
  const original = Number(product.originalPrice) || 0;
  const hasDiscount = original > price;
  const percent = hasDiscount ? Math.round(((original - price) / original) * 100) : 0;

  const remaining = product.remaining == null ? null : Number(product.remaining);
  const inStock = product.status !== "outOfStock" && (remaining == null || remaining > 0);
  // Units still available after what is already in this person's cart.
  const room = remaining != null ? Math.max(0, remaining - inCart) : MAX_QTY_WITHOUT_LIMIT;
  const maxQty = Math.max(1, room);
  const atLimit = inStock && remaining != null && room === 0;
  const lowStock = inStock && remaining != null && remaining <= LOW_STOCK_AT;

  const step = (d) => setQty((q) => Math.min(maxQty, Math.max(1, q + d)));

  const handleAdd = async () => {
    setCartError(null);
    // Guests: the thunk opens the login modal and rejects with LOGIN_REQUIRED.
    const result = await dispatch(
      addToCart({ productId: product.$id, quantity: qty, toast: true })
    );
    if (addToCart.fulfilled.match(result)) {
      setAdded(true);
      setQty(1);
      window.setTimeout(() => setAdded(false), 2000);
    } else if (result.payload && result.payload !== LOGIN_REQUIRED) {
      setCartError(String(result.payload));
    }
  };

  // Optimistic: the heart flips at once and rolls back if saving fails.
  const handleWish = () => dispatch(toggleWishlist({ productId: product.$id }));

  const rows = [
    ["Category", product.category],
    ["Group", product.group],
    ["Availability", inStock ? (lowStock ? `Only ${remaining} left` : "In stock") : "Out of stock"],
  ].filter(([, v]) => v);

  return (
    <section className="flex flex-col">
      <h1 className="font-['Barlow_Condensed',sans-serif] text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl dark:text-white">
        {product.name}
      </h1>

      {/* price */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
          {product.priceFormat || money(price)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-lg tabular-nums text-neutral-500 line-through dark:text-neutral-400">
              {money(original)}
            </span>
            <span className="rounded bg-red-600 px-2 py-0.5 text-sm font-semibold text-white">
              {percent}% off
            </span>
          </>
        )}
      </div>
      {hasDiscount && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          You save {money(original - price)}
        </p>
      )}

      {/* stock */}
      <p
        role="status"
        className={`mt-5 text-sm font-medium ${
          !inStock
            ? "text-red-600 dark:text-red-400"
            : lowStock
              ? "text-amber-700 dark:text-amber-400"
              : "text-emerald-700 dark:text-emerald-400"
        }`}
      >
        {!inStock ? "Out of stock" : lowStock ? `Only ${remaining} left` : "In stock"}
      </p>

      {/* buy box */}
      <div className="mt-4 flex flex-wrap items-stretch gap-3">
        <div
          className="flex items-center rounded-md border border-neutral-300 dark:border-neutral-700"
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!inStock || qty <= 1}
            aria-label="Decrease quantity"
            className="h-12 w-11 text-xl text-neutral-900 disabled:opacity-40 dark:text-white"
          >
            −
          </button>
          <span className="w-10 text-center tabular-nums text-neutral-900 dark:text-white" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!inStock || qty >= maxQty}
            aria-label="Increase quantity"
            className="h-12 w-11 text-xl text-neutral-900 disabled:opacity-40 dark:text-white"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock || atLimit || updating}
          className="h-12 min-w-[12rem] flex-1 rounded-md bg-neutral-900 px-6 font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
        >
          {!inStock
            ? "Out of stock"
            : atLimit
              ? "Maximum in your cart"
              : updating
                ? "Adding..."
                : added
                  ? "Added to cart"
                  : "Add to cart"}
        </button>

        <button
          type="button"
          onClick={handleWish}
          aria-pressed={wished}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          className="flex h-12 w-12 items-center justify-center rounded-md border border-neutral-300 text-neutral-900 transition hover:border-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:border-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
      </div>

      {inCart > 0 && (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          {inCart} in your cart
        </p>
      )}
      {cartError && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {cartError}
        </p>
      )}

      {/* description */}
      {product.description && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">About this product</h2>
          <p className="mt-2 max-w-prose whitespace-pre-line leading-relaxed text-neutral-700 dark:text-neutral-300">
            {product.description}
          </p>
        </div>
      )}

      {/* facts */}
      {rows.length > 0 && (
        <dl className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-neutral-500 dark:text-neutral-400">{k}</dt>
              <dd className="text-right font-medium text-neutral-900 dark:text-white">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* tags */}
      {product.tags?.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {product.tags.map((t) => (
            <li key={t}>
              <Link
                to={`${PATHS.products}?q=${encodeURIComponent(t)}`}
                className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
              >
                {t}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* related                                                             */
/* ------------------------------------------------------------------ */

function Related({ items }) {
  return (
    <section className="mt-16" aria-labelledby="related-heading">
      <h2
        id="related-heading"
        className="font-['Barlow_Condensed',sans-serif] text-3xl font-bold text-neutral-900 dark:text-white"
      >
        More from this category
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {items.map((p) => (
          <li key={p.$id}>
            <Link to={PATHS.product(p.category, p.group, p.slug)} className="group block">
              <div className="aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                {getMainImageUrl(p) && (
                  <img
                    src={getMainImageUrl(p)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <p className="mt-2 truncate font-medium text-neutral-900 dark:text-white">{p.name}</p>
              <p className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
                {p.priceFormat || money(p.price)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* loading + not found                                                 */
/* ------------------------------------------------------------------ */

function PageSkeleton() {
  const block = "animate-pulse rounded bg-neutral-200 dark:bg-neutral-800";
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading product"
    >
      <div className={`h-4 w-64 ${block}`} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className={`aspect-[4/5] w-full ${block}`} />
        <div className="space-y-4">
          <div className={`h-12 w-3/4 ${block}`} />
          <div className={`h-8 w-1/3 ${block}`} />
          <div className={`h-12 w-full ${block}`} />
          <div className={`h-24 w-full ${block}`} />
        </div>
      </div>
    </main>
  );
}

function NotFound({ message }) {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-['Barlow_Condensed',sans-serif] text-4xl font-bold text-neutral-900 dark:text-white">
        We couldn't find that product
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-300">
        {message || "It may have been removed, or the link may be wrong."}
      </p>
      <Link
        to={PATHS.products}
        className="mt-6 rounded-md bg-neutral-900 px-6 py-3 font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Browse all products
      </Link>
    </main>
  );
}