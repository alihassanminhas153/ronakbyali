// USAGE (customer)
//   const res = await dispatch(placeOrder({ form, toast: true }));         // items come from the cart
//   const res = await dispatch(addCartToOrder({ orderId, toast: true }));  // add the cart to an order that is still pending
//   dispatch(fetchOpenOrders());                                           // orders that can still be changed
//   const open = useSelector(selectOpenOrders);
//   dispatch(fetchMyOrders({ limit: 10, offset: 0 }));
//   const orders = useSelector(selectMyOrders);
//   dispatch(updateOrderItemQuantity({ orderId, itemKey, quantity }));     // lower or remove (0) a line
//   dispatch(updateOrderDetails({ orderId, data: { city, address } }));
//   dispatch(cancelMyOrder({ orderId }));
//   dispatch(requestOrderReturn({ orderId, note }));
//   canEditOrder(order)                                                    // customer details can be changed
//
// USAGE (admin, support, manager: every customer's orders)
//   dispatch(fetchStaffOrders({ limit: 25, offset: 0, status: 'pending' }));
//   dispatch(searchStaffOrders({ term: 'RBA-7K', status: '' }));
//   dispatch(fetchStaffCounts());
//   dispatch(updateOrderStatus({ orderId, status: 'dispatched' }));
//   dispatch(placeCustomOrder({ product, quantity, selectedIds, form, files }));
//   dispatch(placeDirectOrder({ product, quantity, form, designs }));   // designs: [{ designImageId, quantity }] for products with designs
//   dispatch(fetchStaffCustomOrders({ status: 'requested' }));
//   dispatch(fetchStaffConfirmedOrders({ isCustom: true }));
//   dispatch(updateOrderPayment({ orderId, paymentStatus: 'paid' }));
//   dispatch(setOrderTracking({ orderId, trackingId }));
//   dispatch(setOrderAdminNotes({ orderId, adminNotes }));
//   const rows = useSelector(selectStaffOrders);
import { createAsyncThunk, createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import { customOrderService, orderConfirmationService, orderService, settingsService } from './services';
import trackerService from '../../lib/appwrite/tracker';
import { LOGIN_REQUIRED, fail, getUserId, stripToast } from './utils';
import { isSessionEnded, refreshProfile } from './authSlice';
import { refreshMyProfile } from './userSlice';
import { fetchCart, getDeliveryChargesForLines, getProductCheckoutPrice } from './cartSlice';
import { getDesigns } from '../../lib/designPicks';
import { fetchWishlist } from './wishlistSlice';
import { openLoginModal } from './uiSlice';
import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  DELIVERY_TYPES,
  USER_EDITABLE_STATUSES,
  USER_ITEM_EDITABLE_STATUSES,
  USER_CANCELLABLE_STATUSES,
  STAFF_ROLES,
  canUserCancel,
  nextStatusesFor,
  normalizeStatus,
} from '../../lib/appwrite/order';

export {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  DELIVERY_TYPES,
  USER_EDITABLE_STATUSES,
  USER_ITEM_EDITABLE_STATUSES,
  USER_CANCELLABLE_STATUSES,
  nextStatusesFor,
  normalizeStatus,
};

const byNewest = (a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || '');
const adapter = createEntityAdapter({ selectId: (o) => o.$id, sortComparer: byNewest });
const staffAdapter = createEntityAdapter({ selectId: (o) => o.$id, sortComparer: byNewest });
const customOrderAdapter = createEntityAdapter({ selectId: (o) => o.$id, sortComparer: byNewest });
const confirmationAdapter = createEntityAdapter({ selectId: (row) => row.$id, sortComparer: byNewest });
// Tracker rows are looked up by the ORDER's id (the tracker row id equals the order id).
const trackerAdapter = createEntityAdapter({ selectId: (t) => t.orderId });

const initialState = adapter.getInitialState({
  total: 0,
  status: 'idle', // my orders list
  error: null,
  currentId: null, // order shown on a detail page
  detailStatus: 'idle',
  detailError: null,
  placeStatus: 'idle',
  placeError: null,
  lastPlacedOrder: null,
  lastPlacedKind: null, // 'new' | 'added' | 'custom'
  openIds: [], // my orders that can still be changed
  openStatus: 'idle',
  updating: false, // a customer change is in progress
  updateError: null,
  // courier link + timeline of each order, by order id
  tracker: trackerAdapter.getInitialState({ status: 'idle', saving: false, error: null, details: {} }),
  // every customer's orders (admin, support, manager). Kept apart from "my orders".
  staff: staffAdapter.getInitialState({
    total: 0,
    status: 'idle',
    error: null,
    updating: false,
    updateError: null,
    warning: null, // e.g. "status changed but stock could not be updated"
    counts: {},
    analytics: [],
    analyticsStatus: 'idle',
    analyticsError: null,
    custom: customOrderAdapter.getInitialState({
      total: 0,
      status: 'idle',
      error: null,
      updating: false,
      updateError: null,
    }),
    confirmations: confirmationAdapter.getInitialState({
      total: 0,
      status: 'idle',
      error: null,
    }),
  }),
});

/* ---------- helpers ---------- */

