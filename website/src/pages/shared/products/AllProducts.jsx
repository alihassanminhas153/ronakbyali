import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from 'react-redux';
import { PackageSearch, RotateCcw, SearchX } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  fetchCategories,
  fetchGroups,
  fetchPriceRange,
  fetchProducts,
  resetProductFilters,
  selectCategories,
  selectGroups,
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
  ProductFilters,
  fromParams,
  hasActiveFilters,
  isNarrowed,
  toParams,
} from '../../../components/shop';
import ActionButton from '../../../ui/custom/button/ActionButton';
import useEntered from '../../../ui/custom/motion/useEntered';

const SKELETON_COUNT = 8;
const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4';

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

// Public shop page. It reads and writes productsSlice only (the same slice the admin
// Products page uses, so both pages reset the shared filters when they open).
// The filters live in the URL (?q=&category=&group=&status=&min=&max=&sort=), so a
// link, a reload and the Back button from a product page all restore the same list.
export default function AllProducts() {
  const dispatch = useAppDispatch();
  const store = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const products = useAppSelector(selectProductsList);
  const status = useAppSelector(selectProductsStatus);
  const error = useAppSelector(selectProductsError);
  const total = useAppSelector(selectProductsTotal);
  const hasMore = useAppSelector(selectProductsHasMore);
  const filters = useAppSelector(selectProductFilters);
  const categories = useAppSelector(selectCategories);
  const groups = useAppSelector(selectGroups);
  const priceRange = useAppSelector(selectPriceRange);

  const [started, setStarted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
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

  const syncUrl = () =>
    setSearchParams(toParams(store.getState().products.filters), { replace: true });

  // Filters changed: the slice clears the list, then we load page one again.
  const applyFilters = (patch) => {
    dispatch(setProductFilters(patch));
    dispatch(fetchProducts());
    syncUrl();
  };

  const onCategory = (category) => {
    applyFilters({ category, group: null });
    dispatch(fetchGroups(category ? { category } : {}));
  };

  const clearFilters = () => {
    dispatch(resetProductFilters());
    dispatch(fetchProducts());
    dispatch(fetchGroups({}));
    setSearchParams(new URLSearchParams(), { replace: true });
    setResetKey((key) => key + 1);
  };

  const loadMore = () => dispatch(fetchProducts({ append: true }));
  const retry = () => dispatch(fetchProducts());

  const countText = firstLoad
    ? 'Loading products…'
    : `${total} ${total === 1 ? 'product' : 'products'}`;

  return (
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

      <ProductFilters
        filters={filters}
        categories={categories}
        groups={groups}
        priceRange={priceRange}
        active={Boolean(hasActiveFilters(filters))}
        searching={loading && Boolean(filters.searchTerm.trim())}
        resetKey={resetKey}
        onChange={applyFilters}
        onCategory={onCategory}
        onClear={clearFilters}
      />

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
              <ProductCard key={product.$id} product={product} index={index} />
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
  );
}