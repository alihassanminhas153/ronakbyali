// USAGE
//   dispatch(addToCart({ productId: p.$id, quantity: 1, variant: 'M', toast: true }));
//   dispatch(setCartQuantity({ productId, quantity: 3, variant }));   // 0 removes
//   const lines = useAppSelector(selectCartLines);
//   const subtotal = useAppSelector(selectCartSubtotal);
//   // guests: the thunk opens the login modal and does not call the service
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { cartService, settingsService } from '../services';
import { LOGIN_REQUIRED, fail, getUserId, stripToast } from '../utils';
import { isSessionEnded } from './authSlice';
import { openLoginModal } from './uiSlice';

const initialState = {
  lines: [], // [{ productId, quantity, variant, product }]
  itemCount: 0,
  subtotal: 0,
  deliveryCharges: 0,
  total: 0,
  status: 'idle', // loading the cart
  updating: false, // a change is in progress
  error: null,
};

export const fetchCart = createAsyncThunk('cart/fetch', async (arg, { getState, rejectWithValue }) => {
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const data = await cartService.getCartWithProducts({ userId });
  if (!data) return fail(rejectWithValue, 'Could not load your cart.', arg);
  const subtotal = Number(data.subtotal) || 0;
  const charges = await settingsService.getDeliveryCharges(subtotal);
  return {
    lines: data.lines || [],
    subtotal,
    deliveryCharges: charges === false ? 0 : Number(charges) || 0,
  };
});

// Shared shape for add / set quantity / remove / clear: call the service, then reload the cart.
const mutation = (type, call, message) =>
  createAsyncThunk(type, async (arg, { getState, dispatch, rejectWithValue }) => {
    const profile = getState().auth.profile;
    if (!profile) {
      dispatch(openLoginModal());
      return rejectWithValue(LOGIN_REQUIRED, { toast: false });
    }
    const ok = await call({ profile, userId: getUserId(profile), ...stripToast(arg) });
    if (ok === false) return fail(rejectWithValue, message, arg);
    await dispatch(fetchCart());
    return true;
  });

export const addToCart = mutation(
  'cart/addItem',
  ({ profile, productId, quantity = 1, variant }) => cartService.addItem({ profile, productId, quantity, variant }),
  'Could not add this item to your cart.'
);
export const setCartQuantity = mutation(
  'cart/setQuantity',
  ({ userId, productId, quantity, variant }) => cartService.setQuantity({ userId, productId, quantity, variant }),
  'Could not update the quantity.'
);
export const removeFromCart = mutation(
  'cart/removeItem',
  ({ userId, productId, variant }) => cartService.removeItem({ userId, productId, variant }),
  'Could not remove this item.'
);
export const clearCart = mutation(
  'cart/clear',
  ({ userId }) => cartService.clear({ userId }),
  'Could not clear your cart.'
);

const mutations = [addToCart, setCartQuantity, removeFromCart, clearCart];

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        const { lines, subtotal, deliveryCharges } = action.payload;
        state.lines = lines;
        state.itemCount = lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0);
        state.subtotal = subtotal;
        state.deliveryCharges = deliveryCharges;
        state.total = subtotal + deliveryCharges;
        state.status = 'succeeded';
      })
      .addCase(fetchCart.rejected, (state, action) => {
        if (action.payload === LOGIN_REQUIRED) {
          state.status = 'idle';
          return;
        }
        state.status = 'failed';
        state.error = action.payload || action.error?.message || 'Could not load your cart.';
      })
      .addMatcher(isSessionEnded, () => initialState);

    mutations.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.updating = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.updating = false;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.updating = false;
          if (action.payload !== LOGIN_REQUIRED) state.error = action.payload || action.error?.message;
        });
    });
  },
});

export default cartSlice.reducer;

export const selectCartLines = (s) => s.cart.lines;
export const selectCartCount = (s) => s.cart.itemCount;
export const selectCartSubtotal = (s) => s.cart.subtotal;
export const selectCartDeliveryCharges = (s) => s.cart.deliveryCharges;
export const selectCartTotal = (s) => s.cart.total;
export const selectCartStatus = (s) => s.cart.status;
export const selectCartUpdating = (s) => s.cart.updating;
export const selectCartError = (s) => s.cart.error;
