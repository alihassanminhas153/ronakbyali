import PageHeader from '../../../ui/custom/PageHeader';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Boxes, LayoutList, Plus, RefreshCw, Shapes, Tag } from 'lucide-react';

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
  CustomProductForm,
  ProductForm,
  ProductTable,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  StockTab,
  useProductAnalytics,
  SalesDrawer,
} from '../../../components/admin/products';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Modal from '../../../ui/custom/modal/Modal';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import { OrderFormArt, ProductsArt } from '../../../ui/art';

const TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal products' },
  { value: 'custom', label: 'Custom products' },
];

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
  const [chooserOpen, setChooserOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('new');
  const [salesOpen, setSalesOpen] = useState(false);
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

  const openAdd = () => setChooserOpen(true);
  const chooseAddType = (mode) => {
    setEditing(null);
    setFormMode(mode);
    setFormKey((k) => k + 1);
    setFormOpen(true);
    setChooserOpen(false);
  };
  const openEdit = (product) => {
    setEditing(product);
    setFormMode(product.isCustom ? 'custom' : 'new');
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
  const filtered = Boolean(filters.category || filters.status || filters.isCustom !== null || filters.searchTerm);
  const busy = refreshing || loading || analytics.loading;

  const tabs = [
    { id: 'products', label: 'Products', icon: LayoutList, color: 'var(--accent-tone-1)', badge: analytics.rows.length || undefined },
    { id: 'stock', label: 'Stock', icon: Boxes, color: 'var(--accent-tone-2)' },
    { id: 'categories', label: 'Categories', icon: Shapes, color: 'var(--accent-tone-6)' },
    { id: 'pricing', label: 'Pricing', icon: Tag, color: 'var(--accent-tone-3)' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        art="products"
        title="Products"
        subtitle={loading && !products.length ? 'Loading…' : (
          <>
            <CountUp value={total} className="font-semibold text-text" /> {total === 1 ? 'product' : 'products'}
            {filtered ? ' match' : ''}
          </>
        )}
        actions={(
          <div className="flex items-center gap-3">
            <ActionButton icon={Plus} onClick={openAdd}>Add product</ActionButton>
            <ActionButton variant="secondary" icon={Tag} onClick={() => setSalesOpen(true)}>Sales</ActionButton>
            {ago && (
              <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
                <span className={`h-1.5 w-1.5 rounded-full ${busy ? 'animate-pulse bg-accent-tone-3' : 'bg-accent-tone-7'}`} />
                {busy ? 'Syncing…' : `Updated ${ago}`}
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              title="Fetch the latest products from the database"
              className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
            >
              <RefreshCw size={16} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
              <span>{busy ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        )}
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'products' && (
        <TabPanel key="products" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_12rem]">
            <SearchInput
              size="sm"
              value={filters.searchTerm}
              onSearch={onSearch}
              loading={loading && Boolean(filters.searchTerm)}
              placeholder="Search name, category, tags"
              label="Search products"
              className="sm:col-span-2 xl:col-span-1"
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
              aria-label="Filter by product type"
              placeholder="All product types"
              options={TYPE_OPTIONS}
              value={filters.isCustom === true ? 'custom' : filters.isCustom === false ? 'normal' : ''}
              onChange={(value) => applyFilters({ isCustom: value ? value === 'custom' : null })}
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
        formMode === 'custom' ? (
          <CustomProductForm
            key={formKey}
            open={formOpen}
            product={editing}
            categories={categories}
            groups={groups}
            onClose={() => setFormOpen(false)}
            onSaved={onSaved}
          />
        ) : (
          <ProductForm
            key={formKey}
            open={formOpen}
            product={editing}
            mode="new"
            categories={categories}
            groups={groups}
            onClose={() => setFormOpen(false)}
            onSaved={onSaved}
          />
        )
      )}

      {chooserOpen && (
        <Modal
          open={chooserOpen}
          onClose={() => setChooserOpen(false)}
          title="What do you want to add?"
          description="Choose the type of product you want to create."
          layer="z-[60]"
        >
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseAddType('new')}
                className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ProductsArt className="mx-auto mb-3 h-28 w-full" decorative />
                <span className="block font-semibold text-text">New product</span>
                <span className="mt-1 block text-sm text-muted">A normal product with stock.</span>
              </button>
              <button
                type="button"
                onClick={() => chooseAddType('custom')}
                className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
              >
                <OrderFormArt className="mx-auto mb-3 h-28 w-full" decorative />
                <span className="block font-semibold text-text">Custom product</span>
                <span className="mt-1 block text-sm text-muted">Made to order; customers pick the customizations.</span>
              </button>
            </div>
        </Modal>
      )}

      <SalesDrawer open={salesOpen} onClose={() => setSalesOpen(false)} />

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