export const canEditOrder = (order) => !!order && USER_EDITABLE_STATUSES.includes(normalizeStatus(order.status));
export const canAddItemsToOrder = (order) => !!order && USER_ITEM_EDITABLE_STATUSES.includes(normalizeStatus(order.status));
// A customer can cancel until the order is dispatched (pending, processing, packed).
export const canCancelOrder = (order) => canUserCancel(order);

// A line of a product with designs carries the design name (variant) and the design image
// (designImageId from a direct order, imageId from the cart). The image must still belong to the product.
const lineImageId = (l) => {
  const wanted = l.designImageId ?? l.imageId ?? null;
  const ids = l.product?.imageIds || [];
  return wanted && ids.includes(wanted) ? wanted : ids[0] ?? null;
};

const linesToItems = (lines, paymentType = 'cod', sales = []) =>
  lines.map((l) => ({
    productId: l.productId,
    name: l.product?.name,
    price: getProductCheckoutPrice(l.product, paymentType, sales),
    quantity: l.quantity,
    fileId: lineImageId(l),
    variant: l.variant ?? null,
  }));

// Checks the cart lines against current stock. `already` = items of an
// earlier order the cart is being added to (stock is not taken until shipping,
// so the units in that order still count against what is left).
const stockProblem = (lines, already = []) => {
  const inOrder = new Map();
  already.forEach((i) => inOrder.set(i.productId, (inOrder.get(i.productId) || 0) + (Number(i.quantity) || 0)));
  const wanted = new Map();
  lines.forEach((l) => wanted.set(l.productId, (wanted.get(l.productId) || 0) + (Number(l.quantity) || 0)));

  for (const l of lines) {
    const p = l.product;
    if (!p) continue;
    if (p.isCustom === true) continue;
    const remaining = p.remaining == null ? null : Number(p.remaining);
    if (p.status === 'outOfStock' || (remaining != null && remaining <= 0)) {
      return `${p.name} is out of stock. Remove it from your cart to continue.`;
    }
    const earlier = inOrder.get(l.productId) || 0;
    const combined = (wanted.get(l.productId) || 0) + earlier;
    if (remaining != null && combined > remaining) {
      return earlier
        ? `Only ${remaining} of ${p.name} ${remaining === 1 ? 'is' : 'are'} available, including the ${earlier} already in your order.`
        : `Only ${remaining} of ${p.name} ${remaining === 1 ? 'is' : 'are'} available. Lower the quantity in your cart.`;
    }
  }
  return null;
};

// Delivery charge for an order whose items changed. Pickup stays free.
const chargesFor = async (order, subtotal) => {
  if (order.deliveryType === 'pickup') return 0;
  const c = await settingsService.getDeliveryCharges(subtotal);
  return c === false ? Number(order.deliveryCharges) || 0 : Number(c) || 0;
};

const subtotalOf = (items) => items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

const needLogin = (dispatch, rejectWithValue) => {
  dispatch(openLoginModal());
  return rejectWithValue(LOGIN_REQUIRED, { toast: false });
};

// The order from the cache, or loaded fresh.
const loadOrder = async (state, orderId) => state.orders.entities[orderId] || (await orderService.getOrder(orderId));

/* ---------- customer: place / add to an earlier order ---------- */

export const placeOrder = createAsyncThunk('orders/place', async (arg, { getState, dispatch, rejectWithValue }) => {
  const { form = {} } = stripToast(arg);
  const state = getState();
  const profile = state.auth.profile;
  if (!profile) return needLogin(dispatch, rejectWithValue);

  const lines = state.cart.lines;
  if (!lines.length) return fail(rejectWithValue, 'Your cart is empty.', arg);
  if (lines.some((line) => line.product?.isCustom === true)) {
    return fail(rejectWithValue, 'Custom products must be ordered through the Customize form.', arg);
  }
  const problem = stockProblem(lines);
  if (problem) return fail(rejectWithValue, problem, arg);

  const paymentType = form.paymentType === 'advance' ? 'advance' : 'cod';
  const deliveryType = form.deliveryType === 'pickup' ? 'pickup' : 'regular';
  const items = linesToItems(lines, paymentType, Object.values(state.sales.entities || {}));
  const subtotal = subtotalOf(items);
  let deliveryCharges = 0;
  if (deliveryType !== 'pickup') {
    try {
      deliveryCharges = await getDeliveryChargesForLines(lines, subtotal);
    } catch (error) {
      console.error(error.message);
      return fail(rejectWithValue, 'Could not calculate delivery charges. Please try again.', arg);
    }
    if (deliveryCharges === false || !Number.isFinite(Number(deliveryCharges))) {
      return fail(rejectWithValue, 'Could not calculate delivery charges. Please try again.', arg);
    }
  }
  const safeForm = {
    ...form,
    deliveryType,
    deliveryCharges: Number(deliveryCharges) || 0,
    discount: 0,
    advanceAmount: 0,
    paymentMethod: paymentType === 'advance' ? 'bank_transfer' : 'cod',
  };

  const order = await orderService.placeOrder({ profile, items, form: safeForm });
  if (!order) {
    return fail(rejectWithValue, orderService.lastError || 'Could not place your order. Please try again.', arg);
  }
  // Role, contact details, order count and paid total may have changed.
  await Promise.all([dispatch(refreshProfile()), dispatch(refreshMyProfile()), dispatch(fetchCart()), dispatch(fetchWishlist())]);
  return order;
});

