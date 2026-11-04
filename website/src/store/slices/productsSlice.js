// USAGE
//   dispatch(setProductFilters({ category: 'Kurta', sortBy: 'price-asc' }));
//   dispatch(fetchProducts());                       // first page, replaces the list
//   dispatch(fetchProducts({ append: true }));       // "load more" / infinite scroll
//   const products = useAppSelector(selectProductsList);
//   useEffect(() => { dispatch(fetchProductBySlug(slug)); }, [slug]);
//
// ADMIN thunks (addProduct, updateProduct, ...) take an ARRAY of the productService
// method arguments, e.g. dispatch(updateProduct([rowId, data])).
// The FIRST argument of deleteProduct must be the product row id.
import { createAsyncThunk, createEntityAdapter, createSelector, createSlice, isAnyOf } from '@reduxjs/toolkit';
import { productService } from '../services';
import { fail, isRow, serviceThunk, stripToast } from '../utils';

const adapter = createEntityAdapter({ selectId: (p) => p.$id });

const PAGE_SIZE = 12;
const defaultFilters = {
  category: null,
  group: null,
  status: null, // 'inStock' | 'outOfStock'
  minPrice: null,
  maxPrice: null,
  sortBy: 'newest', // name-asc, name-desc, price-asc, price-desc, newest, order
  searchTerm: '',
};
const emptyList = () => ({
  ids: [], total: 0, page: 1, limit: PAGE_SIZE, hasMore: false,
  status: 'idle', error: null, requestId: null,
});
const block = (extra = {}) => ({ status: 'idle', error: null, ...extra });

const initialState = adapter.getInitialState({
  filters: { ...defaultFilters },
  list: emptyList(),
  featured: block({ ids: [] }),
  related: block({ ids: [] }),
  detail: block({ id: null }),
  categories: block({ items: {} }), // { name: count }
  groups: block({ items: {} }), // { name: count }
  categoriesWithSample: block({ items: null }),
  groupsWithSample: block({ items: null }),
  priceRange: block({ min: 0, max: 0 }),
  admin: block(),
});

// Only send filters the service understands and that are set.
const serviceFilters = (f) => {
  const out = {};
  if (f.category) out.category = f.category;
  if (f.group) out.group = f.group;
  if (f.status) out.status = f.status;
  return out;
};

/* ---------- list ---------- */

export const fetchProducts = createAsyncThunk('products/fetchList', async (arg, { getState, rejectWithValue }) => {
  const { append = false } = stripToast(arg);
  const { filters, list } = getState().products;
  const query = {
    filters: serviceFilters(filters),
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    sortBy: filters.sortBy,
    limit: list.limit,
    offset: append ? list.ids.length : 0,
  };
  const term = filters.searchTerm.trim();
  const result = term
    ? await productService.searchProducts({ term, ...query })
    : await productService.getProductsPage(query);
  if (!result) return fail(rejectWithValue, 'Could not load products.', arg);
  return { rows: result.rows || [], total: result.total || 0, append };
});

/* ---------- other loads ---------- */

export const fetchProductBySlug = createAsyncThunk('products/fetchBySlug', async (slug, { rejectWithValue }) => {
  const product = await productService.getProductBySlug(slug);
  if (!product) return rejectWithValue('Product not found.');
  return product;
});

export const fetchProductById = createAsyncThunk('products/fetchById', async (rowId, { rejectWithValue }) => {
  const product = await productService.getProduct(rowId);
  if (!product) return rejectWithValue('Product not found.');
  return product;
});

export const fetchProductsByIds = createAsyncThunk('products/fetchByIds', async (ids) => {
  const rows = await productService.getProductsByIds(ids);
  return Array.isArray(rows) ? rows : [];
});

export const fetchFeaturedProducts = createAsyncThunk('products/fetchFeatured', async (limit = 8) => {
  const rows = await productService.getFeaturedProducts(limit);
  return Array.isArray(rows) ? rows : [];
});

export const fetchRelatedProducts = createAsyncThunk('products/fetchRelated', async (arg) => {
  const { product, limit = 4 } = arg;
  const rows = await productService.getRelatedProducts(product, limit);
  return Array.isArray(rows) ? rows : [];
});

export const fetchCategories = createAsyncThunk('products/fetchCategories', async () => (await productService.listCategories()) || {});
export const fetchGroups = createAsyncThunk('products/fetchGroups', async (filters) => (await productService.listGroups(filters)) || {});
export const fetchCategoriesWithSample = createAsyncThunk('products/fetchCategoriesWithSample', async () => (await productService.listCategoriesWithSample()) ?? null);
export const fetchGroupsWithSample = createAsyncThunk('products/fetchGroupsWithSample', async (filters) => (await productService.listGroupsWithSample(filters)) ?? null);
export const fetchPriceRange = createAsyncThunk('products/fetchPriceRange', async (filters) => {
  const range = await productService.getPriceRange(filters);
  return { min: range?.min ?? 0, max: range?.max ?? 0 };
});

