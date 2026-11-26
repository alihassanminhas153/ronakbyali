// src/pages/shared/products/Product.jsx
//
// Routes that render this page (see App.jsx):
//   /:category/:group/:productId   (productId is the slug)
//   /:productSlug
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowUpRight,
  Check,
  Copy,
  Heart,
  Layers,
  LayoutGrid,
  Share2,
  ShoppingCart,
  Star,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPinterestP,
  FaRedditAlien,
  FaTelegram,
  FaWhatsapp,
  FaXTwitter,
} from "react-icons/fa6";

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
import { isProductOutOfStock } from "../../../lib/productStock";
import ProductCheckoutDrawer from "./ProductCheckoutDrawer";
import { loadDraft } from "../../../lib/checkoutDraft";
import PageArt from "../../../ui/art/PageArt";
import useScrollLock from "../../../ui/custom/motion/useScrollLock";
import useCopied from "../../../lib/useCopied";
import ProductCard from "../../../components/shop/ProductCard";
import ProductReviews from "../../../components/shop/reviews/ProductReviews";
import { setCanonical, setJsonLd, setMeta } from "../../../lib/seo";

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

const productPathFor = (product) =>
  RESERVED_SHORT_PRODUCT_SLUGS.has(product.slug)
    ? PATHS.product(product.category, product.group, product.slug)
    : PATHS.productShort(product.slug);