export const placeDirectOrder = createAsyncThunk('orders/placeDirect', async (arg, { getState, dispatch, rejectWithValue }) => {
  const { product, quantity, form = {}, designs: designsArg } = stripToast(arg);
  const state = getState();
  const profile = state.auth.profile;
  if (!profile) return needLogin(dispatch, rejectWithValue);

  // Products with designs: one line per chosen design. Name and image are re-read from the product.
  const productDesigns = getDesigns(product);
  let designLines = null;
  if (productDesigns.length) {
    designLines = (Array.isArray(designsArg) ? designsArg : [])
      .map((d) => {
        const match = productDesigns.find((x) => x.id === (d?.designImageId ?? d?.imageId));
        const qty = Math.floor(Number(d?.quantity));
        return match && qty > 0
          ? { productId: product.$id, product, quantity: qty, variant: match.name, designImageId: match.id }
          : null;
      })
      .filter(Boolean);
    if (!designLines.length) return fail(rejectWithValue, 'Choose a design before ordering.', arg);
  } else if (!product?.$id || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    return fail(rejectWithValue, 'Choose a valid product quantity.', arg);
  }
  if (!product?.$id) return fail(rejectWithValue, 'Choose a valid product quantity.', arg);
  if (product.isCustom === true) return fail(rejectWithValue, 'Use the Customize form for this product.', arg);
  const paymentType = form.paymentType === 'advance' ? 'advance' : 'cod';
  const deliveryType = form.deliveryType || 'regular';
  if (!DELIVERY_TYPES.includes(deliveryType)) {
    return fail(rejectWithValue, 'Choose a valid delivery option.', arg);
  }

  const lines = designLines || [{ productId: product.$id, product, quantity: Number(quantity) }];
  const problem = stockProblem(lines);
  if (problem) return fail(rejectWithValue, problem, arg);

  const items = linesToItems(lines, paymentType, Object.values(state.sales.entities || {}));
  const subtotal = subtotalOf(items);
  let charge = 0;
  if (deliveryType !== 'pickup') {
    try {
      charge = await getDeliveryChargesForLines(lines, subtotal);
    } catch (error) {
      console.error(error.message);
      return fail(rejectWithValue, 'Could not calculate delivery charges. Please try again.', arg);
    }
    if (charge === false || !Number.isFinite(Number(charge))) {
      return fail(rejectWithValue, 'Could not calculate delivery charges. Please try again.', arg);
    }
  }
  const safeForm = {
    ...form,
    deliveryType,
    deliveryCharges: Number(charge) || 0,
    discount: 0,
    advanceAmount: 0,
    paymentMethod: paymentType === 'advance' ? 'bank_transfer' : 'cod',
  };
  const order = await orderService.placeOrder({ profile, items, form: safeForm });
  if (!order) {
    return fail(rejectWithValue, orderService.lastError || 'Could not place your order. Please try again.', arg);
  }

  await Promise.all([dispatch(refreshProfile()), dispatch(refreshMyProfile()), dispatch(fetchCart()), dispatch(fetchWishlist())]);
  return order;
});

export const placeCustomOrder = createAsyncThunk('orders/placeCustom', async (arg, { getState, dispatch, rejectWithValue }) => {
  const { product, quantity, selectedIds, form = {}, files = [] } = stripToast(arg);
  const state = getState();
  const profile = state.auth.profile;
  if (!profile) return needLogin(dispatch, rejectWithValue);
  if (product?.isCustom !== true) return fail(rejectWithValue, 'This product is not available for customization.', arg);
  const order = await customOrderService.placeCustomOrder({
    profile,
    product,
    quantity,
    selectedIds,
    form,
    files,
    sales: Object.values(state.sales.entities || {}),
  });
  if (!order) return fail(rejectWithValue, customOrderService.lastError || 'Could not place your customization request.', arg);
  await Promise.all([dispatch(refreshProfile()), dispatch(refreshMyProfile()), dispatch(fetchWishlist())]);
  return order;
});

// "Add these products to my earlier order" (only works until that order ships).
export const addCartToOrder = createAsyncThunk('orders/addCart', async (arg, { getState, dispatch, rejectWithValue }) => {
  const { orderId } = stripToast(arg);
  const state = getState();
  const profile = state.auth.profile;
  if (!profile) return needLogin(dispatch, rejectWithValue);

  const lines = state.cart.lines;
  if (!lines.length) return fail(rejectWithValue, 'Your cart is empty.', arg);
  if (lines.some((line) => line.product?.isCustom === true)) {
    return fail(rejectWithValue, 'Custom products must be ordered through the Customize form.', arg);
  }

  const current = await loadOrder(state, orderId);
  if (!current) return fail(rejectWithValue, 'We could not find that order.', arg);
  if (!canAddItemsToOrder(current)) {
    return fail(rejectWithValue, 'Products can only be added while an order is pending.', arg);
  }

  const existing = orderService.parseItems(current);
  const problem = stockProblem(lines, existing);
  if (problem) return fail(rejectWithValue, problem, arg);

  const items = linesToItems(lines, 'cod', Object.values(state.sales.entities || {}));
  const combinedSubtotal = subtotalOf(orderService.mergeItems(existing, orderService._cleanItems(items)));
  const deliveryCharges = await chargesFor(current, combinedSubtotal);

  const order = await orderService.addItemsToOrder({ profile, orderId, items, deliveryCharges });
  if (!order) {
    return fail(rejectWithValue, orderService.lastError || 'Could not add these items to your order.', arg);
  }
  await Promise.all([dispatch(fetchCart()), dispatch(fetchWishlist())]);
  return order;
});