/* ---------- admin (arguments are passed straight to productService) ---------- */

export const addProduct = serviceThunk('products/addProduct', productService, 'addProduct', { message: 'Could not add the product.' });
export const updateProduct = serviceThunk('products/updateProduct', productService, 'updateProduct', { message: 'Could not update the product.' });
export const deleteProduct = serviceThunk('products/deleteProduct', productService, 'deleteProduct', { message: 'Could not delete the product.' });
export const updateStock = serviceThunk('products/updateStock', productService, 'updateStock', { message: 'Could not update the stock.' });
export const updateProductOrder = serviceThunk('products/updateProductOrder', productService, 'updateProductOrder', { message: 'Could not update the product order.' });
export const addImages = serviceThunk('products/addImages', productService, 'addImages', { message: 'Could not upload the images.' });
export const removeImage = serviceThunk('products/removeImage', productService, 'removeImage', { message: 'Could not remove the image.' });
export const setMainImage = serviceThunk('products/setMainImage', productService, 'setMainImage', { message: 'Could not set the main image.' });
export const generateUniqueSlug = serviceThunk('products/generateUniqueSlug', productService, 'generateUniqueSlug', { message: 'Could not generate a slug.' });

const adminThunks = [addProduct, updateProduct, deleteProduct, updateStock, updateProductOrder, addImages, removeImage, setMainImage, generateUniqueSlug];
const rowReturning = [addProduct, updateProduct, updateStock, addImages, removeImage, setMainImage];

/* ---------- slice ---------- */

const idsOf = (rows) => rows.map((r) => r.$id);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    // Changing filters clears the list; dispatch fetchProducts() afterwards.
    setProductFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.list = { ...emptyList(), limit: state.list.limit };
    },
    resetProductFilters: (state) => {
      state.filters = { ...defaultFilters };
      state.list = { ...emptyList(), limit: state.list.limit };
    },
    clearProductDetail: (state) => {
      state.detail = block({ id: null });
      state.related = block({ ids: [] });
    },
  },
  extraReducers: (builder) => {
    builder
      // list (stale responses are ignored using requestId)
      .addCase(fetchProducts.pending, (state, action) => {
        state.list.status = 'loading';
        state.list.error = null;
        state.list.requestId = action.meta.requestId;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.list.requestId) return;
        const { rows, total, append } = action.payload;
        adapter.upsertMany(state, rows);
        const ids = append ? [...new Set([...state.list.ids, ...idsOf(rows)])] : idsOf(rows);
        state.list.ids = ids;
        state.list.total = total;
        state.list.hasMore = ids.length < total;
        state.list.page = append ? state.list.page + 1 : 1;
        state.list.status = 'succeeded';
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (action.meta.requestId !== state.list.requestId) return;
        state.list.status = 'failed';
        state.list.error = action.payload || action.error?.message || 'Could not load products.';
      })
      // detail
      .addCase(fetchProductBySlug.pending, (state) => { state.detail = block({ id: null, status: 'loading' }); })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        adapter.upsertOne(state, action.payload);
        state.detail = block({ id: action.payload.$id, status: 'succeeded' });
      })
      .addCase(fetchProductBySlug.rejected, (state, action) => {
        state.detail = block({ id: null, status: 'failed', error: action.payload || action.error?.message });
      })
      .addCase(fetchProductById.pending, (state) => { state.detail = block({ id: null, status: 'loading' }); })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        adapter.upsertOne(state, action.payload);
        state.detail = block({ id: action.payload.$id, status: 'succeeded' });
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.detail = block({ id: null, status: 'failed', error: action.payload || action.error?.message });
      })
      .addCase(fetchProductsByIds.fulfilled, (state, action) => { adapter.upsertMany(state, action.payload); })
      // featured
      .addCase(fetchFeaturedProducts.pending, (state) => { state.featured.status = 'loading'; })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        adapter.upsertMany(state, action.payload);
        state.featured = block({ ids: idsOf(action.payload), status: 'succeeded' });
      })
      .addCase(fetchFeaturedProducts.rejected, (state, action) => {
        state.featured.status = 'failed';
        state.featured.error = action.error?.message || 'Could not load featured products.';
      })
      // related
      .addCase(fetchRelatedProducts.pending, (state) => { state.related.status = 'loading'; })
      .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
        adapter.upsertMany(state, action.payload);
        state.related = block({ ids: idsOf(action.payload), status: 'succeeded' });
      })
      .addCase(fetchRelatedProducts.rejected, (state, action) => {
        state.related.status = 'failed';
        state.related.error = action.error?.message || 'Could not load related products.';
      })
      // categories / groups / price range
      .addCase(fetchCategories.pending, (state) => { state.categories.status = 'loading'; })
      .addCase(fetchCategories.fulfilled, (state, action) => { state.categories = block({ items: action.payload, status: 'succeeded' }); })
      .addCase(fetchCategories.rejected, (state, action) => { state.categories.status = 'failed'; state.categories.error = action.error?.message; })
      .addCase(fetchGroups.pending, (state) => { state.groups.status = 'loading'; })
      .addCase(fetchGroups.fulfilled, (state, action) => { state.groups = block({ items: action.payload, status: 'succeeded' }); })
      .addCase(fetchGroups.rejected, (state, action) => { state.groups.status = 'failed'; state.groups.error = action.error?.message; })
      .addCase(fetchCategoriesWithSample.pending, (state) => { state.categoriesWithSample.status = 'loading'; })
      .addCase(fetchCategoriesWithSample.fulfilled, (state, action) => { state.categoriesWithSample = block({ items: action.payload, status: 'succeeded' }); })
      .addCase(fetchCategoriesWithSample.rejected, (state, action) => { state.categoriesWithSample.status = 'failed'; state.categoriesWithSample.error = action.error?.message; })
      .addCase(fetchGroupsWithSample.pending, (state) => { state.groupsWithSample.status = 'loading'; })
      .addCase(fetchGroupsWithSample.fulfilled, (state, action) => { state.groupsWithSample = block({ items: action.payload, status: 'succeeded' }); })
      .addCase(fetchGroupsWithSample.rejected, (state, action) => { state.groupsWithSample.status = 'failed'; state.groupsWithSample.error = action.error?.message; })
      .addCase(fetchPriceRange.fulfilled, (state, action) => { state.priceRange = block({ ...action.payload, status: 'succeeded' }); })
      .addCase(fetchPriceRange.rejected, (state, action) => { state.priceRange.status = 'failed'; state.priceRange.error = action.error?.message; })
      // admin: write returned rows into the cache
      .addCase(deleteProduct.fulfilled, (state, action) => {
        const arg = action.meta.arg;
        const id = Array.isArray(arg) ? arg[0] : arg;
        adapter.removeOne(state, id);
        state.list.ids = state.list.ids.filter((x) => x !== id);
        state.featured.ids = state.featured.ids.filter((x) => x !== id);
        state.related.ids = state.related.ids.filter((x) => x !== id);
      })
      .addMatcher(isAnyOf(...rowReturning.map((t) => t.fulfilled)), (state, action) => {
        if (isRow(action.payload)) adapter.upsertOne(state, action.payload);
      })
      .addMatcher(isAnyOf(...adminThunks.map((t) => t.pending)), (state) => { state.admin.status = 'loading'; state.admin.error = null; })
      .addMatcher(isAnyOf(...adminThunks.map((t) => t.fulfilled)), (state) => { state.admin.status = 'succeeded'; })
      .addMatcher(isAnyOf(...adminThunks.map((t) => t.rejected)), (state, action) => {
        state.admin.status = 'failed';
        state.admin.error = action.payload || action.error?.message || 'Admin action failed.';
      });
  },
});

