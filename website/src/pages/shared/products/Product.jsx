// src/pages/shared/products/Product.jsx
//
// Routes that render this page (see App.jsx):
//   /:category/:group/:productId   (productId is the slug)
//   /:productSlug
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  Check,
  Copy,
  ShoppingCart,
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
} from "../../../store/slices/productsSlice";
import { PATHS, PRODUCT_LIST_ALIASES } from "../../../router/path";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";
import AlertPopupHost from "../../../components/shared/AlertPopupHost";
import {
  addToCart,
  addDesignsToCart,
  selectCartLines,
  selectCartUpdating,
} from "../../../store/slices/cartSlice";
import { useDesignChooser } from "../../../components/shop/DesignChooser";
import { hasDesigns } from "../../../lib/designPicks";
import {
  toggleWishlist,
  selectIsWished,
} from "../../../store/slices/wishlistSlice";
import { selectMe } from "../../../store/slices/userSlice";
import { selectSalesList } from "../../../store/slices/saleSlice";
import { getEffectivePricing } from "../../../lib/saleMath";
import ProductCheckoutDrawer from "./ProductCheckoutDrawer";
import { loadDraft } from "../../../lib/checkoutDraft";
import PageArt from "../../../ui/art/PageArt";
import useCopied from "../../../lib/useCopied";
import ProductCard from "../../../components/shop/ProductCard";
import ProductReviews from "../../../components/shop/reviews/ProductReviews";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

