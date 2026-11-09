import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Boxes, LayoutList, Plus, RefreshCw, Shapes, Tag } from 'lucide-react';

import {
  deleteProduct,
  fetchCategories,
  fetchGroups,
  fetchProducts,
  resetProductFilters,
  selectCategories,
  selectGroups,
  selectProductFilters,
  selectProductsHasMore,
  selectProductsList,
  selectProductsStatus,
  selectProductsTotal,
  setProductFilters,
  updateProduct,
} from '../../../store/slices/productsSlice';
import {
  CategoriesTab,
  CreationCharts,
  PricingTab,
  ProductForm,
  ProductTable,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  StockTab,
  useProductAnalytics,
} from '../../../components/admin/products';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';

const CTA_PHRASES = ['Add a new product', 'Upload product images', 'Set price and stock'];

// "just now", "25s ago", "4m ago" ... re-rendered every 10 seconds
function useTimeAgo(date) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  if (!date) return '';
  const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

// Admin > Products   (/team/:username/products)
export default function Products() {
  const dispatch = useDispatch();
  const products = useSelector(selectProductsList);
  const filters = useSelector(selectProductFilters);
  const total = useSelector(selectProductsTotal);
  const hasMore = useSelector(selectProductsHasMore);
  const status = useSelector(selectProductsStatus);
  const categoryCounts = useSelector(selectCategories);
  const groupCounts = useSelector(selectGroups);
  const analytics = useProductAnalytics();

  const [tab, setTab] = useState('products');
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0); // new key = fresh form; 0 = never opened
  const [editing, setEditing] = useState(null); // null = add
  const [toDelete, setToDelete] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  const categories = useMemo(() => Object.keys(categoryCounts || {}).sort(), [categoryCounts]);
  const groups = useMemo(() => Object.keys(groupCounts || {}).sort(), [groupCounts]);

  const loadOptions = useCallback(() => {
    dispatch(fetchCategories());
    dispatch(fetchGroups({}));
  }, [dispatch]);

  // The list is shared with the store front, so start the admin view clean.
  useEffect(() => {
    dispatch(resetProductFilters());
    dispatch(fetchProducts());
    loadOptions();
  }, [dispatch, loadOptions]);

  const applyFilters = useCallback(
    (patch) => {
      dispatch(setProductFilters(patch));
      dispatch(fetchProducts());
    },
    [dispatch]
  );
  const onSearch = useCallback((searchTerm) => applyFilters({ searchTerm }), [applyFilters]);

  // Refresh button: pull the latest rows from Appwrite (list, filter options, charts).
  const refresh = async () => {
    setRefreshing(true);
    try {
      loadOptions();
      await Promise.all([dispatch(fetchProducts()), analytics.reload()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (product) => {
    setEditing(product);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const onSaved = () => {
    const wasAdd = !editing;
    setFormOpen(false);
    if (wasAdd) dispatch(fetchProducts()); // new rows are not in the list yet
    loadOptions();
    analytics.reload();
  };

  const toggleFeatured = async (product) => {
    setBusyId(product.$id);
    try {
      await dispatch(updateProduct([product.$id, { featured: !product.featured }])).unwrap();
    } catch {
      /* the row simply keeps its old value */
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await dispatch(deleteProduct([toDelete.$id])).unwrap(); // also deletes its images
      setDeleteOpen(false);
      loadOptions();
      analytics.reload();
    } catch (err) {
      setDeleteError(typeof err === 'string' ? err : err?.message || 'Could not delete the product.');
    } finally {
      setDeleting(false);
    }
  };

  // chart data finished loading (first load or refresh) -> remember when
  useEffect(() => {
    if (!analytics.loading) setUpdatedAt(new Date());
  }, [analytics.loading]);

  const loading = status === 'loading';
  const filtered = Boolean(filters.category || filters.status || filters.searchTerm);
  const busy = refreshing || loading || analytics.loading;

  const tabs = [
    { id: 'products', label: 'Products', icon: LayoutList, color: 'var(--graph-1)', badge: analytics.rows.length || undefined },
    { id: 'stock', label: 'Stock', icon: Boxes, color: 'var(--graph-2)' },
    { id: 'categories', label: 'Categories', icon: Shapes, color: 'var(--graph-6)' },
    { id: 'pricing', label: 'Pricing', icon: Tag, color: 'var(--graph-3)' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Products</h1>
          <p className="mt-1 text-sm text-muted">
            {loading && !products.length ? (
              'Loading…'
            ) : (
              <>
                <CountUp value={total} className="font-semibold text-text" /> {total === 1 ? 'product' : 'products'}
                {filtered ? ' match' : ''}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${busy ? 'animate-pulse bg-graph-3' : 'bg-graph-7'}`} />
              {busy ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            title="Fetch the latest products from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-graph-1 hover:bg-surface-alt hover:text-graph-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{busy ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Big add button */}
      <button
        type="button"
        onClick={openAdd}
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-2xl p-5 text-left text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] sm:gap-6 sm:p-7"
      >
        {/* decorative shapes */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-white/60 transition-transform duration-500 group-hover:scale-x-100" />

        <span className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-16 sm:w-16">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-2xl border-2 border-white/70" />
          <span className="grid h-full w-full place-items-center rounded-2xl border border-white/25 bg-white/15 transition-transform duration-500 ease-out group-hover:rotate-90 group-hover:scale-105">
            <Plus size={28} strokeWidth={2.5} />
          </span>
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">New product</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-xl sm:text-3xl">
            <Typewriter phrases={CTA_PHRASES} />
          </span>
          <span className="mt-0.5 hidden text-sm text-white/75 sm:block">Fill in the details once and it goes live in your store.</span>
        </span>

        <span className="relative hidden shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 group-hover:scale-105 sm:inline-flex">
          Add product
          <ArrowRight size={16} className="group-hover:animate-nudge" />
        </span>
      </button>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'products' && (
        <TabPanel key="products" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem]">
            <SearchInput
              size="sm"
              value={filters.searchTerm}
              onSearch={onSearch}
              loading={loading && Boolean(filters.searchTerm)}
              placeholder="Search name, category, tags"
              label="Search products"
              className="sm:col-span-2 lg:col-span-1"
            />
            <SelectInput
              size="sm"
              aria-label="Filter by category"
              placeholder="All categories"
              options={categories}
              value={filters.category || ''}
              onChange={(category) => applyFilters({ category: category || null })}
              searchable
              clearable
            />
            <SelectInput
              size="sm"
              aria-label="Filter by stock"
              placeholder="Any stock"
              options={STATUS_OPTIONS}
              value={filters.status || ''}
              onChange={(value) => applyFilters({ status: value || null })}
              clearable
            />
            <SelectInput
              size="sm"
              aria-label="Sort products"
              options={SORT_OPTIONS}
              value={filters.sortBy}
              onChange={(sortBy) => applyFilters({ sortBy: sortBy || 'newest' })}
            />
          </div>

          {status === 'failed' && !products.length ? (
            <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-6 text-center text-sm text-error">
              Could not load products.{' '}
              <button type="button" onClick={() => dispatch(fetchProducts())} className="font-medium underline">Try again</button>
            </div>
          ) : products.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">{filtered ? 'No products match' : 'No products yet'}</p>
              <p className="mt-1 text-sm text-muted">
                {filtered ? 'Try a different search or clear the filters.' : 'Add your first product to get started.'}
              </p>
              {!filtered && (
                <ActionButton icon={Plus} onClick={openAdd} className="mt-5">Add product</ActionButton>
              )}
            </div>
          ) : (
            <>
              <ProductTable
                products={products}
                busyId={busyId}
                onEdit={openEdit}
                onDelete={(p) => { setToDelete(p); setDeleteError(''); setDeleteOpen(true); }}
                onToggleFeatured={toggleFeatured}
              />
              {hasMore && (
                <div className="flex justify-center">
                  <ActionButton variant="secondary" loading={loading} onClick={() => dispatch(fetchProducts({ append: true }))}>Load more</ActionButton>
                </div>
              )}
            </>
          )}

          <CreationCharts rows={analytics.rows} />
        </TabPanel>
      )}

      {tab !== 'products' && analytics.error && !analytics.rows.length ? (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-6 text-center text-sm text-error">
          {analytics.error}{' '}
          <button type="button" onClick={analytics.reload} className="font-medium underline">Try again</button>
        </div>
      ) : (
        <>
          {tab === 'stock' && <TabPanel key="stock"><StockTab rows={analytics.rows} /></TabPanel>}
          {tab === 'categories' && <TabPanel key="categories"><CategoriesTab rows={analytics.rows} /></TabPanel>}
          {tab === 'pricing' && <TabPanel key="pricing"><PricingTab rows={analytics.rows} /></TabPanel>}
        </>
      )}

      {formKey > 0 && (
        <ProductForm
          key={formKey}
          open={formOpen}
          product={editing}
          categories={categories}
          groups={groups}
          onClose={() => setFormOpen(false)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        danger
        busy={deleting}
        error={deleteError}
        title="Delete product?"
        message={toDelete ? `“${toDelete.name}” and its images will be removed permanently.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}