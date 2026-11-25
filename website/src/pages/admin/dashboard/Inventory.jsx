import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, ChevronRight, ImageOff, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSalesList } from '../../../store/slices/saleSlice';

import {
  deleteProduct,
  fetchCategories,
  fetchGroups,
  fetchProducts,
  resetProductFilters,
  selectCategories,
  selectGroups,
  selectProductsError,
  selectProductsHasMore,
  selectProductsList,
  selectProductsStatus,
  selectProductsTotal,
  selectProductFilters,
  setProductFilters,
  updateProduct,
} from '../../../store/slices/productsSlice';
import PageHeader from '../../../ui/custom/PageHeader';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import AdminSearchSelect from '../../../components/admin/AdminSearchSelect';
import SelectionGrid from '../../../ui/custom/input/SelectionGrid';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Modal from '../../../ui/custom/modal/Modal';
import CountUp from '../../../ui/custom/motion/CountUp';
import productService from '../../../lib/appwrite/product';
import { entityColorStep, toneColor } from '../../../lib/entityColors';
import { getEffectivePricing } from '../../../lib/saleMath';
import { tint } from '../../../ui/graphs/utils';
import { InventoryArt, OrderFormArt, ProductsArt } from '../../../ui/art';
import {
  ProductForm,
  CustomProductForm,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from '../../../components/admin/products';

const TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal products' },
  { value: 'custom', label: 'Custom · made to order' },
];

const messageFrom = (error, fallback) =>
  typeof error === 'string' ? error : error?.message || fallback;

function groupInventory(products) {
  const categories = new Map();
  products.forEach((product) => {
    const categoryName = product.category?.trim() || 'Uncategorized';
    const groupName = product.group?.trim() || 'Ungrouped';
    if (!categories.has(categoryName)) categories.set(categoryName, new Map());
    const groups = categories.get(categoryName);
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(product);
  });

  return [...categories.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, groups]) => ({
      name,
      groups: [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([groupName, rows]) => ({ name: groupName, rows })),
    }));
}

function InventoryCard({ product, sales, busy, onOpen, onDelete, onToggleFeatured }) {
  const imageUrl = productService.getMainImageUrl(product);
  const pricing = getEffectivePricing(product, sales);
  const remaining = Number(product.remaining) || 0;
  const total = Number(product.totalAvailable) || 0;
  const isCustom = Boolean(product.isCustom);
  const outOfStock = !isCustom && (product.status === 'outOfStock' || remaining <= 0);
  const lowStock = !isCustom && !outOfStock && total > 0 && remaining / total <= 0.2;
  const statusLabel = isCustom ? 'Made to order' : outOfStock ? 'Out of stock' : lowStock ? 'Low stock' : 'In stock';
  const statusTone = isCustom
    ? 'var(--accent-tone-6)'
    : toneColor(entityColorStep('stockStatus', outOfStock ? 'out' : lowStock ? 'low' : 'in'));
  const stockPercent = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
  const hasDiscount = pricing.discountPercentage > 0 && pricing.originalPrice > pricing.price;

  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-colors hover:border-accent/40">
      <button
        type="button"
        onClick={() => onOpen(product)}
        aria-label={`Edit ${product.name}`}
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt">
          {imageUrl ? (
            <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <span className="grid h-full w-full place-items-center text-muted"><ImageOff size={24} aria-hidden="true" /></span>
          )}
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: tint(statusTone, 14), color: statusTone }}
          >
            {statusLabel}
          </span>
          {product.featured && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-xs font-medium text-accent shadow-soft">
              <Star size={13} fill="currentColor" aria-hidden="true" />
              Featured
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-2.5 p-3 sm:p-4">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-text sm:text-base">{product.name || 'Unnamed product'}</h4>
            <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted">
              <span className="truncate">{product.category || 'Uncategorized'}</span>
              <ChevronRight size={13} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{product.group || 'Ungrouped'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold tabular-nums text-text">{productService.formatPrice(pricing.price)}</p>
              {hasDiscount && (
                <p className="text-xs text-muted">
                  <s>{productService.formatPrice(pricing.originalPrice)}</s>
                  <span className="ml-1 font-medium text-accent-tone-4">-{Math.round(pricing.discountPercentage)}%</span>
                </p>
              )}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isCustom ? 'bg-accent-tone-6/10 text-accent-tone-6' : 'bg-surface-alt text-muted'}`}>
              {isCustom ? 'Custom' : 'Regular'}
            </span>
          </div>

          {isCustom ? (
            <p className="text-xs text-muted">Made to order · no tracked stock</p>
          ) : (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${stockPercent}%`, background: statusTone }} />
              </div>
              <p className="mt-1.5 text-xs tabular-nums text-muted">
                {remaining} remaining · {Number(product.sold) || 0} sold
              </p>
            </div>
          )}
        </div>
      </button>

      <footer className="flex items-center justify-end gap-1 border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={() => onToggleFeatured(product)}
          disabled={busy}
          aria-label={product.featured ? `Remove ${product.name} from featured` : `Feature ${product.name}`}
          aria-pressed={Boolean(product.featured)}
          title={product.featured ? 'Remove from featured' : 'Mark as featured'}
          className={`grid size-9 place-items-center rounded-md transition-colors disabled:opacity-50 ${product.featured ? 'text-accent' : 'text-muted hover:bg-surface-alt hover:text-accent'}`}
        >
          <Star size={16} fill={product.featured ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onOpen(product)}
          aria-label={`Edit ${product.name}`}
          title="Edit product"
          className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text"
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(product)}
          aria-label={`Delete ${product.name}`}
          title="Delete product"
          className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-error/10 hover:text-error"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}