/* ---------- customer: read ---------- */

export const fetchMyOrders = createAsyncThunk('orders/fetchMine', async (arg, { getState, rejectWithValue }) => {
  const { limit = 10, offset = 0 } = stripToast(arg);
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const result = await orderService.getUserOrders({ userId, limit, offset });
  if (!result) return fail(rejectWithValue, 'Could not load your orders.', arg);
  return { rows: result.rows || [], total: result.total || 0, offset };
});

export const fetchOpenOrders = createAsyncThunk('orders/fetchOpen', async (arg, { getState, rejectWithValue }) => {
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const rows = await orderService.getOpenOrders({ userId });
  if (!rows) return fail(rejectWithValue, 'Could not check your earlier orders.', arg);
  return rows;
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

/* ---------- customer: change an order before it ships ---------- */

export const updateOrderItemQuantity = createAsyncThunk('orders/itemQuantity', async (arg, { getState, rejectWithValue }) => {
  const { orderId, itemKey, quantity } = stripToast(arg);
  const state = getState();
  const userId = getUserId(state.auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });

  const current = await loadOrder(state, orderId);
  if (!current) return fail(rejectWithValue, 'We could not find that order.', arg);
  const nextItems = orderService
    .parseItems(current)
    .map((i) => (orderService.itemKey(i) === itemKey ? { ...i, quantity: Number(quantity) } : i))
    .filter((i) => i.quantity > 0);
  const deliveryCharges = await chargesFor(current, subtotalOf(nextItems));

  const order = await orderService.setItemQuantity({ userId, orderId, itemKey, quantity, deliveryCharges });
  if (!order) return fail(rejectWithValue, orderService.lastError || 'Could not update the order.', arg);
  return order;
});

export const updateOrderDetails = createAsyncThunk('orders/details', async (arg, { getState, rejectWithValue }) => {
  const { orderId, data } = stripToast(arg);
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const order = await orderService.updateOrderDetails({ userId, orderId, data });
  if (!order) return fail(rejectWithValue, orderService.lastError || 'Could not update the order.', arg);
  return order;
});

export const cancelMyOrder = createAsyncThunk('orders/cancelMine', async (arg, { getState, rejectWithValue }) => {
  const { orderId } = stripToast(arg);
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const order = await orderService.cancelMyOrder({ userId, orderId });
  if (!order) return fail(rejectWithValue, orderService.lastError || 'Could not cancel the order.', arg);
  return order;
});

export const requestOrderReturn = createAsyncThunk('orders/requestReturn', async (arg, { getState, rejectWithValue }) => {
  const { orderId, note } = stripToast(arg);
  const userId = getUserId(getState().auth.profile);
  if (!userId) return rejectWithValue(LOGIN_REQUIRED, { toast: false });
  const order = await orderService.requestReturn({ userId, orderId, note });
  if (!order) return fail(rejectWithValue, orderService.lastError || 'Could not request the return.', arg);
  return order;
});

const customerEdits = [addCartToOrder, updateOrderItemQuantity, updateOrderDetails, cancelMyOrder, requestOrderReturn];

/* ---------- staff: every customer's orders ---------- */
// The app only checks the role loosely. The real gate is Appwrite: without the
// admin / support / manager label on the account these calls return nothing.

const notStaff = (profile) => profile?.role && !STAFF_ROLES.includes(profile.role);

export const fetchStaffOrders = createAsyncThunk('orders/staffFetch', async (arg, { getState, rejectWithValue }) => {
  const { limit = 25, offset = 0, ...filters } = stripToast(arg);
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to all orders.');
  const result = await orderService.getOrdersPage({ limit, offset, ...filters });
  if (!result) return fail(rejectWithValue, 'Could not load orders.', arg);
  return { rows: result.rows || [], total: result.total || 0, offset };
});

export const searchStaffOrders = createAsyncThunk('orders/staffSearch', async (arg, { getState, rejectWithValue }) => {
  const { term, status, isCustom } = stripToast(arg);
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to all orders.');
  const rows = await orderService.searchOrders({ term, status, isCustom });
  if (!rows) return fail(rejectWithValue, 'Could not search orders.', arg);
  return { rows, total: rows.length };
});

export const fetchStaffCounts = createAsyncThunk('orders/staffCounts', async (arg, { getState, rejectWithValue }) => {
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to all orders.');
  const counts = await orderService.getStatusCounts();
  if (!counts) return rejectWithValue('Could not load the order counts.');
  return counts;
});

export const fetchStaffOrderAnalytics = createAsyncThunk('orders/staffAnalytics', async (arg, { getState, rejectWithValue }) => {
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to order analytics.');
  const from = new Date(Date.now() - 182 * 864e5).toISOString();
  const rows = await orderService.getOrdersSince(from);
  if (!rows) return fail(rejectWithValue, orderService.lastError || 'Could not load order analytics.', arg);
  return rows;
});

export const fetchStaffCustomOrders = createAsyncThunk('orders/staffCustomFetch', async (arg, { getState, rejectWithValue }) => {
  const { orderId, limit = 50, offset = 0, status } = stripToast(arg);
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to custom orders.');
  const result = orderId
    ? await customOrderService.getByOrderId(orderId)
    : await customOrderService.getCustomOrders({ limit, offset, status });
  if (result === false) return fail(rejectWithValue, customOrderService.lastError || 'Could not load custom orders.', arg);
  if (orderId) return { rows: result ? [result] : [], total: result ? 1 : 0, offset: 0 };
  return { rows: result.rows || [], total: result.total || 0, offset };
});

export const updateStaffCustomOrder = createAsyncThunk('orders/staffCustomUpdate', async (arg, { getState, rejectWithValue }) => {
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to custom orders.');
  const { rowId, patch } = stripToast(arg);
  const result = await customOrderService.updateCustomOrder(rowId, patch);
  if (!result) return fail(rejectWithValue, customOrderService.lastError || 'Could not update the custom order.', arg);
  return result;
});

export const fetchStaffConfirmedOrders = createAsyncThunk('orders/staffConfirmations', async (arg, { getState, rejectWithValue }) => {
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to confirmed orders.');
  const result = await orderConfirmationService.list(stripToast(arg));
  if (!result) return fail(rejectWithValue, orderConfirmationService.lastError || 'Could not load confirmed orders.', arg);
  return result;
});

/* ---------- staff: tracker (courier link + timeline) ---------- */

const orderFor = (state, orderId) => state.orders.staff.entities[orderId] || state.orders.entities[orderId] || { $id: orderId };

// Loads the tracker of an order. An older order without one gets it created here.
export const fetchTracker = createAsyncThunk('orders/trackerFetch', async (arg, { getState, rejectWithValue }) => {
  const { orderId } = stripToast(arg);
  trackerService.lastError = null;
  const tracker = await trackerService.ensure(orderFor(getState(), orderId));
  if (!tracker) return rejectWithValue(trackerService.lastError || 'Could not load the tracking updates.');
  return tracker;
});

export const fetchMyTracker = createAsyncThunk('orders/myTrackerFetch', async (orderId, { getState, rejectWithValue }) => {
  const state = getState();
  const userId = getUserId(state.auth.profile);
  const order = state.orders.entities[orderId];
  if (!userId || !order || order.userId !== userId) return rejectWithValue('Order not found.');
  const tracker = await trackerService.getForOrder(orderId);
  if (tracker === false) return rejectWithValue(trackerService.lastError || 'Could not load the tracking updates.');
  return tracker || { orderId, link: null, detail: null, updates: [] };
});

const trackerWrite = (type, call, message) =>
  createAsyncThunk(type, async (arg, { getState, rejectWithValue }) => {
    if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to all orders.');
    const args = stripToast(arg);
    trackerService.lastError = null;
    const tracker = await call(args, orderFor(getState(), args.orderId));
    if (!tracker) return fail(rejectWithValue, trackerService.lastError || message, arg);
    return tracker;
  });

// dispatch(addTrackerUpdate({ orderId, title, note }))   one more step on the timeline
export const addTrackerUpdate = trackerWrite(
  'orders/trackerAdd',
  ({ orderId, title, note }, order) => trackerService.addUpdate(orderId, { title, note, status: null, by: 'staff' }, { order }),
  'Could not add the update.'
);
// dispatch(setTrackerLink({ orderId, link }))            the courier link (TCS etc), '' clears it
export const setTrackerLink = trackerWrite(
  'orders/trackerLink',
  ({ orderId, link }, order) => trackerService.setLink(orderId, link, { order }),
  'Could not save the tracking link.'
);
export const postOrderDetail = trackerWrite(
  'orders/trackerPostDetail',
  ({ orderId, detail }, order) => trackerService.postDetail(orderId, detail, { order }),
  'Could not post the order detail.'
);
export const deleteLatestOrderDetail = trackerWrite(
  'orders/trackerDeleteDetail',
  ({ orderId }) => trackerService.deleteLatestDetail(orderId),
  'Could not delete the latest order detail.'
);

export const fetchTrackerDetails = createAsyncThunk('orders/trackerDetails', async (orderIds, { getState, rejectWithValue }) => {
  if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to order details.');
  const details = await trackerService.getDetails(orderIds);
  if (!details) return rejectWithValue(trackerService.lastError || 'Could not load order details.');
  return details;
});

/* ---------- staff: change an order ---------- */

// `after` runs once the change worked, for things that changed elsewhere (timeline, counts).
const staffThunk = (type, call, message, after) =>
  createAsyncThunk(type, async (arg, { getState, dispatch, rejectWithValue }) => {
    if (notStaff(getState().auth.profile)) return rejectWithValue('You do not have access to all orders.');
    const args = stripToast(arg);
    orderService.lastError = null;
    const order = await call(args);
    if (!order) return fail(rejectWithValue, orderService.lastError || message, arg);
    // lastError can still hold a warning when the status changed but stock did not.
    const warning = orderService.lastError || null;
    if (after) await after(args, dispatch);
    return { order, warning };
  });

const refreshTimeline = (a, dispatch) => dispatch(fetchTracker({ orderId: a.orderId }));
const afterStatus = (a, dispatch) => Promise.all([refreshTimeline(a, dispatch), dispatch(fetchStaffCounts())]);

export const updateOrderStatus = staffThunk(
  'orders/staffStatus',
  ({ orderId, status }) => orderService.updateStatus(orderId, status),
  'Could not change the status.',
  afterStatus
);
export const updateOrderConfirmation = staffThunk(
  'orders/staffConfirmation',
  ({ orderId, isConfirmed, confirmedBy }) => orderService.updateConfirmationStatus(orderId, isConfirmed, { confirmedBy }),
  'Could not update the order confirmation.',
  (arg, dispatch) => Promise.all([
    refreshTimeline(arg, dispatch),
    dispatch(fetchStaffConfirmedOrders({ limit: 100, offset: 0 })),
  ])
);
export const updateOrderPayment = staffThunk(
  'orders/staffPayment',
  ({ orderId, paymentStatus }) => orderService.updatePaymentStatus(orderId, paymentStatus),
  'Could not change the payment status.'
);
export const setOrderTracking = staffThunk(
  'orders/staffTracking',
  ({ orderId, trackingId }) => orderService.setTracking(orderId, trackingId || null),
  'Could not save the tracking id.'
);
export const setOrderAdminNotes = staffThunk(
  'orders/staffNotes',
  ({ orderId, adminNotes }) => orderService.setAdminNotes(orderId, adminNotes || null),
  'Could not save the notes.'
);
// dispatch(updateOrderFields({ orderId, data: { address, city, ... } }))
// Only the keys editable for the order's status are accepted (see lib/appwrite/order.js).
export const updateOrderFields = staffThunk(
  'orders/staffFields',
  ({ orderId, data }) => orderService.updateStaffFields(orderId, data),
  'Could not save the changes.',
  refreshTimeline
);

export const rejectOrderReturn = staffThunk(
  'orders/staffRejectReturn',
  ({ orderId }) => orderService.rejectReturnRequest(orderId),
  'Could not reject the return request.',
  refreshTimeline
);

const staffEdits = [updateOrderStatus, updateOrderConfirmation, updateOrderPayment, setOrderTracking, setOrderAdminNotes, updateOrderFields, rejectOrderReturn];

/* ---------- slice ---------- */

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearLastPlacedOrder: (state) => {
      state.lastPlacedOrder = null;
      state.lastPlacedKind = null;
      state.placeStatus = 'idle';
      state.placeError = null;
    },
    clearOrderUpdateError: (state) => {
      state.updateError = null;
    },
    clearTrackerError: (state) => {
      state.tracker.error = null;
    },
    clearStaffWarning: (state) => {
      state.staff.warning = null;
      state.staff.updateError = null;
    },
  },
  // Every addCase comes first. addMatcher must stay last (Redux Toolkit rule).
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placeStatus = 'loading';
        state.placeError = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placeStatus = 'succeeded';
        state.lastPlacedOrder = action.payload;
        state.lastPlacedKind = 'new';
        adapter.upsertOne(state, action.payload);
        if (!state.openIds.includes(action.payload.$id)) state.openIds.unshift(action.payload.$id);
        state.total += 1;
      })
      .addCase(placeDirectOrder.pending, (state) => {
        state.placeStatus = 'loading';
        state.placeError = null;
      })
      .addCase(placeDirectOrder.fulfilled, (state, action) => {
        state.placeStatus = 'succeeded';
        state.lastPlacedOrder = action.payload;
        state.lastPlacedKind = 'new';
        adapter.upsertOne(state, action.payload);
        if (!state.openIds.includes(action.payload.$id)) state.openIds.unshift(action.payload.$id);
        state.total += 1;
      })
      .addCase(placeDirectOrder.rejected, (state, action) => {
        state.placeStatus = 'failed';
        if (action.payload !== LOGIN_REQUIRED) state.placeError = action.payload || action.error?.message;
      })
      .addCase(placeCustomOrder.pending, (state) => {
        state.placeStatus = 'loading';
        state.placeError = null;
      })
      .addCase(placeCustomOrder.fulfilled, (state, action) => {
        state.placeStatus = 'succeeded';
        state.lastPlacedOrder = action.payload;
        state.lastPlacedKind = 'custom';
        adapter.upsertOne(state, action.payload);
        if (!state.openIds.includes(action.payload.$id)) state.openIds.unshift(action.payload.$id);
        state.total += 1;
      })
      .addCase(placeCustomOrder.rejected, (state, action) => {
        state.placeStatus = 'failed';
        if (action.payload !== LOGIN_REQUIRED) state.placeError = action.payload || action.error?.message;
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
        adapter.upsertMany(state, action.payload.rows);
        state.total = action.payload.total;
        state.status = 'succeeded';
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        if (action.payload === LOGIN_REQUIRED) {
          state.status = 'idle';
          return;
        }
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      })
      .addCase(fetchOpenOrders.pending, (state) => {
        state.openStatus = 'loading';
      })
      .addCase(fetchOpenOrders.fulfilled, (state, action) => {
        adapter.upsertMany(state, action.payload);
        state.openIds = action.payload.map((o) => o.$id);
        state.openStatus = 'succeeded';
      })
      .addCase(fetchOpenOrders.rejected, (state, action) => {
        if (action.payload === LOGIN_REQUIRED) {
          state.openStatus = 'idle';
          return;
        }
        state.openStatus = 'failed';
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

    customerEdits.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.updating = true;
          state.updateError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.updating = false;
          adapter.upsertOne(state, action.payload);
          if (thunk === addCartToOrder) {
            state.lastPlacedOrder = action.payload;
            state.lastPlacedKind = 'added';
          }
          // keep the "can still be changed" list in step with the new status
          if (!canEditOrder(action.payload)) state.openIds = state.openIds.filter((id) => id !== action.payload.$id);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.updating = false;
          if (action.payload !== LOGIN_REQUIRED) state.updateError = action.payload || action.error?.message;
        });
    });

    builder
      .addCase(fetchStaffOrders.pending, (state) => {
        state.staff.status = 'loading';
        state.staff.error = null;
      })
      .addCase(fetchStaffOrders.fulfilled, (state, action) => {
        const { rows, total, offset } = action.payload;
        if (offset > 0) staffAdapter.upsertMany(state.staff, rows);
        else staffAdapter.setAll(state.staff, rows);
        state.staff.total = total;
        state.staff.status = 'succeeded';
      })
      .addCase(fetchStaffOrders.rejected, (state, action) => {
        state.staff.status = 'failed';
        state.staff.error = action.payload || action.error?.message;
      })
      .addCase(searchStaffOrders.pending, (state) => {
        state.staff.status = 'loading';
        state.staff.error = null;
      })
      .addCase(searchStaffOrders.fulfilled, (state, action) => {
        staffAdapter.setAll(state.staff, action.payload.rows);
        state.staff.total = action.payload.total;
        state.staff.status = 'succeeded';
      })
      .addCase(searchStaffOrders.rejected, (state, action) => {
        state.staff.status = 'failed';
        state.staff.error = action.payload || action.error?.message;
      })
      .addCase(fetchStaffCounts.fulfilled, (state, action) => {
        state.staff.counts = action.payload;
      })
      .addCase(fetchStaffOrderAnalytics.pending, (state) => {
        state.staff.analyticsStatus = 'loading';
        state.staff.analyticsError = null;
      })
      .addCase(fetchStaffOrderAnalytics.fulfilled, (state, action) => {
        state.staff.analytics = action.payload;
        state.staff.analyticsStatus = 'succeeded';
      })
      .addCase(fetchStaffOrderAnalytics.rejected, (state, action) => {
        state.staff.analyticsStatus = 'failed';
        state.staff.analyticsError = action.payload || action.error?.message;
      })
      .addCase(fetchStaffCustomOrders.pending, (state) => {
        state.staff.custom.status = 'loading';
        state.staff.custom.error = null;
      })
      .addCase(fetchStaffCustomOrders.fulfilled, (state, action) => {
        const { rows, total, offset } = action.payload;
        if (offset > 0) customOrderAdapter.upsertMany(state.staff.custom, rows);
        else customOrderAdapter.setAll(state.staff.custom, rows);
        state.staff.custom.total = total;
        state.staff.custom.status = 'succeeded';
      })
      .addCase(fetchStaffCustomOrders.rejected, (state, action) => {
        state.staff.custom.status = 'failed';
        state.staff.custom.error = action.payload || action.error?.message;
      })
      .addCase(updateStaffCustomOrder.pending, (state) => {
        state.staff.custom.updating = true;
        state.staff.custom.updateError = null;
      })
      .addCase(updateStaffCustomOrder.fulfilled, (state, action) => {
        state.staff.custom.updating = false;
        customOrderAdapter.upsertOne(state.staff.custom, action.payload);
      })
      .addCase(updateStaffCustomOrder.rejected, (state, action) => {
        state.staff.custom.updating = false;
        state.staff.custom.updateError = action.payload || action.error?.message;
      })
      .addCase(fetchStaffConfirmedOrders.pending, (state) => {
        state.staff.confirmations.status = 'loading';
        state.staff.confirmations.error = null;
      })
      .addCase(fetchStaffConfirmedOrders.fulfilled, (state, action) => {
        confirmationAdapter.setAll(state.staff.confirmations, action.payload.rows);
        state.staff.confirmations.total = action.payload.total;
        state.staff.confirmations.status = 'succeeded';
      })
      .addCase(fetchStaffConfirmedOrders.rejected, (state, action) => {
        state.staff.confirmations.status = 'failed';
        state.staff.confirmations.error = action.payload || action.error?.message;
      });

    staffEdits.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.staff.updating = true;
          state.staff.updateError = null;
          state.staff.warning = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          const { order, warning } = action.payload;
          state.staff.updating = false;
          state.staff.warning = warning;
          staffAdapter.upsertOne(state.staff, order);
          const analyticsIndex = state.staff.analytics.findIndex((entry) => entry.$id === order.$id);
          if (analyticsIndex >= 0) state.staff.analytics[analyticsIndex] = order;
          if (state.entities[order.$id]) adapter.upsertOne(state, order);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.staff.updating = false;
          state.staff.updateError = action.payload || action.error?.message;
        });
    });

    builder
      .addCase(fetchTracker.pending, (state) => {
        state.tracker.status = 'loading';
        state.tracker.error = null;
      })
      .addCase(fetchTracker.fulfilled, (state, action) => {
        trackerAdapter.upsertOne(state.tracker, action.payload);
        state.tracker.status = 'succeeded';
      })
        .addCase(fetchMyTracker.fulfilled, (state, action) => {
          trackerAdapter.upsertOne(state.tracker, action.payload);
        })
      .addCase(fetchTracker.rejected, (state, action) => {
        state.tracker.status = 'failed';
        state.tracker.error = action.payload || action.error?.message;
      });

    [addTrackerUpdate, setTrackerLink, postOrderDetail, deleteLatestOrderDetail].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.tracker.saving = true;
          state.tracker.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.tracker.saving = false;
          trackerAdapter.upsertOne(state.tracker, action.payload);
          if (action.payload.detail !== undefined) {
            state.tracker.details[action.payload.orderId] = action.payload.detail;
          }
        })
        .addCase(thunk.rejected, (state, action) => {
          state.tracker.saving = false;
          state.tracker.error = action.payload || action.error?.message;
        });
    });

    builder.addCase(fetchTrackerDetails.fulfilled, (state, action) => {
      state.tracker.details = { ...state.tracker.details, ...action.payload };
    });

    builder.addMatcher(isSessionEnded, () => initialState);
  },
});