export const { setProductFilters, resetProductFilters, clearProductDetail } = productsSlice.actions;
export default productsSlice.reducer;

/* ---------- selectors ---------- */
const selectEntities = (s) => s.products.entities;
const pick = (entities, ids) => ids.map((id) => entities[id]).filter(Boolean);

export const selectProductsList = createSelector([selectEntities, (s) => s.products.list.ids], pick);
export const selectFeaturedProducts = createSelector([selectEntities, (s) => s.products.featured.ids], pick);
export const selectRelatedProducts = createSelector([selectEntities, (s) => s.products.related.ids], pick);
export const selectProductDetail = (s) => s.products.entities[s.products.detail.id] ?? null;
export const selectProductEntityById = (id) => (s) => s.products.entities[id] ?? null;

export const selectProductFilters = (s) => s.products.filters;
export const selectProductsTotal = (s) => s.products.list.total;
export const selectProductsHasMore = (s) => s.products.list.hasMore;
export const selectProductsPage = (s) => s.products.list.page;
export const selectProductsStatus = (s) => s.products.list.status;
export const selectProductsError = (s) => s.products.list.error;
export const selectFeaturedStatus = (s) => s.products.featured.status;
export const selectRelatedStatus = (s) => s.products.related.status;
export const selectProductDetailStatus = (s) => s.products.detail.status;
export const selectProductDetailError = (s) => s.products.detail.error;
export const selectCategories = (s) => s.products.categories.items;
export const selectGroups = (s) => s.products.groups.items;
export const selectCategoriesWithSample = (s) => s.products.categoriesWithSample.items;
export const selectGroupsWithSample = (s) => s.products.groupsWithSample.items;
export const selectPriceRange = (s) => s.products.priceRange;
export const selectProductAdminStatus = (s) => s.products.admin.status;
export const selectProductAdminError = (s) => s.products.admin.error;

// Sync image helpers. (costPrice exists on rows but never show it in the storefront.)
export const getMainImageUrl = (product) => productService.getMainImageUrl(product);
export const getProductImageUrls = (product) => productService.getImageUrls(product);
export const getProductImageUrl = (fileId) => productService.getImageUrl(fileId);
