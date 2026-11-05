// USAGE
//   const wished = useAppSelector(selectIsWished(product.$id));
//   <button onClick={() => dispatch(toggleWishlist({ productId: product.$id }))} />
//   const products = useAppSelector(selectWishlistProducts);
//   dispatch(fetchWishlist());
//   // toggle is optimistic: it flips instantly and rolls back if the service fails
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { wishlistService } from './services';
import { LOGIN_REQUIRED, fail, getUserId, stripToast } from './utils';
import { isSessionEnded } from './authSlice';
import { openLoginModal } from './uiSlice';

const initialState = {
  productIds: [],
  products: [], // full product rows for the wishlist page
  status: 'idle',
  error: null,
};

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (arg, { getState, rejectWithValue }) => {
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const data = await wishlistService.getWishlistWithProducts({ userId });
  if (!data) return fail(rejectWithValue, 'Could not load your wishlist.', arg);
  const products = data.products || [];
  const productIds = data.wishlist?.productIds ?? products.map((p) => p.$id);
  return { productIds, products };
});

const toggleRequest = createAsyncThunk('wishlist/toggle', async (arg, { getState, rejectWithValue }) => {
  const { productId } = stripToast(arg);
  const result = await wishlistService.toggle({ profile: getState().auth.profile, productId });
  if (!result) return fail(rejectWithValue, 'Could not update your wishlist.', arg);
  return { productId, wished: Boolean(result.wished), productIds: result.wishlist?.productIds };
});

// Guests get the login modal. The optimistic flip only happens for logged-in users.
export const toggleWishlist = (arg) => (dispatch, getState) => {
  if (!getState().auth.profile) {
    dispatch(openLoginModal());
    return Promise.resolve(null);
  }
  return dispatch(toggleRequest(arg));
};

export const clearWishlist = createAsyncThunk('wishlist/clear', async (arg, { getState, rejectWithValue }) => {
  const userId = getUserId(getState().auth.profile);
  const ok = await wishlistService.clear({ userId });
  if (ok === false) return fail(rejectWithValue, 'Could not clear your wishlist.', arg);
  return true;
});

const flip = (state, productId) => {
  state.productIds = state.productIds.includes(productId)
    ? state.productIds.filter((id) => id !== productId)
    : [...state.productIds, productId];
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.productIds = action.payload.productIds;
        state.products = action.payload.products;
        state.status = 'succeeded';
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        if (action.payload === LOGIN_REQUIRED) {
          state.status = 'idle';
          return;
        }
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      })
      // optimistic toggle
      .addCase(toggleRequest.pending, (state, action) => {
        flip(state, action.meta.arg.productId);
      })
      .addCase(toggleRequest.fulfilled, (state, action) => {
        const { productId, wished, productIds } = action.payload;
        if (Array.isArray(productIds)) {
          state.productIds = productIds;
        } else {
          const has = state.productIds.includes(productId);
          if (wished && !has) state.productIds.push(productId);
          if (!wished && has) state.productIds = state.productIds.filter((id) => id !== productId);
        }
        if (!wished) state.products = state.products.filter((p) => p.$id !== productId);
      })
      .addCase(toggleRequest.rejected, (state, action) => {
        flip(state, action.meta.arg.productId); // roll back
        state.error = action.payload || action.error?.message;
      })
      .addCase(clearWishlist.fulfilled, (state) => {
        state.productIds = [];
        state.products = [];
      })
      .addMatcher(isSessionEnded, () => initialState);
  },
});

export default wishlistSlice.reducer;

const EMPTY = [];
export const selectWishlistIds = (s) => s.wishlist.productIds;
export const selectWishlistProducts = (s) => s.wishlist.products ?? EMPTY;
export const selectWishlistCount = (s) => s.wishlist.productIds.length;
export const selectWishlistStatus = (s) => s.wishlist.status;
export const selectWishlistError = (s) => s.wishlist.error;
export const selectIsWished = (productId) => (s) => s.wishlist.productIds.includes(productId);
