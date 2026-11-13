// src/pages/shared/products/Product.jsx
//
// Routes that render this page (see App.jsx):
//   /:category/:group/:productId   (productId is the slug)
//   /:productId                    (rendered by SlugRoute: pass the slug as the `slug` prop)
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeCheck,
  Star,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

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
import { selectMe } from "../../../store/slices/userSlice";
import userService from "../../../lib/appwrite/user";
import reviewService from "../../../lib/appwrite/review";
import ProductCheckoutDrawer from "./ProductCheckoutDrawer";
import { loadDraft } from "../../../lib/checkoutDraft";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

const LOW_STOCK_AT = 5;
const MAX_QTY_WITHOUT_LIMIT = 10;
const REVIEW_PAGE_SIZE = 10;

const formatRemaining = (count, cap) => {
  const amount = Number(count);
  if (!Number.isFinite(amount)) return "";
  return amount > cap ? `${cap}+` : String(amount);
};

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
    const pageTitle = product?.slug === slug
      ? product.name
      : status === "failed"
        ? "Page not found"
        : "Product";
    document.title = `${pageTitle} | Ronak By Ali`;
  }, [product?.name, product?.slug, slug, status]);

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
    <main className="mx-auto w-full max-w-6xl bg-bg px-4 pb-20 pt-6 text-text sm:px-6 lg:px-8">
      <Breadcrumb product={product} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <Gallery key={product.$id} product={product} />
        <Details key={product.$id} product={product} />
      </div>

      <Reviews product={product} />
      {related.length > 0 && <Related items={related} />}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* breadcrumb                                                          */
/* ------------------------------------------------------------------ */

