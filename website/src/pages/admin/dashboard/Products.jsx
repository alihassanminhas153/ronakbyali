import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';

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
import { ProductForm, ProductTable, SORT_OPTIONS, STATUS_OPTIONS } from '../../../components/admin/products';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';

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

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0); // new key = fresh form; 0 = never opened
  const [editing, setEditing] = useState(null); // null = add
  const [toDelete, setToDelete] = useState(null); // kept after closing so the dialog text does not vanish mid-animation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [busyId, setBusyId] = useState(null);

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
    loadOptions(); // a new category / group may have been created
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
    } catch (err) {
      setDeleteError(typeof err === 'string' ? err : err?.message || 'Could not delete the product.');
    } finally {
      setDeleting(false);
    }
  };

  const loading = status === 'loading';
  const filtered = Boolean(filters.category || filters.status || filters.searchTerm);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-wide text-text">Products</h1>
          <p className="mt-1 text-sm text-muted">
            {loading && !products.length ? 'Loading…' : `${total} ${total === 1 ? 'product' : 'products'}${filtered ? ' match' : ''}`}
          </p>
        </div>
        <ActionButton icon={Plus} onClick={openAdd}>
          Add product
        </ActionButton>
      </header>

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
          <button type="button" onClick={() => dispatch(fetchProducts())} className="font-medium underline">
            Try again
          </button>
        </div>
      ) : products.length === 0 && !loading ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="font-display text-2xl font-semibold text-text">{filtered ? 'No products match' : 'No products yet'}</p>
          <p className="mt-1 text-sm text-muted">
            {filtered ? 'Try a different search or clear the filters.' : 'Add your first product to get started.'}
          </p>
          {!filtered && (
            <ActionButton icon={Plus} onClick={openAdd} className="mt-5">
              Add product
            </ActionButton>
          )}
        </div>
      ) : (
        <>
          <ProductTable products={products} busyId={busyId} onEdit={openEdit} onDelete={(p) => {
              setToDelete(p);
              setDeleteError('');
              setDeleteOpen(true);
            }} onToggleFeatured={toggleFeatured} />
          {hasMore && (
            <div className="flex justify-center">
              <ActionButton variant="secondary" loading={loading} onClick={() => dispatch(fetchProducts({ append: true }))}>
                Load more
              </ActionButton>
            </div>
          )}
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
