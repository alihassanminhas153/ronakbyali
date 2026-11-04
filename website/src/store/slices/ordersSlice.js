// USAGE
//   const res = await dispatch(placeOrder({ form, toast: true }));   // items are built from the cart
//   if (placeOrder.fulfilled.match(res)) navigate('/thank-you');
//   const last = useAppSelector(selectLastPlacedOrder);               // thank-you page
//   dispatch(fetchMyOrders({ limit: 10, offset: 0 }));
//   const orders = useAppSelector(selectMyOrders);
import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { orderService } from '../services';
import { LOGIN_REQUIRED, fail, getUserId, stripToast } from '../utils';
import { isSessionEnded, refreshProfile } from './authSlice';
import { fetchCart } from './cartSlice';
import { fetchWishlist } from './wishlistSlice';
import { openLoginModal } from './uiSlice';

export const PAYMENT_METHODS = ['cod', 'bank_transfer', 'card', 'easypaisa', 'jazzcash'];
export const DELIVERY_TYPES = ['fast', 'regular', 'pickup'];

const adapter = createEntityAdapter({
  selectId: (o) => o.$id,
  sortComparer: (a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || ''),
});

const initialState = adapter.getInitialState({
  total: 0,
  status: 'idle', // my orders list
  error: null,
  currentId: null, // order shown on the detail page
  detailStatus: 'idle',
  detailError: null,
  placeStatus: 'idle',
  placeError: null,
  lastPlacedOrder: null,
});

export const placeOrder = createAsyncThunk('orders/place', async (arg, { getState, dispatch, rejectWithValue }) => {
  const { form } = stripToast(arg);
  const state = getState();
  const profile = state.auth.profile;
  if (!profile) {
    dispatch(openLoginModal());
    return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  }
  // Build the order items from the cart lines.
  const items = state.cart.lines.map((l) => ({
    productId: l.productId,
    name: l.product?.name,
    price: l.product?.price,
    quantity: l.quantity,
    fileId: l.product?.imageIds?.[0] ?? null,
    variant: l.variant,
  }));
  if (!items.length) return fail(rejectWithValue, 'Your cart is empty.', arg);

  const order = await orderService.placeOrder({ profile, items, form });
  if (!order) {
    return fail(rejectWithValue, orderService.lastError || 'Could not place your order. Please try again.', arg);
  }
  // Role, lastCity, lastAddress, ordersCount and totalSpent change, so refresh everything.
  await Promise.all([dispatch(refreshProfile()), dispatch(fetchCart()), dispatch(fetchWishlist())]);
  return order;
});

export const fetchMyOrders = createAsyncThunk('orders/fetchMine', async (arg, { getState, rejectWithValue }) => {
  const { limit = 10, offset = 0 } = stripToast(arg);
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const result = await orderService.getUserOrders({ userId, limit, offset });
  if (!result) return fail(rejectWithValue, 'Could not load your orders.', arg);
  return { rows: result.rows || [], total: result.total || 0, offset };
});

export const fetchOrder = createAsyncThunk('orders/fetchOne', async (rowId, { rejectWithValue }) => {
  const order = await orderService.getOrder(rowId);
  if (!order) return rejectWithValue('Order not found.');
  return order;
});

export const fetchOrderByNumber = createAsyncThunk('orders/fetchByNumber', async (orderNumber, { rejectWithValue }) => {
  const order = await orderService.getOrderByNumber(orderNumber);
  if (!order) return rejectWithValue('Order not found.');
  return order;
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearLastPlacedOrder: (state) => {
      state.lastPlacedOrder = null;
      state.placeStatus = 'idle';
      state.placeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placeStatus = 'loading';
        state.placeError = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placeStatus = 'succeeded';
        state.lastPlacedOrder = action.payload;
        adapter.upsertOne(state, action.payload);
        state.total += 1;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.placeStatus = 'failed';
        if (action.payload !== LOGIN_REQUIRED) state.placeError = action.payload || action.error?.message;
      })
      .addCase(fetchMyOrders.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        const { rows, total, offset } = action.payload;
        if (offset > 0) adapter.upsertMany(state, rows);
        else adapter.setAll(state, rows);
        state.total = total;
        state.status = 'succeeded';
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        if (action.payload === LOGIN_REQUIRED) {
          state.status = 'idle';
          return;
        }
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      });

    [fetchOrder, fetchOrderByNumber].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.detailStatus = 'loading';
          state.detailError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          adapter.upsertOne(state, action.payload);
          state.currentId = action.payload.$id;
          state.detailStatus = 'succeeded';
        })
        .addCase(thunk.rejected, (state, action) => {
          state.detailStatus = 'failed';
          state.detailError = action.payload || action.error?.message;
        });
    });

    builder.addMatcher(isSessionEnded, () => initialState);
  },
});

export const { clearLastPlacedOrder } = ordersSlice.actions;
export default ordersSlice.reducer;

const sel = adapter.getSelectors((s) => s.orders);
export const selectMyOrders = sel.selectAll;
export const selectOrderById = (id) => (s) => sel.selectById(s, id) ?? null;
export const selectMyOrdersTotal = (s) => s.orders.total;
export const selectMyOrdersStatus = (s) => s.orders.status;
export const selectMyOrdersError = (s) => s.orders.error;
export const selectCurrentOrder = (s) => s.orders.entities[s.orders.currentId] ?? null;
export const selectOrderDetailStatus = (s) => s.orders.detailStatus;
export const selectOrderDetailError = (s) => s.orders.detailError;
export const selectPlaceOrderStatus = (s) => s.orders.placeStatus;
export const selectPlaceOrderError = (s) => s.orders.placeError;
export const selectLastPlacedOrder = (s) => s.orders.lastPlacedOrder;

// Sync service helper: turns the stored items string/JSON into an array.
export const parseOrderItems = (order) => orderService.parseItems(order);
