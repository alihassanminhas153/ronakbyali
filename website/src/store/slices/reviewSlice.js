import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import reviewService from '../../lib/appwrite/review';

// Admin side of reviews: holds EVERY review (any status) so the Reviews page can
// filter, count and chart them without asking Appwrite again.
//
// Register it in store/store.js:   reviews: reviewReducer

const PAGE = 100;
const text = (value, fallback) => (typeof value === 'string' && value ? value : fallback);

/* ---------- thunks ---------- */

// Loads all reviews (newest first), page by page.
export const fetchReviews = createAsyncThunk('reviews/fetch', async (_, { rejectWithValue }) => {
  try {
    const rows = [];
    let offset = 0;
    for (;;) {
      const { rows: page, total } = await reviewService.getReviewsPage({ limit: PAGE, offset });
      rows.push(...page);
      offset += page.length;
      if (!page.length || offset >= total) break;
    }
    return rows;
  } catch (error) {
    return rejectWithValue(error.message || 'Could not load the reviews.');
  }
});

// Makes a review public and refreshes the product's rating.
export const approveReview = createAsyncThunk('reviews/approve', async (id, { rejectWithValue }) => {
  const row = await reviewService.approveReview(id);
  return row || rejectWithValue('Could not approve the review.');
});

// Hides a review again and refreshes the product's rating.
export const rejectReview = createAsyncThunk('reviews/reject', async (id, { rejectWithValue }) => {
  const row = await reviewService.rejectReview(id);
  return row || rejectWithValue('Could not reject the review.');
});

// { id, text }  -  an empty text removes the reply.
export const replyToReview = createAsyncThunk('reviews/reply', async ({ id, text: reply }, { rejectWithValue }) => {
  const row = await reviewService.replyToReview(id, reply);
  return row || rejectWithValue('Could not save the reply.');
});

export const deleteReview = createAsyncThunk('reviews/delete', async (id, { rejectWithValue }) => {
  const ok = await reviewService.deleteReview(id);
  return ok ? id : rejectWithValue('Could not delete the review.');
});

// Rewrites reviewCount / ratingAverage / reviewIds on ONE product.
export const recalculateProduct = createAsyncThunk('reviews/recalculateProduct', async (productId, { rejectWithValue }) => {
  const row = await reviewService.recalculateProduct(productId);
  return row ? productId : rejectWithValue('Could not update that product.');
});

// Same, for every product that has reviews. Returns how many were updated.
export const syncAllProducts = createAsyncThunk('reviews/syncAll', async (_, { rejectWithValue }) => {
  const count = await reviewService.syncAllProducts();
  return count === false ? rejectWithValue('Could not update the products.') : count;
});

/* ---------- slice ---------- */

const initialState = {
  items: [],
  status: 'idle', // idle | loading | ready | error
  error: null, // load error
  loadedAt: null, // Date.now() of the last successful load
  busy: {}, // { [reviewId or `p:${productId}`]: true } while an action runs
  actionError: null,
  syncing: false,
};

const replaceRow = (state, row) => {
  const i = state.items.findIndex((r) => r.$id === row.$id);
  if (i !== -1) state.items[i] = row;
};

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearReviewError(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, { payload }) => {
        state.items = payload;
        state.status = 'ready';
        state.loadedAt = Date.now();
      })
      .addCase(fetchReviews.rejected, (state, { payload }) => {
        state.status = 'error';
        state.error = text(payload, 'Could not load the reviews.');
      })

      .addCase(syncAllProducts.pending, (state) => {
        state.syncing = true;
        state.actionError = null;
      })
      .addCase(syncAllProducts.fulfilled, (state) => {
        state.syncing = false;
      })
      .addCase(syncAllProducts.rejected, (state, { payload }) => {
        state.syncing = false;
        state.actionError = text(payload, 'Could not update the products.');
      });

    // Row actions: track busy + errors, and apply the result to the list on success.
    [
      [approveReview, (arg) => arg, replaceRow],
      [rejectReview, (arg) => arg, replaceRow],
      [replyToReview, (arg) => arg.id, replaceRow],
      [deleteReview, (arg) => arg, (state, id) => { state.items = state.items.filter((r) => r.$id !== id); }],
      [recalculateProduct, (arg) => `p:${arg}`, null],
    ].forEach(([thunk, key, apply]) => {
      builder
        .addCase(thunk.pending, (state, { meta }) => {
          state.busy[key(meta.arg)] = true;
          state.actionError = null;
        })
        .addCase(thunk.fulfilled, (state, { meta, payload }) => {
          delete state.busy[key(meta.arg)];
          if (apply) apply(state, payload);
        })
        .addCase(thunk.rejected, (state, { meta, payload }) => {
          delete state.busy[key(meta.arg)];
          state.actionError = text(payload, 'Something went wrong.');
        });
    });
  },
});

export const { clearReviewError } = reviewSlice.actions;
export default reviewSlice.reducer;