const LOW_STOCK_AT = 5;
const MAX_QTY_WITHOUT_LIMIT = 10;
const RESERVED_SHORT_PRODUCT_SLUGS = new Set([
  ...PRODUCT_LIST_ALIASES,
  "products",
  "p",
  "team",
  "contact",
  "privacy",
  "disclaimer",
  "faqs",
  "custom-studio",
  "create-account",
  "welcome-back",
]);

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
  const slug = slugProp ?? params.productId ?? params.productSlug ?? params.username;

  const product = useSelector(selectProductDetail);
  const status = useSelector(selectProductDetailStatus);
  const error = useSelector(selectProductDetailError);
  const related = useSelector(selectRelatedProducts);
  const navigate = useNavigate();
  const account = useSelector(selectMe);
  const authProfile = useSelector((state) => state.auth.profile);
  // Live numbers counted from approved reviews (the product row can lag until an admin syncs it).
  const [ratingSummary, setRatingSummary] = useState(null);

  useEffect(() => {
    const pageTitle = product?.slug === slug
      ? product.name
      : status === "failed"
        ? "Product not found"
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
    <>
      <AlertPopupHost />
      <main className="mx-auto w-full max-w-6xl bg-bg px-4 pb-20 pt-6 text-text sm:px-6 lg:px-8">
        <Breadcrumb product={product} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <Gallery key={product.$id} product={product} />
          <Details
            key={product.$id}
            product={product}
            ratingSummary={ratingSummary?.productId === product.$id ? ratingSummary : null}
          />
        </div>

        <ProductReviews
          key={product.$id}
          product={product}
          profile={account || authProfile || null}
          onRequireLogin={() => navigate("/welcome-back")}
          onSummary={setRatingSummary}
        />
        {related.length > 0 && <Related items={related} />}
      </main>
    </>
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

function ProductRating({ product, summary }) {
  const count = Number(summary ? summary.total : product.reviewCount) || 0;
  const rating = Number(summary ? summary.average : product.ratingAverage) || 0;

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

function Details({ product, ratingSummary }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sales = useSelector(selectSalesList);
  const [qty, setQty] = useState(1);
  const needsDesign = hasDesigns(product);
  const chooser = useDesignChooser();
  const [draftPicks, setDraftPicks] = useState([]);
  const [added, setAdded] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [checkoutMounted, setCheckoutMounted] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(0);
  const closeTimer = useRef(null);
  const checkoutTrigger = useRef(null);
  const reopened = useRef(false);
  const location = useLocation();
  const { copied, copy } = useCopied();

  const wished = useSelector(selectIsWished(product.$id));
  const account = useSelector(selectMe);
  const authProfile = useSelector((state) => state.auth.profile);
  const lines = useSelector(selectCartLines);
  const updating = useSelector(selectCartUpdating);
  const inCart = lines
    .filter((l) => l.productId === product.$id)
    .reduce((n, l) => n + (Number(l.quantity) || 0), 0);

  const pricing = getEffectivePricing(product, sales);
  const price = pricing.price;
  const original = pricing.originalPrice;
  const hasDiscount = original > price;
  const percent = hasDiscount
    ? Math.round(pricing.discountPercentage || ((original - price) / original) * 100)
    : 0;

  const remaining = product.remaining == null ? null : Number(product.remaining);
  const inStock = product.isCustom === true || (product.status !== "outOfStock" && (remaining == null || remaining > 0));
  // Units still available after what is already in this person's cart.
  const room = remaining != null ? Math.max(0, remaining - inCart) : MAX_QTY_WITHOUT_LIMIT;
  const maxQty = Math.max(1, room);
  const atLimit = inStock && remaining != null && room === 0;
  const lowStock = inStock && remaining != null && remaining <= LOW_STOCK_AT;
  const stockCount = remaining != null && Number.isFinite(remaining)
    ? formatRemaining(remaining, 500)
    : "";

  const step = (d) => setQty((q) => Math.min(maxQty, Math.max(1, q + d)));

  const finishAdd = (result, thunk) => {
    if (thunk.fulfilled.match(result)) {
      setAdded(true);
      setQty(1);
      window.setTimeout(() => setAdded(false), 2000);
    } else if (result.payload && result.payload !== LOGIN_REQUIRED) {
      setCartError(String(result.payload));
    }
  };

  const handleAdd = async () => {
    setCartError(null);
    // A product with designs asks for the designs first, then adds one line per design.
    if (needsDesign) {
      chooser.ask(product, {
        confirmLabel: "Add to cart",
        onConfirm: async (picks) => {
          const result = await dispatch(addDesignsToCart({ productId: product.$id, picks, toast: true }));
          finishAdd(result, addDesignsToCart);
        },
      });
      return;
    }
    // Guests: the thunk opens the login modal and rejects with LOGIN_REQUIRED.
    const result = await dispatch(
      addToCart({ productId: product.$id, quantity: qty, toast: true })
    );
    finishAdd(result, addToCart);
  };

  // Optimistic: the heart flips at once and rolls back if saving fails.
  const handleWish = () => dispatch(toggleWishlist({ productId: product.$id }));
  const copyProductLink = async () => {
    const path = RESERVED_SHORT_PRODUCT_SLUGS.has(product.slug)
      ? PATHS.product(product.category, product.group, product.slug)
      : PATHS.productShort(product.slug);
    const success = await copy(
      "product-link",
      new URL(path, window.location.origin).toString()
    );
    setCopyError(!success);
  };
  const openCustomOrder = () => navigate(PATHS.customize(product.slug));

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
    if (draft?.productId === product.$id) {
      setQty(Math.min(maxQty, Math.max(1, Number(draft.quantity) || 1)));
      if (Array.isArray(draft.designs)) setDraftPicks(draft.designs);
    }
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
      <ProductRating product={product} summary={ratingSummary} />
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 font-display text-4xl font-bold leading-tight text-text sm:text-5xl">
          {product.name}
        </h1>
        <button
          type="button"
          onClick={copyProductLink}
          aria-label={copied === "product-link" ? "Product link copied" : "Copy product link"}
          title={copied === "product-link" ? "Copied" : "Copy product link"}
          className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copied === "product-link" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied === "product-link" ? "Product link copied." : copyError ? "Could not copy the product link." : ""}
      </span>
      {copyError && <p role="alert" className="mt-1 text-xs text-error">Could not copy the link. Please copy it from the address bar.</p>}

      {/* price */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold tabular-nums text-text">
          {pricing.sale ? money(price) : product.priceFormat || money(price)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-lg tabular-nums text-muted line-through">
              {money(original)}
            </span>
            <span className="rounded bg-accent px-2 py-0.5 text-sm font-semibold text-on-accent">
              {percent}% off
            </span>
            {pricing.sale?.name && (
              <span className="rounded bg-accent-soft px-2 py-0.5 text-sm font-medium text-accent">
                {pricing.sale.name}
              </span>
            )}
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
        {product.isCustom === true
          ? "Made to order"
          : !inStock
          ? "Out of stock"
          : stockCount
            ? `${lowStock ? "Only " : ""}${stockCount} left in stock`
            : "In stock"}
      </p>

      {/* buy box */}
      {product.isCustom === true ? (
        <button type="button" onClick={openCustomOrder} className="mt-4 h-12 w-full rounded-md bg-accent px-6 font-semibold text-on-accent transition hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          Customize
        </button>
      ) : (
      <>
      <div className="mt-4 flex flex-wrap items-stretch gap-3">
        {!needsDesign && (
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
        )}

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
        <div className="flex min-w-0 flex-1 gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!inStock || atLimit || updating}
            aria-label={!inStock ? "Out of stock" : atLimit ? "Maximum in your cart" : updating ? "Adding to cart" : added ? "Added to cart" : "Add to cart"}
            className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-brown px-2 font-semibold text-on-brown transition hover:bg-brown-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-12 sm:px-4"
          >
            <ShoppingCart size={18} aria-hidden="true" />
            <span className="hidden sm:inline">
              {!inStock ? "Out of stock" : atLimit ? "Maximum in your cart" : updating ? "Adding..." : added ? "Added to cart" : "Add to cart"}
            </span>
          </button>
        </div>

      </div>

      <button
        type="button"
        onClick={openCheckout}
        disabled={!inStock || qty > room}
        className="mt-3 h-12 w-full rounded-md bg-accent px-6 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Buy now
      </button>
      </>
      )}

      {product.isCustom !== true && inCart > 0 && (
        <p className="mt-3 text-sm text-muted">
          {inCart} in your cart
        </p>
      )}
      {product.isCustom !== true && cartError && (
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
            {product.tags.map((t, i) => (
              <li key={`${i}-${t}`}>
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
        designs={draftPicks}
        account={account || authProfile}
      />
      {chooser.element}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* related                                                             */
/* ------------------------------------------------------------------ */

// One related product, with the same cart / wishlist buttons as the shop grid.
function RelatedCard({ product, index }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wished = useSelector(useMemo(() => selectIsWished(product.$id), [product.$id]));
  const lines = useSelector(selectCartLines);
  const updating = useSelector(selectCartUpdating);
  const inCart = lines.some((l) => l.productId === product.$id);

  return (
    <ProductCard
      product={product}
      index={index}
      inCart={inCart}
      inWishlist={wished}
      cartBusy={Boolean(updating)}
      onAddToCart={(p) => dispatch(addToCart({ productId: p.$id, quantity: 1, toast: true }))}
      onToggleWishlist={(p) => dispatch(toggleWishlist({ productId: p.$id }))}
      onCustomize={(p) => navigate(PATHS.customize(p.slug))}
    />
  );
}

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
        {uniqueItems.map((p, i) => (
          <RelatedCard key={p.$id} product={p} index={i} />
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
    <main className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
      <PageArt name="noProducts" size="md" decorative className="mb-5" />
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