function Breadcrumb({ product }) {
  const crumb = "transition-colors hover:text-accent";
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
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
        <li aria-current="page" className="font-medium text-text">
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
  const images = useMemo(() => [...new Set(getProductImageUrls(product))], [product]);
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const viewerRef = useRef(null);

  const count = images.length;
  const go = useCallback(
    (step) => setIndex((i) => (count ? (i + step + count) % count : 0)),
    [count]
  );
  const goViewer = (step) => {
    const next = (viewerIndex + step + count) % count;
    setViewerIndex(next);
    setIndex(next);
    setZoom(1);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") viewerOpen ? goViewer(1) : go(1);
    if (e.key === "ArrowLeft") viewerOpen ? goViewer(-1) : go(-1);
  };

  useEffect(() => {
    const dialog = viewerRef.current;
    if (!dialog) return;
    if (viewerOpen && !dialog.open) dialog.showModal();
    if (!viewerOpen && dialog.open) dialog.close();
  }, [viewerOpen]);

  if (count === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg bg-surface-alt text-sm text-muted">
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
      <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-surface-alt shadow-soft">
        <div
          className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{
            width: `${count * 100}%`,
            transform: `translateX(-${(index * 100) / count}%)`,
          }}
        >
          {images.map((src, i) => (
            <div key={src} className="h-full shrink-0" style={{ width: `${100 / count}%` }}>
              <button
                type="button"
                onClick={() => {
                  setViewerIndex(i);
                  setZoom(1);
                  setViewerOpen(true);
                }}
                aria-label={`View photo ${i + 1} of ${count} full screen`}
                className="h-full w-full cursor-zoom-in"
              >
                <img
                  src={src}
                  alt={`${product.name}, photo ${i + 1} of ${count}`}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </button>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <ArrowButton side="left" label="Previous photo" onClick={() => go(-1)} />
            <ArrowButton side="right" label="Next photo" onClick={() => go(1)} />
            <span className="absolute bottom-3 right-3 rounded bg-text/85 px-2 py-1 text-xs tabular-nums text-bg">
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
                className={`block h-20 w-16 overflow-hidden rounded-lg border-2 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  i === index
                    ? "border-accent shadow-soft"
                    : "border-transparent opacity-70 hover:scale-[1.03] hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={viewerRef}
        aria-labelledby="product-image-viewer-title"
        onClose={() => setViewerOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setViewerOpen(false);
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-black/95 p-4 text-white backdrop:bg-black/90 sm:p-6"
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4">
            <h2 id="product-image-viewer-title" className="sr-only">
              {product.name} photo viewer
            </h2>
            <p className="text-sm text-white/75">{viewerIndex + 1} / {count}</p>
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              aria-label="Close image viewer"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="grid min-h-0 flex-1 place-items-center overflow-hidden py-3">
            <button
              type="button"
              onClick={() => setZoom((value) => value >= 3 ? 1 : Math.min(3, value + 0.5))}
              aria-label={zoom >= 3 ? "Reset image zoom" : "Zoom image in"}
              title={zoom >= 3 ? "Click to reset zoom" : "Click to zoom in"}
              className="grid h-full w-full place-items-center overflow-hidden cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <img
                src={images[viewerIndex]}
                alt={`${product.name}, photo ${viewerIndex + 1} of ${count}`}
                style={{ transform: `scale(${zoom})` }}
                className={`max-h-[82dvh] max-w-[90vw] object-contain transition-transform duration-200 motion-reduce:transition-none ${
                  zoom >= 3 ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
              />
            </button>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goViewer(-1)}
                  aria-label="Previous photo"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => goViewer(1)}
                  aria-label="Next photo"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
                >
                  Next
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
              disabled={zoom <= 1}
              aria-label="Zoom out"
              className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomOut size={18} aria-hidden="true" />
            </button>
            <span className="min-w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
              disabled={zoom >= 3}
              aria-label="Zoom in"
              className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomIn size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

function ArrowButton({ side, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg/90 text-text shadow-soft transition hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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

function StarRating({ rating, label, size = 16 }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rounded ? "currentColor" : "none"}
          className={star <= rounded ? "text-warning" : "text-border"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ProductRating({ product }) {
  const count = Number(product.reviewCount) || 0;
  const rating = Number(product.ratingAverage) || 0;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <StarRating
        rating={rating}
        label={count ? `${rating.toFixed(1)} out of 5 stars` : "No ratings yet"}
        size={17}
      />
      {count > 0 ? (
        <span className="text-sm text-muted">
          {rating.toFixed(1)} · {count} {count === 1 ? "review" : "reviews"}
        </span>
      ) : (
        <span className="text-sm text-muted">No reviews yet</span>
      )}
    </div>
  );
}

function Details({ product }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [checkoutMounted, setCheckoutMounted] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(0);
  const closeTimer = useRef(null);
  const checkoutTrigger = useRef(null);
  const reopened = useRef(false);
  const location = useLocation();

  const wished = useSelector(selectIsWished(product.$id));
  const account = useSelector(selectMe);
  const authProfile = useSelector((state) => state.auth.profile);
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
  const stockCount = remaining != null && Number.isFinite(remaining)
    ? formatRemaining(remaining, 500)
    : "";

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

  const openCheckout = () => {
    checkoutTrigger.current = document.activeElement;
    window.clearTimeout(closeTimer.current);
    setCheckoutSession((session) => session + 1);
    setCheckoutMounted(true);
    window.requestAnimationFrame(() => setCheckoutOpen(true));
  };

  const closeCheckout = useCallback(() => {
    checkoutTrigger.current?.focus?.();
    setCheckoutOpen(false);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setCheckoutMounted(false), 350);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Back from Google login with something still missing: reopen the form.
  useEffect(() => {
    if (reopened.current || !location.state?.reopenCheckout || !authProfile) return;
    if (!inStock || room < 1) return;
    reopened.current = true;
    const draft = loadDraft();
    if (draft?.productId === product.$id) setQty(Math.min(maxQty, Math.max(1, Number(draft.quantity) || 1)));
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    openCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProfile, location.state, inStock, room]);

  const categories = [
    product.category && {
      label: "Category",
      value: product.category,
      to: `${PATHS.products}?category=${encodeURIComponent(product.category)}`,
    },
    product.group && {
      label: "Group",
      value: product.group,
      to: `${PATHS.products}?category=${encodeURIComponent(product.category || "")}&group=${encodeURIComponent(product.group)}`,
    },
  ].filter(Boolean);

  return (
    <section className="flex flex-col">
      <ProductRating product={product} />
      <h1 className="font-display text-4xl font-bold leading-tight text-text sm:text-5xl">
        {product.name}
      </h1>

      {/* price */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold tabular-nums text-text">
          {product.priceFormat || money(price)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-lg tabular-nums text-muted line-through">
              {money(original)}
            </span>
            <span className="rounded bg-accent px-2 py-0.5 text-sm font-semibold text-on-accent">
              {percent}% off
            </span>
          </>
        )}
      </div>
      {hasDiscount && (
        <p className="mt-1 text-sm text-muted">
          You save {money(original - price)}
        </p>
      )}

      {/* stock */}
      <p
        role="status"
        className={`mt-5 text-sm font-medium ${
          !inStock
            ? "text-error"
            : lowStock
              ? "text-warning"
              : "text-success"
        }`}
      >
        {!inStock
          ? "Out of stock"
          : stockCount
            ? `${lowStock ? "Only " : ""}${stockCount} left in stock`
            : "In stock"}
      </p>

      {/* buy box */}
      <div className="mt-4 flex flex-wrap items-stretch gap-3">
        <div
          className="flex items-center rounded-md border border-border bg-surface"
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!inStock || qty <= 1}
            aria-label="Decrease quantity"
            className="h-12 w-11 text-xl text-text disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center tabular-nums text-text" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!inStock || qty >= maxQty}
            aria-label="Increase quantity"
            className="h-12 w-11 text-xl text-text disabled:opacity-40"
          >
            +
          </button>
        </div>


        <button
          type="button"
          onClick={handleWish}
          aria-pressed={wished}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          className="flex h-12 w-12 items-center justify-center rounded-md border border-border text-text transition hover:border-accent hover:text-accent"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock || atLimit || updating}
          className="h-12 min-w-[12rem] flex-1 rounded-md bg-brown px-6 font-semibold text-on-brown transition hover:bg-brown-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

      </div>

      <button
        type="button"
        onClick={openCheckout}
        disabled={!inStock || qty > room}
        className="mt-3 h-12 w-full rounded-md bg-accent px-6 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Buy now
      </button>

      {inCart > 0 && (
        <p className="mt-3 text-sm text-muted">
          {inCart} in your cart
        </p>
      )}
      {cartError && (
        <p role="alert" className="mt-3 text-sm text-error">
          {cartError}
        </p>
      )}

      {/* description */}
      {product.description && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text">About this product</h2>
          <p className="mt-2 max-w-prose whitespace-pre-line leading-relaxed text-muted">
            {product.description}
          </p>
        </div>
      )}

      {/* product categories */}
      {categories.length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="product-details-heading">
          <h2 id="product-details-heading" className="text-base font-semibold text-text">Product details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {categories.map(({ label, value, to }) => (
              <div key={label} className="rounded-xl bg-surface-alt/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                <Link
                  to={to}
                  className="mt-1 inline-flex items-center gap-2 font-medium text-text transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Tag size={15} className="shrink-0 text-accent" aria-hidden="true" />
                  <span className="break-words">{value}</span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* tags */}
      {product.tags?.length > 0 && (
        <section className="mt-6" aria-labelledby="product-keywords-heading">
          <h2 id="product-keywords-heading" className="text-sm font-semibold text-text">Explore by keyword</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.tags.map((t) => (
              <li key={t}>
                <Link
                  to={`${PATHS.products}?q=${encodeURIComponent(t)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted shadow-sm transition hover:border-accent/60 hover:bg-accent-soft hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Tag size={13} aria-hidden="true" />
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ProductCheckoutDrawer
        key={checkoutSession}
        mounted={checkoutMounted}
        open={checkoutOpen}
        onClose={closeCheckout}
        onPlaced={(order) => {
          closeCheckout();
          window.setTimeout(() => {
            navigate(PATHS.user.orders(order?.username || account?.username || authProfile?.username), { replace: true });
          }, 320);
        }}
        product={product}
        quantity={qty}
        account={account || authProfile}
      />
    </section>
  );
}

function ReviewAvatar({ review, name }) {
  const [avatar, setAvatar] = useState(() => (
    review.reviewerAvatarId
      ? userService.getAvatarUrl({ fileId: review.reviewerAvatarId })
      : null
  ));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!avatar && review.userId) {
      userService.getProfile({ userId: review.userId }).then((profile) => {
        if (!active || !profile?.avatarFileId) return;
        setAvatar(userService.getAvatarUrl({ fileId: profile.avatarFileId }));
      });
    }

    return () => {
      active = false;
    };
  }, [avatar, review.userId]);

  if (avatar && !failed) {
    return (
      <img
        src={avatar}
        alt={`${name}'s avatar`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-11 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <span
      aria-label={`${name}'s avatar`}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-accent-soft text-sm font-semibold uppercase text-accent"
    >
      {name.charAt(0)}
    </span>
  );
}

function Reviews({ product }) {
  const [state, setState] = useState({
    productId: null,
    rows: [],
    total: 0,
    loading: true,
    loadingMore: false,
    error: "",
    moreError: "",
  });

  useEffect(() => {
    let active = true;
    setState({
      productId: product.$id,
      rows: [],
      total: 0,
      loading: true,
      loadingMore: false,
      error: "",
      moreError: "",
    });

    reviewService.getProductReviews({ productId: product.$id, limit: REVIEW_PAGE_SIZE, offset: 0 })
      .then((result) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          rows: uniqueReviews(result.rows),
          total: result.total,
          loading: false,
          error: result.error || "",
        }));
      })
      .catch((error) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Reviews could not be loaded. Please try again.",
        }));
      });

    return () => {
      active = false;
    };
  }, [product.$id]);

  const loadMore = async () => {
    setState((current) => ({ ...current, loadingMore: true, moreError: "" }));
    try {
      const result = await reviewService.getProductReviews({
        productId: product.$id,
        limit: REVIEW_PAGE_SIZE,
        offset: state.rows.length,
      });
      if (result.error) throw new Error(result.error);
      setState((current) => current.productId === product.$id
        ? {
            ...current,
            rows: uniqueReviews([...current.rows, ...result.rows]),
            total: result.total,
            loadingMore: false,
          }
        : current);
    } catch (error) {
      setState((current) => current.productId === product.$id
        ? {
            ...current,
            loadingMore: false,
            moreError: error.message || "More reviews could not be loaded.",
          }
        : current);
    }
  };

  const reviews = state.productId === product.$id ? state.rows : [];
  const total = state.productId === product.$id ? state.total : 0;
  const loading = state.productId !== product.$id || state.loading;
  const error = state.productId === product.$id ? state.error : "";
  const loadingMore = state.productId === product.$id && state.loadingMore;
  const moreError = state.productId === product.$id ? state.moreError : "";

  return (
    <section className="mt-16" aria-labelledby="product-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Customer feedback</p>
          <h2 id="product-reviews-heading" className="mt-1 font-display text-3xl font-bold text-text">
            Product reviews
          </h2>
        </div>
        {!loading && !error && (
          <p className="text-sm text-muted">
            {total} {total === 1 ? "review" : "reviews"}
          </p>
        )}
      </div>

      {loading && <p role="status" className="mt-5 text-sm text-muted">Loading reviews…</p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{error}</p>}
      {!loading && !error && total === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
          <p className="font-semibold text-text">No reviews yet</p>
          <p className="mt-1 text-sm text-muted">Be the first to share your experience with this product.</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:gap-4">
          {reviews.map((review) => {
            const name = review.reviewerName || review.username || "Customer";
            const date = review.$createdAt
              ? new Date(review.$createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : "";
            return (
              <li key={review.$id}>
                <article className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ReviewAvatar review={review} name={name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">{name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {review.username ? `@${review.username}` : ""}
                          {review.username && date ? " · " : ""}
                          {date}
                        </p>
                      </div>
                    </div>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                        <BadgeCheck size={14} aria-hidden="true" /> Verified purchase
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StarRating rating={Number(review.rating) || 0} label={`${review.rating} out of 5 stars`} />
                    {review.title && <h3 className="font-semibold text-text">{review.title}</h3>}
                  </div>
                  {review.message && (
                    <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-muted">{review.message}</p>
                  )}
                  {review.adminReply && (
                    <div className="mt-4 rounded-xl border border-border bg-surface-alt/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">Store response</p>
                      <p className="mt-1 whitespace-pre-line break-words text-sm text-text">{review.adminReply}</p>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {moreError && <p role="alert" className="mt-4 text-sm text-error">{moreError}</p>}
      {!loading && !error && reviews.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent/60 hover:text-accent disabled:cursor-wait disabled:opacity-60"
        >
          {loadingMore ? "Loading reviews…" : "Load more reviews"}
        </button>
      )}
    </section>
  );
}

function uniqueReviews(rows) {
  const seen = new Set();
  return rows.filter((review) => {
    if (!review?.$id || seen.has(review.$id)) return false;
    seen.add(review.$id);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* related                                                             */
/* ------------------------------------------------------------------ */

function Related({ items }) {
  const uniqueItems = [...new Map(items.map((item) => [item.$id, item])).values()];
  return (
    <section className="mt-16" aria-labelledby="related-heading">
      <h2
        id="related-heading"
        className="font-display text-3xl font-bold text-text"
      >
        More from this category
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {uniqueItems.map((p) => (
          <li key={p.$id} className="h-full">
            <Link
              to={PATHS.product(p.category, p.group, p.slug)}
              className="group/card flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <div className="aspect-[3/4] overflow-hidden bg-surface-alt">
                {getMainImageUrl(p) && (
                  <img
                    src={getMainImageUrl(p)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105 motion-reduce:transition-none"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                <p className="line-clamp-2 min-h-[2.5rem] font-medium leading-snug text-text transition-colors duration-200 group-hover/card:text-accent">
                  {p.name}
                </p>
                <p className="mt-auto pt-2 text-sm font-semibold tabular-nums text-text">
                  {p.priceFormat || money(p.price)}
                </p>
              </div>
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
  const block = "animate-pulse rounded bg-surface-alt";
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
      <h1 className="font-display text-4xl font-bold text-text">
        We couldn't find that product
      </h1>
      <p className="mt-3 text-muted">
        {message || "It may have been removed, or the link may be wrong."}
      </p>
      <Link
        to={PATHS.products}
        className="mt-6 rounded-md bg-brown px-6 py-3 font-semibold text-on-brown hover:bg-brown-hover"
      >
        Browse all products
      </Link>
    </main>
  );
}