export default function Inventory() {
  const dispatch = useDispatch();
  const products = useSelector(selectProductsList);
  const filters = useSelector(selectProductFilters);
  const total = useSelector(selectProductsTotal);
  const hasMore = useSelector(selectProductsHasMore);
  const status = useSelector(selectProductsStatus);
  const error = useSelector(selectProductsError);
  const categoryCounts = useSelector(selectCategories);
  const groupCounts = useSelector(selectGroups);
  const sales = useSelector(selectSalesList);

  const [typeFilter, setTypeFilter] = useState('');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('new');
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const categories = useMemo(() => Object.keys(categoryCounts || {}).sort(), [categoryCounts]);
  const groups = useMemo(() => Object.keys(groupCounts || {}).sort(), [groupCounts]);
  const inventory = useMemo(() => groupInventory(products), [products]);

  useEffect(() => {
    dispatch(resetProductFilters());
    dispatch(fetchProducts());
    dispatch(fetchCategories());
    dispatch(fetchGroups({}));
  }, [dispatch]);

  const applyFilters = useCallback((patch) => {
    setActionError('');
    dispatch(setProductFilters(patch));
    dispatch(fetchProducts());
  }, [dispatch]);

  const loadOptions = useCallback(() => {
    dispatch(fetchCategories());
    dispatch(fetchGroups(filters.category ? { category: filters.category } : {}));
  }, [dispatch, filters.category]);

  const onCategoryChange = (category) => {
    applyFilters({ category: category || null, group: null });
    dispatch(fetchGroups(category ? { category } : {}));
  };

  const onTypeChange = (value) => {
    setTypeFilter(value);
    applyFilters({
      isCustom: value ? value === 'custom' : (filters.status ? false : null),
      status: value === 'custom' ? null : filters.status,
    });
  };

  const onStatusChange = (value) => {
    const statusValue = value || null;
    if (statusValue && typeFilter === 'custom') setTypeFilter('');
    applyFilters({
      status: statusValue,
      isCustom: statusValue ? false : (typeFilter === 'custom' ? true : typeFilter === 'normal' ? false : null),
    });
  };

  const clearFilters = () => {
    setTypeFilter('');
    applyFilters({
      category: null,
      group: null,
      status: null,
      isCustom: null,
      minPrice: null,
      maxPrice: null,
      searchTerm: '',
      sortBy: 'newest',
    });
    dispatch(fetchGroups({}));
  };

  const refresh = async () => {
    setRefreshing(true);
    setActionError('');
    try {
      await dispatch(fetchProducts()).unwrap();
      loadOptions();
    } catch (err) {
      setActionError(messageFrom(err, 'Could not refresh inventory.'));
    } finally {
      setRefreshing(false);
    }
  };

  const openAdd = () => setChooserOpen(true);
  const chooseAddType = (mode) => {
    setEditing(null);
    setFormMode(mode);
    setFormKey((key) => key + 1);
    setFormOpen(true);
    setChooserOpen(false);
  };
  const openEdit = (product) => {
    setEditing(product);
    setFormMode(product.isCustom ? 'custom' : 'new');
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  const onSaved = () => {
    setFormOpen(false);
    dispatch(fetchProducts());
    loadOptions();
  };

  const toggleFeatured = async (product) => {
    setBusyId(product.$id);
    setActionError('');
    try {
      await dispatch(updateProduct([product.$id, { featured: !product.featured }])).unwrap();
    } catch (err) {
      setActionError(messageFrom(err, 'Could not update the featured status.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await dispatch(deleteProduct([toDelete.$id])).unwrap();
      setDeleteOpen(false);
      setToDelete(null);
      dispatch(fetchProducts());
      loadOptions();
    } catch (err) {
      setDeleteError(messageFrom(err, 'Could not delete the product.'));
    } finally {
      setDeleting(false);
    }
  };

  const loading = status === 'loading';
  const busy = loading || refreshing;
  const filtered = Boolean(
    filters.category || filters.group || filters.status || filters.isCustom !== null || filters.searchTerm
  );
  const filterActive = filtered || filters.sortBy !== 'newest';

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        art={<InventoryArt decorative />}
        title="Inventory"
        subtitle={(
          <>
            <CountUp value={total} className="font-semibold text-text" /> {total === 1 ? 'product' : 'products'}
            {filtered ? ' match your filters' : ' across your inventory'} · {categories.length} categories · {groups.length} groups
          </>
        )}
        actions={(
          <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <ActionButton icon={Plus} onClick={openAdd}>Add product</ActionButton>
            <ActionButton variant="secondary" icon={RefreshCw} loading={busy} onClick={refresh}>Refresh</ActionButton>
          </div>
        )}
      />

      <div className="space-y-3">
        <SearchInput
          size="sm"
          value={filters.searchTerm}
          onSearch={(searchTerm) => applyFilters({ searchTerm })}
          loading={loading && Boolean(filters.searchTerm)}
          placeholder="Search name, category, group or tags"
          label="Search inventory"
          className="w-full min-w-0"
        />
        <SelectionGrid>
          <AdminSearchSelect
            className="min-w-0"
            aria-label="Filter by category"
            placeholder="All categories"
            options={categories}
            value={filters.category || ''}
            onChange={onCategoryChange}
            clearable
          />
          <AdminSearchSelect
            className="min-w-0"
            aria-label="Filter by group"
            placeholder="All groups"
            options={groups}
            value={filters.group || ''}
            onChange={(group) => applyFilters({ group: group || null })}
            clearable
          />
          <AdminSearchSelect
            className="min-w-0"
            aria-label="Filter by stock status"
            placeholder="Any stock status"
            options={STATUS_OPTIONS}
            value={filters.status || ''}
            onChange={onStatusChange}
            clearable
          />
          <AdminSearchSelect
            className="min-w-0"
            aria-label="Filter by product type"
            placeholder="All product types"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={onTypeChange}
            clearable
          />
          <AdminSearchSelect
            className="min-w-0"
            aria-label="Sort inventory"
            options={SORT_OPTIONS}
            value={filters.sortBy}
            onChange={(sortBy) => applyFilters({ sortBy: sortBy || 'newest' })}
          />
        </SelectionGrid>
        {filterActive && (
          <button type="button" onClick={clearFilters} className="text-xs font-medium text-accent hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
          {actionError}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
          <p>{error}</p>
          <button type="button" onClick={() => dispatch(fetchProducts())} className="mt-2 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {!products.length && loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} aria-hidden="true" className="h-24 animate-pulse rounded-xl border border-border bg-surface-alt motion-reduce:animate-none" />
          ))}
        </div>
      ) : !products.length && !loading && !error ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center sm:p-10">
          <p className="font-display text-2xl font-semibold text-text">{filtered ? 'No products match' : 'Inventory is empty'}</p>
          <p className="mt-1 text-sm text-muted">
            {filtered ? 'Try another category, group or stock filter.' : 'Add a product to start organizing your inventory.'}
          </p>
          {!filtered && <ActionButton icon={Plus} onClick={openAdd} className="mt-5">Add product</ActionButton>}
          {filtered && <button type="button" onClick={clearFilters} className="mt-4 text-sm font-medium text-accent hover:underline">Clear filters</button>}
        </div>
      ) : (
        <>
          {hasMore && (
            <p className="text-xs text-muted">Showing {products.length} of {total} products. Load more to see the rest.</p>
          )}
          <div className="space-y-5">
            {inventory.map((category) => (
              <section key={category.name} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-alt/50 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-text">{category.name}</h2>
                    <p className="text-xs text-muted">{category.groups.reduce((count, group) => count + group.rows.length, 0)} loaded products</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                    <Boxes size={14} aria-hidden="true" />
                    {category.groups.length} groups
                  </span>
                </header>
                <div className="space-y-4 p-3 sm:p-4">
                  {category.groups.map((group) => (
                    <section key={group.name} className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <nav aria-label={`${category.name} category group`} className="min-w-0">
                          <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                            <li className="max-w-full truncate rounded-full bg-surface-alt px-2.5 py-1 text-muted">{category.name}</li>
                            <li aria-hidden="true"><ChevronRight size={14} className="text-muted" /></li>
                            <li aria-current="location" className="max-w-full truncate rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">{group.name}</li>
                          </ol>
                        </nav>
                        <span className="text-xs text-muted">{group.rows.length} {group.rows.length === 1 ? 'product' : 'products'}</span>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {group.rows.map((product) => (
                          <InventoryCard
                            key={product.$id}
                            product={product}
                            sales={sales}
                            busy={busyId === product.$id}
                            onOpen={openEdit}
                            onDelete={(item) => { setToDelete(item); setDeleteError(''); setDeleteOpen(true); }}
                            onToggleFeatured={toggleFeatured}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <ActionButton variant="secondary" loading={loading} onClick={() => dispatch(fetchProducts({ append: true }))}>
                Load more products
              </ActionButton>
            </div>
          )}
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
              <span className="mt-1 block text-sm text-muted">A regular product with tracked stock.</span>
            </button>
            <button
              type="button"
              onClick={() => chooseAddType('custom')}
              className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
            >
              <OrderFormArt className="mx-auto mb-3 h-28 w-full" decorative />
              <span className="block font-semibold text-text">Custom product</span>
              <span className="mt-1 block text-sm text-muted">Made to order with customer-selected options.</span>
            </button>
          </div>
        </Modal>
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
