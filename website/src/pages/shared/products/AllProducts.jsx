import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from 'react-redux';
import { PackageSearch, RotateCcw, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { addToCart, selectCartLines, selectCartUpdating } from '../../../store/slices/cartSlice';
import { selectWishlistIds, toggleWishlist } from '../../../store/slices/wishlistSlice';
import {
  fetchCategories,
  fetchGroups,
  fetchPriceRange,
  fetchProducts,
  resetProductFilters,
  selectCategoryOptions,
  selectGroupOptions,
  selectPriceRange,
  selectProductFilters,
  selectProductsError,
  selectProductsHasMore,
  selectProductsList,
  selectProductsStatus,
  selectProductsTotal,
  setProductFilters,
} from '../../../store/slices/productsSlice';

import {
  ProductCard,
  ProductCardSkeleton,
  fromParams,
  hasActiveFilters,
  isNarrowed,
  toParams,
} from '../../../components/shop';
import FilterDrawer from '../../../components/shop/FilterDrawer';
import {
  FILTER_KEYS as K,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  drawerFilterCount,
  isSet,
} from '../../../components/shop/shopMeta';
import Header from '../../../components/shared/header/Header';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import useEntered from '../../../ui/custom/motion/useEntered';

const SKELETON_COUNT = 8;
const GRID = 'grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 xl:grid-cols-4';
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const SEARCH_DELAY = 350;

const labelFor = (options, value) => options.find((o) => o.value === value)?.label ?? String(value);

function StateCard({ icon: Icon, title, message, tone = 'neutral', children }) {
  const entered = useEntered();
  const error = tone === 'error';
  return (
    <div
      role={error ? 'alert' : undefined}
      className={`flex flex-col items-center gap-3 rounded-lg border px-6 py-12 text-center transition duration-300 ease-out motion-reduce:transition-none ${
        error ? 'border-error/40 bg-error/10' : 'border-border bg-surface'
      } ${entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <Icon size={28} className={error ? 'text-error' : 'text-muted'} aria-hidden="true" />
      <p className="font-medium text-text">{title}</p>
      {message && <p className="max-w-md text-sm text-muted">{message}</p>}
      {children}
    </div>
  );
}

function AppliedChip({ label, onRemove }) {
  return (
    <li>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className={`group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-2 text-sm text-text transition-colors duration-200 hover:bg-border/40 motion-reduce:transition-none ${FOCUS}`}
      >
        {label}
        <X size={14} className="text-muted transition-colors group-hover:text-text" aria-hidden="true" />
      </button>
    </li>
  );
}

// Public shop page. It reads and writes productsSlice only (the same slice the admin
// Products page uses, so both pages reset the shared filters when they open).
// The filters live in the URL (?q=&category=&group=&status=&min=&max=&sort=), so a
// link, a reload and the Back button from a product page all restore the same list.
//
// Layout: search bar + category and group dropdowns + Filters button on top,
// every other filter (sort, availability, price) in the drawer that slides in from the right.
export default function AllProducts({ pages = [] }) {
  const dispatch = useAppDispatch();
  const store = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const products = useAppSelector(selectProductsList);
  const status = useAppSelector(selectProductsStatus);
  const error = useAppSelector(selectProductsError);
  const total = useAppSelector(selectProductsTotal);
  const hasMore = useAppSelector(selectProductsHasMore);
  const filters = useAppSelector(selectProductFilters);
  const categoryOptions = useAppSelector(selectCategoryOptions);
  const groupOptions = useAppSelector(selectGroupOptions);
  const priceRange = useAppSelector(selectPriceRange);
  const cartLines = useAppSelector(selectCartLines);
  const cartBusy = useAppSelector(selectCartUpdating);
  const wishlistIds = useAppSelector(selectWishlistIds);
  const categoryValues = categoryOptions.map((option) => option?.value ?? option?.label ?? '');
  const groupValues = groupOptions.map((option) => option?.value ?? option?.label ?? '');

  const [started, setStarted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [term, setTerm] = useState(() => fromParams(searchParams)[K.search] ?? '');
  const entered = useEntered();

  // Open: start from the URL, not from whatever filters the last page left behind.
  useEffect(() => {
    const initial = fromParams(searchParams);
    dispatch(resetProductFilters());
    dispatch(setProductFilters(initial));
    dispatch(fetchProducts());
    dispatch(fetchCategories());
    dispatch(fetchGroups(initial.category ? { category: initial.category } : {}));
    dispatch(fetchPriceRange({}));
    setStarted(true);
    // The URL is only read once, on open. Later changes go the other way (filters -> URL).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const loading = status === 'loading';
  const failed = status === 'failed';
  const empty = products.length === 0;
  // Until the first request is under way, the list may still hold rows from another page.
  const firstLoad = !started || (empty && (status === 'idle' || loading));
  const narrowed = isNarrowed(filters);

  useEffect(() => {
    const syncSearchSelectSize = () => {
      const height = window.innerWidth >= 1024 ? '3.25rem' : '3rem';
      const buttons = document.querySelectorAll('[aria-label="Category"], [aria-label="Group"]');

      buttons.forEach((button) => {
        button.style.minHeight = height;
        button.style.height = height;
        button.style.paddingLeft = '0.75rem';
        button.style.paddingRight = '0.75rem';
        button.style.fontSize = '0.875rem';
      });
    };

    syncSearchSelectSize();
    window.addEventListener('resize', syncSearchSelectSize);
    return () => window.removeEventListener('resize', syncSearchSelectSize);
  }, [categoryOptions, groupOptions]);

  const syncUrl = () =>
    setSearchParams(toParams(store.getState().products.filters), { replace: true });

  // Filters changed: the slice clears the list, then we load page one again.
  const applyFilters = (patch) => {
    dispatch(setProductFilters(patch));
    dispatch(fetchProducts());
    syncUrl();
  };

  const onCategory = (category) => {
    applyFilters({ [K.category]: category, [K.group]: null });
    dispatch(fetchGroups(category ? { category } : {}));
  };
  const onGroup = (group) => applyFilters({ [K.group]: group });
  const addProductToCart = (product) =>
    dispatch(addToCart({ productId: product.$id, quantity: 1, toast: true }));
  const toggleProductWishlist = (product) => dispatch(toggleWishlist({ productId: product.$id }));

  const clearFilters = () => {
    dispatch(resetProductFilters());
    dispatch(fetchProducts());
    dispatch(fetchGroups({}));
    setSearchParams(new URLSearchParams(), { replace: true });
    setTerm('');
  };

  const applyDrawer = (patch) => {
    applyFilters(patch);
    setDrawerOpen(false);
  };

  const loadMore = () => dispatch(fetchProducts({ append: true }));
  const retry = () => dispatch(fetchProducts());

  // Search: wait for a pause in typing, then filter. Enter filters straight away.
  const appliedSearch = (filters[K.search] ?? '').trim();
  useEffect(() => {
    if (!started || term.trim() === appliedSearch) return undefined;
    const id = setTimeout(() => applyFilters({ [K.search]: term.trim() }), SEARCH_DELAY);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, appliedSearch, started]);

  const submitSearch = (event) => {
    event.preventDefault();
    if (term.trim() !== appliedSearch) applyFilters({ [K.search]: term.trim() });
  };

  const clearSearch = () => {
    setTerm('');
    if (appliedSearch) applyFilters({ [K.search]: '' });
  };

  // What is currently applied, shown as removable chips under the toolbar.
// (Category and group are shown by their dropdowns, so they get no chip.)
  const chips = [];
  if (appliedSearch) chips.push({ id: 'search', label: `Search: ${appliedSearch}`, remove: clearSearch });
  if (isSet(filters[K.status]))
    chips.push({
      id: 'status',
      label: labelFor(STATUS_OPTIONS, filters[K.status]),
      remove: () => applyFilters({ [K.status]: '' }),
    });
  if (isSet(filters[K.min]) || isSet(filters[K.max])) {
    const min = filters[K.min];
    const max = filters[K.max];
    const label =
      isSet(min) && isSet(max) ? `Price: ${min} to ${max}` : isSet(min) ? `Price: from ${min}` : `Price: up to ${max}`;
    chips.push({
      id: 'price',
      label,
      remove: () => applyFilters({ [K.min]: null, [K.max]: null }),
    });
  }
  if (isSet(filters[K.sort]))
    chips.push({
      id: 'sort',
      label: labelFor(SORT_OPTIONS, filters[K.sort]),
      remove: () => applyFilters({ [K.sort]: '' }),
    });

  const drawerCount = drawerFilterCount(filters);
  const countText = firstLoad
    ? 'Loading products…'
    : `${total} ${total === 1 ? 'product' : 'products'}`;

  return (
    <div className="min-h-dvh bg-bg text-text">
      <Header pages={pages} />
      <main className="mx-auto w-full max-w-7xl px-2 py-6 sm:px-6 lg:px-8">
        <div
          className={`space-y-6 transition-opacity duration-300 motion-reduce:transition-none ${
            entered ? 'opacity-100' : 'opacity-0'
          }`}
        >
      <header>
        <h1 className="text-2xl font-semibold text-text">Products</h1>
        <p className="mt-1 text-sm text-muted" aria-live="polite">
          {countText}
        </p>
      </header>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <form role="search" onSubmit={submitSearch} className="relative order-1 min-w-48 flex-1">
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="shop-search"
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search products"
              className="h-12 w-full rounded-lg border border-border bg-surface pl-10 pr-10 text-sm text-text placeholder:text-muted transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 motion-reduce:transition-none lg:h-[3.25rem]"
            />
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              tabIndex={term ? 0 : -1}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-opacity duration-200 hover:text-text motion-reduce:transition-none ${FOCUS} ${
                term ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </form>

          {/* Category and group dropdowns: own row on phones, inline from lg up. */}
          <div className="order-3 grid w-full grid-cols-2 gap-3 lg:order-2 lg:flex lg:w-auto">
            <div className="min-w-0 lg:w-52">
              <SearchSelect
                aria-label="Category"
                value={filters[K.category] || ''}
                onChange={(value) => onCategory(value || null)}
                options={categoryValues}
                placeholder="All categories"
                searchPlaceholder="Search categories"
                creatable={false}
                clearable
                disabled={categoryValues.length === 0}
              />
            </div>
            <div className="min-w-0 lg:w-52">
              <SearchSelect
                aria-label="Group"
                value={filters[K.group] || ''}
                onChange={(value) => onGroup(value || null)}
                options={groupValues}
                placeholder="All groups"
                searchPlaceholder="Search groups"
                creatable={false}
                clearable
                disabled={groupValues.length === 0}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            className={`order-2 inline-flex h-12 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text transition-colors duration-200 hover:bg-border/40 motion-reduce:transition-none lg:order-3 lg:h-[3.25rem] ${FOCUS}`}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            Filters
            {drawerCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">
                {drawerCount}
              </span>
            )}
          </button>
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
            {chips.map((chip) => (
              <AppliedChip key={chip.id} label={chip.label} onRemove={chip.remove} />
            ))}
            {hasActiveFilters(filters) && (
              <li>
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`rounded-md px-2 py-1 text-sm text-accent transition-colors duration-200 hover:underline motion-reduce:transition-none ${FOCUS}`}
                >
                  Clear all
                </button>
              </li>
            )}
          </ul>
        )}

        {firstLoad ? (
          <ul className={GRID} aria-busy="true">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </ul>
        ) : failed && empty ? (
          <StateCard
            tone="error"
            icon={PackageSearch}
            title="Could not load products."
            message={error || 'Check your connection and try again.'}
          >
            <ActionButton variant="secondary" icon={RotateCcw} onClick={retry}>
              Try again
            </ActionButton>
          </StateCard>
        ) : empty ? (
          narrowed ? (
            <StateCard
              icon={SearchX}
              title="No products match your filters."
              message="Try a different search or remove a filter."
            >
              <ActionButton variant="secondary" icon={RotateCcw} onClick={clearFilters}>
                Clear filters
              </ActionButton>
            </StateCard>
          ) : (
            <StateCard
              icon={PackageSearch}
              title="No products yet."
              message="New products will show up here as soon as they are added."
            />
          )
        ) : (
          <>
            <ul className={GRID}>
              {products.map((product, index) => (
                <ProductCard
                  key={product.$id}
                  product={product}
                  index={index}
                  inCart={cartLines.some((line) => line.productId === product.$id)}
                  inWishlist={wishlistIds.includes(product.$id)}
                  cartBusy={cartBusy}
                  onAddToCart={addProductToCart}
                  onToggleWishlist={toggleProductWishlist}
                />
              ))}
            </ul>

            {(hasMore || failed) && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted">
                  Showing {products.length} of {total}
                </p>
                {failed && (
                  <p role="alert" className="text-sm text-error">
                    {error || 'Could not load more products.'}
                  </p>
                )}
                <ActionButton variant="secondary" loading={loading} onClick={loadMore}>
                  {failed ? 'Try again' : 'Load more'}
                </ActionButton>
              </div>
            )}
          </>
        )}
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        priceRange={priceRange}
        onApply={applyDrawer}
        onReset={() => {
          clearFilters();
          setDrawerOpen(false);
        }}
      />
        </div>
      </main>
    </div>
  );
}