const productShareLinks = (product, url, image) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedName = encodeURIComponent(product.name || "Product");
  const encodedMessage = encodeURIComponent(`Check out ${product.name || "this product"}: ${url}`);
  const encodedImage = encodeURIComponent(image);

  return [
    { label: "Facebook", icon: FaFacebookF, color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "WhatsApp", icon: FaWhatsapp, color: "#25D366", href: `https://wa.me/?text=${encodedMessage}` },
    { label: "X", icon: FaXTwitter, color: "var(--text)", href: `https://twitter.com/intent/tweet?text=${encodedName}&url=${encodedUrl}` },
    { label: "Telegram", icon: FaTelegram, color: "#26A5E4", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedName}` },
    { label: "LinkedIn", icon: FaLinkedinIn, color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "Pinterest", icon: FaPinterestP, color: "#E60023", href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedName}` },
    { label: "Reddit", icon: FaRedditAlien, color: "#FF4500", href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedName}` },
    { label: "Instagram", icon: FaInstagram, color: "#E4405F", href: "https://www.instagram.com/" },
  ];
};

const formatRemaining = (count, cap) => {
  const amount = Number(count);
  if (!Number.isFinite(amount)) return "";
  return amount > cap ? `${cap}+` : String(amount);
};

// Presentation only: icon per detail label and shared button styles.
const DETAIL_ICONS = { Category: LayoutGrid, Group: Layers };

const ICON_BTN =
  "grid size-10 place-items-center rounded-full border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const ICON_BTN_IDLE = "border-border text-muted hover:border-accent/60 hover:bg-accent-soft hover:text-accent";
const ICON_BTN_ACTIVE = "border-success/50 bg-success-soft text-success-fg";

function SectionTitle({ id, eyebrow, children }) {
  return (
    <div>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
      )}
      <h2 id={id} className="font-heading text-xl font-semibold tracking-tight text-text">
        {children}
      </h2>
      <span aria-hidden="true" className="mt-2 block h-0.5 w-10 rounded-full bg-thread" />
    </div>
  );
}

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
    if (product?.slug === slug) {
      const url = new URL(productPathFor(product), window.location.origin).toString();
      const image = getProductImageUrls(product)[0] || "";
      const description = product.description?.trim()
        ? `${product.description.trim().replace(/\s+/g, " ").slice(0, 155)} | Ronak By Ali`
        : `Shop ${product.name} from Ronak By Ali (Ronaq) - ready-made and custom products in Pakistan.`;
      setCanonical(url.replace(window.location.origin, "https://ronakbyali.com"));
      setMeta("description", description);
      setMeta("og:title", `${product.name} | Ronak By Ali`);
      setMeta("og:description", description, true);
      setMeta("og:type", "product", true);
      setMeta("og:url", url.replace(window.location.origin, "https://ronakbyali.com"), true);
      if (image) setMeta("og:image", image, true);
      setMeta("twitter:title", `${product.name} | Ronak By Ali`);
      setMeta("twitter:description", description);
      if (image) setMeta("twitter:image", image);
      setJsonLd("product", {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description,
        image: image ? [image] : undefined,
        brand: { "@type": "Brand", name: "Ronak By Ali" },
        category: [product.category, product.group].filter(Boolean).join(" "),
        url: url.replace(window.location.origin, "https://ronakbyali.com"),
        offers: {
          "@type": "Offer",
          url: url.replace(window.location.origin, "https://ronakbyali.com"),
          priceCurrency: "PKR",
          price: Number(product.price) || 0,
          availability: isProductOutOfStock(product)
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        },
      });
    }
  }, [product, slug, status]);

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
      <main className="mx-auto w-full max-w-6xl bg-bg px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-6 text-text sm:px-6 md:pb-20 lg:px-8">
        <Breadcrumb product={product} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <Gallery key={`gallery-${product.$id}`} product={product} />
          <Details
            key={`details-${product.$id}`}
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
  useScrollLock(viewerOpen);

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
    <div className="mb-4 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 self-start rounded-full border border-border bg-surface px-3.5 py-1.5 shadow-soft">
      <StarRating
        rating={rating}
        label={count ? `${rating.toFixed(1)} out of 5 stars` : "No ratings yet"}
        size={16}
      />
      {count > 0 ? (
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className="font-semibold tabular-nums text-text">{rating.toFixed(1)}</span>
          <span aria-hidden="true" className="h-3.5 w-px bg-border" />
          <span>{count} {count === 1 ? "review" : "reviews"}</span>
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
  const [reviewsReached, setReviewsReached] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareError, setShareError] = useState("");
  const [cartError, setCartError] = useState(null);
  const [checkoutMounted, setCheckoutMounted] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(0);
  const closeTimer = useRef(null);
  const checkoutTrigger = useRef(null);
  const reopened = useRef(false);
  const shareMenuRef = useRef(null);
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
  const inStock = !isProductOutOfStock(product) && (product.isCustom === true || remaining == null || remaining > 0);
  // Units still available after what is already in this person's cart.
  const room = remaining != null ? Math.max(0, remaining - inCart) : MAX_QTY_WITHOUT_LIMIT;
  const maxQty = Math.max(1, room);
  const atLimit = inStock && remaining != null && room === 0;
  const lowStock = inStock && remaining != null && remaining <= LOW_STOCK_AT;
  const stockCount = remaining != null && Number.isFinite(remaining)
    ? formatRemaining(remaining, 500)
    : "";
  const productUrl = new URL(productPathFor(product), window.location.origin).toString();
  const shareImage = getProductImageUrls(product)[0] || "";
  const shareLinks = productShareLinks(product, productUrl, shareImage);
  const canShareFromDevice = typeof navigator !== "undefined" && typeof navigator.share === "function";

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
    const success = await copy(
      "product-link",
      productUrl
    );
    setCopyError(!success);
    setShareError(success ? "" : "Could not copy the product link.");
  };
  const shareWithDevice = async () => {
    if (!canShareFromDevice) {
      await copyProductLink();
      setShareOpen(false);
      return;
    }
    try {
      await navigator.share({
        title: product.name,
        text: `Check out ${product.name}`,
        url: productUrl,
      });
      setShareOpen(false);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setShareError("Could not open device sharing. Choose a platform below.");
      }
    }
  };
  const openCustomOrder = () => {
    if (!inStock) return;
    navigate(PATHS.customize(product.slug));
  };

  const openCheckout = () => {
    if (!inStock || qty > room) return;
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

  useEffect(() => {
    if (!shareOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!shareMenuRef.current?.contains(event.target)) setShareOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShareOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [shareOpen]);

  useEffect(() => {
    const reviews = document.getElementById("reviews");
    if (!reviews || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setReviewsReached(entry.isIntersecting),
      { rootMargin: "0px 0px -96px 0px" }
    );
    observer.observe(reviews);
    return () => observer.disconnect();
  }, [product.$id]);

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
        <div className="relative flex shrink-0 gap-2" ref={shareMenuRef}>
          <button
            type="button"
            onClick={copyProductLink}
            aria-label={copied === "product-link" ? "Product link copied" : "Copy product link"}
            title={copied === "product-link" ? "Copied" : "Copy product link"}
            className={`${ICON_BTN} ${copied === "product-link" ? ICON_BTN_ACTIVE : ICON_BTN_IDLE}`}
          >
            {copied === "product-link" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setShareError("");
              setShareOpen((open) => !open);
            }}
            aria-label="Share this product"
            aria-haspopup="dialog"
            aria-expanded={shareOpen}
            title="Share this product"
            className={`${ICON_BTN} ${shareOpen ? "border-accent bg-accent-soft text-accent" : ICON_BTN_IDLE}`}
          >
            <Share2 size={18} aria-hidden="true" />
          </button>
          {shareOpen && (
            <div
              role="dialog"
              aria-label={`Share ${product.name}`}
              className="absolute right-0 top-full z-30 mt-3 w-[min(20rem,calc(100vw-2rem))] animate-rise rounded-2xl border border-border bg-surface p-4 shadow-[0_18px_48px_-12px_rgba(0,0,0,0.35)]"
            >
              <span
                aria-hidden="true"
                className="absolute -top-1.5 right-4 size-3 rotate-45 border-l border-t border-border bg-surface"
              />
              <p className="font-heading text-sm font-semibold text-text">Share this product</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted">{product.name}</p>

              <div className="mt-3 flex items-center gap-1 rounded-xl border border-border bg-bg p-1 transition-colors focus-within:border-accent">
                <input
                  readOnly
                  value={productUrl.replace(/^https?:\/\//i, "")}
                  aria-label="Product link"
                  onFocus={(event) => event.target.select()}
                  onCopy={(event) => {
                    event.preventDefault();
                    copy("product-link", productUrl);
                  }}
                  className="!min-h-0 min-w-0 flex-1 !border-0 !bg-transparent !px-2.5 !py-2 !text-xs text-muted outline-none"
                />
                <button
                  type="button"
                  onClick={copyProductLink}
                  aria-label="Copy product link"
                  title="Copy product link"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    copied === "product-link"
                      ? "bg-success-soft text-success-fg"
                      : "bg-brown text-on-brown hover:bg-brown-hover"
                  }`}
                >
                  {copied === "product-link" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                  {copied === "product-link" ? "Copied" : "Copy"}
                </button>
              </div>

              <button
                type="button"
                onClick={shareWithDevice}
                aria-label="Share with device"
                title="Share with device"
                className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent-soft text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Share2 size={18} aria-hidden="true" />
                Share with device
              </button>

              <div className="my-3.5 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">or share on</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                {shareLinks.map(({ label, icon: Icon, color, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Share on ${label}`}
                    title={`Share on ${label}`}
                    style={{ "--brand": color }}
                    className="group flex flex-col items-center gap-1.5 rounded-xl text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="grid size-11 place-items-center rounded-full border border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] text-(--brand) transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-[color-mix(in_srgb,var(--brand)_20%,transparent)] group-hover:shadow-soft motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-medium leading-none">{label}</span>
                  </a>
                ))}
              </div>
              {shareError && <p role="alert" className="mt-3 text-xs text-error">{shareError}</p>}
            </div>
          )}
        </div>
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
        {!inStock
          ? "Out of stock"
          : product.isCustom === true
          ? "Made to order"
          : stockCount
            ? `${lowStock ? "Only " : ""}${stockCount} left in stock`
            : "In stock"}
      </p>

      {/* buy box */}
      {product.isCustom === true ? (
        <button type="button" onClick={openCustomOrder} disabled={!inStock} className="mt-4 hidden h-12 w-full rounded-md bg-accent px-6 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:block">
          {inStock ? "Customize" : "Out of stock"}
        </button>
      ) : (
      <>
      <div className="mt-4 hidden flex-wrap items-stretch gap-3 md:flex">
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
        className="mt-3 hidden h-12 w-full rounded-md bg-accent px-6 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:block"
      >
        {!inStock ? "Out of stock" : `Buy now · ${pricing.sale ? money(price) : product.priceFormat || money(price)}`}
      </button>
      </>
      )}

      <div
        aria-hidden={reviewsReached}
        inert={reviewsReached}
        className={`fixed inset-x-0 bottom-0 z-[45] border-t border-border bg-surface px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
          reviewsReached ? "pointer-events-none translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <div className="flex items-center gap-2">
            {product.isCustom !== true && !needsDesign && (
              <div className="flex h-11 shrink-0 items-center rounded-md border border-border bg-bg" role="group" aria-label="Quantity">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={!inStock || qty <= 1}
                  aria-label="Decrease quantity"
                  className="h-full w-9 text-lg text-text disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm tabular-nums text-text" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={!inStock || qty >= maxQty}
                  aria-label="Increase quantity"
                  className="h-full w-9 text-lg text-text disabled:opacity-40"
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
              className="grid size-11 shrink-0 place-items-center rounded-md border border-border text-text transition hover:border-accent hover:text-accent"
            >
              <Heart size={19} fill={wished ? "currentColor" : "none"} aria-hidden="true" />
            </button>
            {product.isCustom !== true && (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!inStock || atLimit || updating}
                  aria-label={!inStock ? "Out of stock" : atLimit ? "Maximum in your cart" : updating ? "Adding to cart" : added ? "Added to cart" : "Add to cart"}
                  className="grid size-11 shrink-0 place-items-center rounded-md bg-brown text-on-brown transition hover:bg-brown-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ShoppingCart size={19} aria-hidden="true" />
                </button>
            )}
          </div>
          <button
            type="button"
            onClick={product.isCustom === true ? openCustomOrder : openCheckout}
            disabled={!inStock || (product.isCustom !== true && qty > room)}
            className="h-11 w-full min-w-0 rounded-md bg-accent px-3 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {product.isCustom === true
              ? (inStock ? "Customize" : "Out of stock")
              : !inStock
                ? "Out of stock"
                : `Buy now · ${pricing.sale ? money(price) : product.priceFormat || money(price)}`}
          </button>
        </div>
      </div>

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
        <section className="mt-10 border-t border-border pt-8" aria-labelledby="product-description-heading">
          <SectionTitle id="product-description-heading" eyebrow="The story">
            About this product
          </SectionTitle>
          <p className="mt-4 max-w-prose whitespace-pre-line text-[15px] leading-7 text-muted sm:text-base sm:leading-8">
            {product.description}
          </p>
        </section>
      )}

      {/* product categories */}
      {categories.length > 0 && (
        <section className="mt-10 border-t border-border pt-8" aria-labelledby="product-details-heading">
          <SectionTitle id="product-details-heading" eyebrow="At a glance">
            Product details
          </SectionTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {categories.map(({ label, value, to }) => {
              const DetailIcon = DETAIL_ICONS[label] || Tag;
              return (
                <Link
                  key={label}
                  to={to}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
                    <DetailIcon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</span>
                    <span className="mt-0.5 block break-words font-medium text-text">{value}</span>
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="shrink-0 text-muted opacity-60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* tags */}
      {product.tags?.length > 0 && (
        <section className="mt-10 border-t border-border pt-8" aria-labelledby="product-keywords-heading">
          <SectionTitle id="product-keywords-heading" eyebrow="Keep exploring">
            Explore by keyword
          </SectionTitle>
          <ul className="mt-4 flex flex-wrap gap-2">
            {product.tags.map((t, i) => (
              <li key={`${i}-${t}`}>
                <Link
                  to={`${PATHS.products}?q=${encodeURIComponent(t)}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-2.5 pr-3.5 text-sm font-medium text-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent-soft hover:text-accent hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-surface-alt text-muted transition-colors group-hover:bg-accent group-hover:text-on-accent">
                    <Tag size={11} aria-hidden="true" />
                  </span>
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