export const { clearLastPlacedOrder, clearOrderUpdateError, clearStaffWarning, clearTrackerError } = ordersSlice.actions;
export default ordersSlice.reducer;

/* ---------- selectors ---------- */

const sel = adapter.getSelectors((s) => s.orders);
const staffSel = staffAdapter.getSelectors((s) => s.orders.staff);
const customOrderSel = customOrderAdapter.getSelectors((s) => s.orders.staff.custom);
const confirmationSel = confirmationAdapter.getSelectors((s) => s.orders.staff.confirmations);

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
export const selectLastPlacedKind = (s) => s.orders.lastPlacedKind;
export const selectOpenOrdersStatus = (s) => s.orders.openStatus;
export const selectOrderUpdating = (s) => s.orders.updating;
export const selectOrderUpdateError = (s) => s.orders.updateError;

// Orders that are still pending, newest first.
export const selectOpenOrders = (s) =>
  s.orders.openIds.map((id) => s.orders.entities[id]).filter(canAddItemsToOrder);

export const selectStaffOrders = staffSel.selectAll;
export const selectStaffTotal = (s) => s.orders.staff.total;
export const selectStaffStatus = (s) => s.orders.staff.status;
export const selectStaffError = (s) => s.orders.staff.error;
export const selectStaffUpdating = (s) => s.orders.staff.updating;
export const selectStaffUpdateError = (s) => s.orders.staff.updateError;
export const selectStaffWarning = (s) => s.orders.staff.warning;
export const selectStaffCounts = (s) => s.orders.staff.counts;
export const selectStaffOrderAnalytics = (s) => s.orders.staff.analytics;
export const selectStaffOrderAnalyticsStatus = (s) => s.orders.staff.analyticsStatus;
export const selectStaffOrderAnalyticsError = (s) => s.orders.staff.analyticsError;
export const selectStaffOrderById = (id) => (s) => s.orders.staff.entities[id] ?? null;
export const selectStaffCustomOrders = customOrderSel.selectAll;
export const selectStaffCustomOrdersTotal = (s) => s.orders.staff.custom.total;
export const selectStaffCustomOrdersStatus = (s) => s.orders.staff.custom.status;
export const selectStaffCustomOrdersError = (s) => s.orders.staff.custom.error;
export const selectStaffCustomOrdersUpdating = (s) => s.orders.staff.custom.updating;
export const selectStaffCustomOrdersUpdateError = (s) => s.orders.staff.custom.updateError;
export const selectCustomOrderForOrder = (orderId) => createSelector(
  [customOrderSel.selectAll],
  (rows) => rows.find((row) => row.orderId === orderId) ?? null,
);
export const selectStaffConfirmedOrders = confirmationSel.selectAll;
export const selectStaffConfirmedOrdersTotal = (s) => s.orders.staff.confirmations.total;
export const selectStaffConfirmedOrdersStatus = (s) => s.orders.staff.confirmations.status;
export const selectStaffConfirmedOrdersError = (s) => s.orders.staff.confirmations.error;

// Tracker (courier link + timeline, newest update first)
export const selectTrackerByOrder = (id) => (s) => s.orders.tracker.entities[id] ?? null;
export const selectTrackerStatus = (s) => s.orders.tracker.status;
export const selectTrackerSaving = (s) => s.orders.tracker.saving;
export const selectTrackerError = (s) => s.orders.tracker.error;
export const selectTrackerDetails = (s) => s.orders.tracker.details;

// Sync service helpers.
export const parseOrderItems = (order) => orderService.parseItems(order);
export const orderItemKey = (item) => orderService.itemKey(item);