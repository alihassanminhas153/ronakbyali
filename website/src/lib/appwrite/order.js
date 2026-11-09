import envVars from '../../../env/var';
import { Client, TablesDB, Query, ID, Permission, Role } from 'appwrite';
import userService from './user';
import cartService from './cart';
import wishlistService from './wishlist';
import productService from './product';
import trackerService from './tracker';

// The statuses below are the real enum values of ronakbyali_orders.status.
export const ORDER_STATUS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
export const PAYMENT_METHODS = ['cod', 'bank_transfer', 'card', 'easypaisa', 'jazzcash'];
export const PAYMENT_STATUS = ['unpaid', 'partial', 'paid', 'refunded'];
export const DELIVERY_TYPES = ['fast', 'regular', 'pickup'];

// "Dispatched" in the app = "shipped" in the database.
// A customer may change or cancel an order only BEFORE it ships.
export const USER_EDITABLE_STATUSES = ['pending', 'confirmed', 'processing'];

// Product stock is taken when an order ships and given back if a shipped or
// delivered order is cancelled or returned. Because a customer can still edit
// an order before it ships, nothing about the stock changes while it is editable.
export const STOCK_TAKEN_STATUSES = ['shipped', 'delivered'];

// Who counts as staff in the app (Appwrite itself decides by the account labels
// admin / support / manager, set in the table permissions).
export const STAFF_ROLES = ['admin', 'support', 'manager'];

// ---------------------------------------------------------------------
// WHAT STAFF MAY EDIT, BY STATUS  (the only place to change these rules)
//   pending / confirmed / processing -> customer details, payment method, delivery time
//   shipped                          -> only the delivery address (and city)
//   delivered / cancelled / returned -> nothing (read only)
// Always open to staff: order status, payment status, courier link, tracking
// number, timeline updates and admin notes. Items and amounts are never edited here.
// To lock earlier (for example right after "confirmed"), shorten FULL_EDIT_STATUSES.
// ---------------------------------------------------------------------
export const FULL_EDIT_STATUSES = ['pending', 'confirmed', 'processing'];
export const ADDRESS_EDIT_STATUSES = ['shipped'];
const FULL_EDIT_KEYS = [
    'customerName', 'customerPhone', 'customerEmail', 'city', 'address', 'notes',
    'paymentMethod', 'deliveryTime', 'estimatedDelivery',
];
const ADDRESS_EDIT_KEYS = ['city', 'address'];
const STAFF_ALWAYS_KEYS = ['adminNotes', 'trackingId'];

export const editableKeysFor = (status) => [
    ...(FULL_EDIT_STATUSES.includes(status) ? FULL_EDIT_KEYS : ADDRESS_EDIT_STATUSES.includes(status) ? ADDRESS_EDIT_KEYS : []),
    ...STAFF_ALWAYS_KEYS,
];

// A cancelled or returned order no longer counts towards the customer's totals.
const NOT_COUNTED_STATUSES = ['cancelled', 'returned'];

// One timeline step is written for every status change.
const STATUS_UPDATES = {
    pending: ['Order placed', 'The order is waiting to be confirmed.'],
    confirmed: ['Order confirmed', 'We have confirmed your order.'],
    processing: ['Order is being prepared', 'Your items are being packed.'],
    shipped: ['Order shipped', 'Your parcel has been handed to the courier.'],
    delivered: ['Order delivered', 'The parcel was delivered. Thank you for shopping with us.'],
    cancelled: ['Order cancelled', 'This order was cancelled.'],
    returned: ['Order returned', 'The parcel was returned to us.'],
};

const DETAIL_LIMITS = {
    customerName: 128,
    customerPhone: 20,
    customerEmail: 320,
    city: 100,
    address: 500,
    notes: 1000,
};
const DETAIL_REQUIRED = ['customerName', 'customerPhone', 'city', 'address'];
const DETAIL_LABELS = {
    customerName: 'name',
    customerPhone: 'phone number',
    customerEmail: 'email',
    city: 'city',
    address: 'address',
    notes: 'notes',
};

// Columns (full list in appwrite.config.json):
//   userId, username, orderNumber(unique), items(Text JSON), subtotal,
//   deliveryCharges, discount, total, advanceAmount, codAmount,
//   status, paymentMethod, paymentStatus, deliveryType, deliveryTime,
//   estimatedDelivery, customerName, customerEmail, customerPhone,
//   city, address, notes, trackingId, adminNotes
export class OrderService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliOrders;

    // Plain-language reason for the last failure. The slice shows it to the user.
    lastError = null;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    _fail(message) {
        this.lastError = message;
        return false;
    }

    // =====================================================================
    // SMALL SYNC HELPERS
    // =====================================================================

    isUserEditable(order) {
        return !!order && USER_EDITABLE_STATUSES.includes(order.status);
    }

    // The items column as a real array.
    parseItems(order) {
        try {
            const items = JSON.parse(order?.items || '[]');
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    // Identifies one line of an order. Two lines of the same product are kept
    // apart when the variant or the price differs.
    itemKey(item) {
        return `${item.productId}|${item.variant || ''}|${Number(item.price) || 0}`;
    }

    // Adds `incoming` lines to `existing` lines. Same product + variant + price
    // are combined; anything else becomes a new line.
    mergeItems(existing, incoming) {
        const out = existing.map((i) => ({ ...i }));
        incoming.forEach((n) => {
            const found = out.find((i) => this.itemKey(i) === this.itemKey(n));
            if (found) found.quantity = (Number(found.quantity) || 0) + n.quantity;
            else out.push({ ...n });
        });
        return out;
    }

    generateOrderNumber() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let out = '';
        for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return `RBA-${out}`;
    }

    _cleanItems(items) {
        return (items || [])
            .map((i) => ({
                productId: i.productId,
                name: i.name,
                price: Number(i.price) || 0,
                quantity: Math.floor(Number(i.quantity)) || 1,
                fileId: i.fileId || null,
                variant: i.variant || null,
            }))
            .filter((i) => i.productId && i.quantity > 0);
    }

    _totals(items, { deliveryCharges = 0, discount = 0, advanceAmount = 0 } = {}) {
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        const delivery = Number(deliveryCharges) || 0;
        const off = Number(discount) || 0;
        const total = Math.max(0, subtotal + delivery - off);
        const advance = Math.min(total, Number(advanceAmount) || 0);
        return {
            subtotal,
            deliveryCharges: delivery,
            discount: off,
            total,
            advanceAmount: advance,
            codAmount: Math.max(0, total - advance),
            paymentStatus: advance >= total && total > 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid',
        };
    }

    // Trims and checks customer details. Returns { data } or { error }.
    // `partial` = only the keys that are present are checked (edits).
    _checkDetails(input, { partial = false } = {}) {
        const data = {};
        for (const key of Object.keys(DETAIL_LIMITS)) {
            if (partial && !(key in input)) continue;
            const value = String(input[key] ?? '').trim();
            if (DETAIL_REQUIRED.includes(key) && !value) {
                return { error: `Please enter your ${DETAIL_LABELS[key]}.` };
            }
            if (value.length > DETAIL_LIMITS[key]) {
                return { error: `The ${DETAIL_LABELS[key]} is too long (max ${DETAIL_LIMITS[key]} characters).` };
            }
            data[key] = value || null;
        }
        return { data };
    }

    // =====================================================================
    // PLACE AN ORDER (customer side)
    // =====================================================================
    //
    // profile: the logged-in user's profile row
    // items:   [{ productId, name, price, quantity, fileId, variant }]
    // form:    { customerName, customerPhone, customerEmail, city, address,
    //            paymentMethod, deliveryType, deliveryTime, estimatedDelivery,
    //            deliveryCharges, discount, advanceAmount, notes }
    // Returns the order row, or false (the reason is in this.lastError).
    async placeOrder({ profile, items, form = {} }) {
        this.lastError = null;
        try {
            if (!profile?.$id) return this._fail('Please sign in to place an order.');
            const cleanItems = this._cleanItems(items);
            if (!cleanItems.length) return this._fail('Your cart is empty.');

            const { data: details, error } = this._checkDetails({
                customerName: form.customerName || profile.name,
                customerPhone: form.customerPhone || profile.phone,
                customerEmail: form.customerEmail || profile.email,
                city: form.city,
                address: form.address,
                notes: form.notes,
            });
            if (error) return this._fail(error);

            const totals = this._totals(cleanItems, form);

            const data = {
                userId: profile.$id,
                username: profile.username || null,
                items: JSON.stringify(cleanItems),
                ...totals,
                status: 'pending',
                paymentMethod: form.paymentMethod || 'cod',
                deliveryType: form.deliveryType || 'regular',
                deliveryTime: form.deliveryTime || null,
                estimatedDelivery: form.estimatedDelivery || null,
                ...details,
                trackingId: null,
                adminNotes: null,
            };

            const order = await this._createWithUniqueNumber(profile.$id, data);
            if (!order) return this._fail('Could not place your order. Please try again.');

            await this._afterOrder({ profile, order, items: cleanItems });
            return order;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not place your order. Please try again.');
        }
    }

    // orderNumber has a unique index, so a 409 means "number taken, try again".
    // The customer may READ and UPDATE their own row (the update is how they
    // change an order before it ships). Staff access comes from the table
    // permissions (label:admin / label:support / label:manager).
    async _createWithUniqueNumber(userId, data) {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                return await this.table.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: ID.unique(),
                    data: { ...data, orderNumber: this.generateOrderNumber() },
                    permissions: [
                        Permission.read(Role.user(userId)),
                        Permission.update(Role.user(userId)),
                    ],
                });
            } catch (error) {
                if (error.code !== 409) throw error;
            }
        }
        return false;
    }

    // Problems here are logged but never undo the order itself.
    async _afterOrder({ profile, order, items }) {
        const productIds = [...new Set(items.map((i) => i.productId))];
        await Promise.allSettled([
            userService.applyOrderToProfile({ profile, order }),
            trackerService.createForOrder({ order, by: 'customer' }), // timeline starts with "Order placed"
            cartService.markPurchased({ userId: profile.$id, productIds }),
            wishlistService.markPurchased({ userId: profile.$id, productIds }),
        ]);
    }

    // =====================================================================
    // CUSTOMER: CHANGE AN ORDER (only until it ships)
    // =====================================================================

    // The customer's orders that can still be changed, newest first.
    // Used at checkout to ask "add to your earlier order?".
    async getOpenOrders({ userId }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('userId', userId),
                    Query.equal('status', USER_EDITABLE_STATUSES),
                    Query.orderDesc('$createdAt'),
                    Query.limit(25),
                ],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Loads the order fresh and checks it is the customer's and still editable.
    async _getEditable(userId, orderId) {
        const order = await this.getOrder(orderId);
        if (!order) return this._fail('We could not find that order.');
        if (order.userId !== userId) return this._fail('That order belongs to another account.');
        if (!this.isUserEditable(order)) {
            const word = order.status === 'shipped' ? 'already shipped' : `already ${order.status}`;
            return this._fail(`This order is ${word}, so it can no longer be changed.`);
        }
        return order;
    }

    // Customer-side write. A 401 means the row has no update permission for the
    // customer, which is the case for orders created before editing existed.
    async _userUpdate(orderId, patch) {
        try {
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: orderId,
                data: patch,
            });
        } catch (error) {
            console.error(error.message);
            if (error.code === 401) {
                return this._fail('This order was placed before changes were possible. Please contact us to change it.');
            }
            return this._fail('Could not update the order. Please try again.');
        }
    }

    // Rewrites the items and everything that depends on them.
    async _saveItems(order, items, deliveryCharges) {
        const delivery = deliveryCharges != null ? Number(deliveryCharges) || 0 : Number(order.deliveryCharges) || 0;
        const t = this._totals(items, {
            deliveryCharges: delivery,
            discount: order.discount,
            advanceAmount: order.advanceAmount,
        });
        const patch = {
            items: JSON.stringify(items),
            subtotal: t.subtotal,
            deliveryCharges: t.deliveryCharges,
            total: t.total,
            advanceAmount: t.advanceAmount,
            codAmount: t.codAmount,
        };
        if (['unpaid', 'partial'].includes(order.paymentStatus)) patch.paymentStatus = t.paymentStatus;
        return this._userUpdate(order.$id, patch);
    }

    // Adds cart items to an earlier order that has not shipped yet.
    // items: same shape as placeOrder. deliveryCharges: recalculated for the new subtotal.
    // The added products leave the cart, like a normal order.
    async addItemsToOrder({ profile, orderId, items, deliveryCharges }) {
        this.lastError = null;
        try {
            if (!profile?.$id) return this._fail('Please sign in first.');
            const order = await this._getEditable(profile.$id, orderId);
            if (!order) return false;

            const incoming = this._cleanItems(items);
            if (!incoming.length) return this._fail('Your cart is empty.');

            const merged = this.mergeItems(this.parseItems(order), incoming);
            const saved = await this._saveItems(order, merged, deliveryCharges);
            if (!saved) return false;

            const productIds = [...new Set(incoming.map((i) => i.productId))];
            await Promise.allSettled([
                cartService.markPurchased({ userId: profile.$id, productIds }),
                wishlistService.markPurchased({ userId: profile.$id, productIds }),
            ]);
            return saved;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not update the order. Please try again.');
        }
    }

    // Lowers a line's quantity, or removes it (quantity 0). A customer can only
    // lower quantities here. To order more, they add items from the cart.
    async setItemQuantity({ userId, orderId, itemKey, quantity, deliveryCharges }) {
        this.lastError = null;
        try {
            const order = await this._getEditable(userId, orderId);
            if (!order) return false;

            const items = this.parseItems(order);
            const line = items.find((i) => this.itemKey(i) === itemKey);
            if (!line) return this._fail('That item is no longer in the order.');

            const next = Math.floor(Number(quantity));
            if (!Number.isFinite(next) || next < 0) return this._fail('Enter a valid quantity.');
            if (next > (Number(line.quantity) || 0)) {
                return this._fail('To order more of this item, add it to your cart and choose "Add to order" at checkout.');
            }

            const updatedItems = items
                .map((i) => (this.itemKey(i) === itemKey ? { ...i, quantity: next } : i))
                .filter((i) => i.quantity > 0);
            if (!updatedItems.length) {
                return this._fail('An order needs at least one item. Cancel the order instead.');
            }
            return await this._saveItems(order, updatedItems, deliveryCharges);
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not update the order. Please try again.');
        }
    }

    // Name, phone, email, city, address and notes only.
    async updateOrderDetails({ userId, orderId, data = {} }) {
        this.lastError = null;
        try {
            const order = await this._getEditable(userId, orderId);
            if (!order) return false;

            const allowed = {};
            Object.keys(DETAIL_LIMITS).forEach((k) => {
                if (k in data) allowed[k] = data[k];
            });
            const { data: clean, error } = this._checkDetails(allowed, { partial: true });
            if (error) return this._fail(error);
            if (!Object.keys(clean).length) return order;

            return await this._userUpdate(orderId, clean);
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not update the order. Please try again.');
        }
    }

    // Customer cancels their own order. Nothing needs undoing on the stock,
    // because stock is only taken when an order ships.
    async cancelMyOrder({ userId, orderId }) {
        this.lastError = null;
        try {
            const order = await this._getEditable(userId, orderId);
            if (!order) return false;
            const saved = await this._userUpdate(orderId, { status: 'cancelled' });
            if (saved) await this._syncProfileCounts(order, order.status, 'cancelled');
            return saved;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not cancel the order. Please try again.');
        }
    }

    // =====================================================================
    // READ
    // =====================================================================

    async getOrder(rowId) {
        try {
            return await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getOrderByNumber(orderNumber) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('orderNumber', orderNumber), Query.limit(1)],
            });
            return res?.rows?.length ? res.rows[0] : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // A customer only ever sees their own orders (row permissions).
    async getUserOrders({ userId, limit = 25, offset = 0 }) {
        return this.getOrdersPage({ userId, limit, offset });
    }

    // filters: { status, paymentStatus, paymentMethod, deliveryType, userId, city }
    async getOrdersPage({ limit = 25, offset = 0, ...filters } = {}) {
        try {
            const queries = [];
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queries.push(Query.equal(key, value));
                }
            });
            queries.push(Query.orderDesc('$createdAt'), Query.limit(limit), Query.offset(offset));

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });
            return { rows: res?.rows || [], total: res?.total || 0 };
        } catch (error) {
            console.error(error.message);
            return { rows: [], total: 0 };
        }
    }

    async countOrders(filters = {}) {
        const { total } = await this.getOrdersPage({ ...filters, limit: 1 });
        return total;
    }

    // { pending: 3, confirmed: 1, ... } for the staff status tabs.
    async getStatusCounts() {
        try {
            const entries = await Promise.all(
                ORDER_STATUS.map(async (status) => [status, await this.countOrders({ status })])
            );
            return Object.fromEntries(entries);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Staff search over order number, name, phone, email, username, tracking id.
    async searchOrders({ term, status } = {}) {
        try {
            const trimmed = (term || '').trim().toLowerCase();
            const rows = await this._getAllRows(status ? [Query.equal('status', status)] : []);
            if (!trimmed) return rows;
            return rows.filter((r) =>
                [r.orderNumber, r.customerName, r.customerPhone, r.customerEmail, r.username, r.trackingId].some((v) =>
                    String(v || '').toLowerCase().includes(trimmed)
                )
            );
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // =====================================================================
    // STAFF: UPDATE  (admin, support and manager need the matching label on
    // the orders table. See the permissions in the chat.)
    // =====================================================================

    async updateOrder(rowId, data) {
        try {
            const order = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data,
            });
            return order ? order : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Changes the status and keeps product stock right:
    //   not shipped/delivered -> shipped/delivered   sold += quantity, remaining -= quantity
    //   shipped/delivered -> anything else           the stock is given back
    // A COD order marked "delivered" is also marked "paid".
    // The staff member's account needs update permission on the products table
    // for the stock part. If the stock cannot be updated the status still
    // changes, and this.lastError says which products need fixing by hand.
    async updateStatus(rowId, status, { adjustStock = true } = {}) {
        this.lastError = null;
        try {
            if (!ORDER_STATUS.includes(status)) return this._fail('Unknown order status.');
            const order = await this.getOrder(rowId);
            if (!order) return this._fail('Order not found.');
            if (order.status === status) return order;

            const patch = { status };
            if (status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
                patch.paymentStatus = 'paid';
            }

            const updated = await this.updateOrder(rowId, patch);
            if (!updated) return this._fail('Could not change the status.');

            // Tracker: every status change becomes one timeline step. Customer: ordersCount / totalSpent.
            const [title, note] = STATUS_UPDATES[status] || [`Status: ${status}`, ''];
            await Promise.allSettled([
                trackerService.addUpdate(rowId, { title, note, status, by: 'staff' }, { order }),
                this._syncProfileCounts(order, order.status, status),
            ]);

            const was = STOCK_TAKEN_STATUSES.includes(order.status);
            const now = STOCK_TAKEN_STATUSES.includes(status);
            if (adjustStock && was !== now) {
                const sign = now ? 1 : -1;
                const failed = [];
                for (const item of this.parseItems(order)) {
                    const ok = await productService.adjustStock(item.productId, sign * (Number(item.quantity) || 0));
                    if (!ok) failed.push(item.name || item.productId);
                }
                if (failed.length) {
                    this.lastError = `Status changed, but the stock of ${failed.join(', ')} could not be updated. Update it by hand.`;
                }
            }
            return updated;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not change the status.');
        }
    }

    // Gives back / takes again the order in the customer's ordersCount and totalSpent
    // when it moves into or out of cancelled / returned. Best effort: needs update
    // permission on the users table (admin label). Never blocks the status change.
    async _syncProfileCounts(order, from, to) {
        try {
            const wasCounted = !NOT_COUNTED_STATUSES.includes(from);
            const nowCounted = !NOT_COUNTED_STATUSES.includes(to);
            if (wasCounted === nowCounted || !order?.userId) return;
            const sign = nowCounted ? 1 : -1;
            const profile = await userService.getProfile({ userId: order.userId });
            if (!profile) return;
            await userService.updateProfile({
                userId: order.userId,
                data: {
                    ordersCount: Math.max(0, (Number(profile.ordersCount) || 0) + sign),
                    totalSpent: Math.max(0, (Number(profile.totalSpent) || 0) + sign * (Number(order.total) || 0)),
                },
            });
        } catch (error) {
            console.error(error.message);
        }
    }

    // Staff edit from the admin order form. Only the keys allowed for the order's
    // current status go through (see editableKeysFor above).
    async updateStaffFields(rowId, patch = {}) {
        this.lastError = null;
        try {
            const order = await this.getOrder(rowId);
            if (!order) return this._fail('Order not found.');

            const allowed = editableKeysFor(order.status);
            const blocked = Object.keys(patch).filter((k) => !allowed.includes(k));
            if (blocked.length) {
                const names = blocked.map((k) => DETAIL_LABELS[k] || k).join(', ');
                return this._fail(`This order is ${order.status}, so ${names} can no longer be changed.`);
            }

            const data = {};
            const detailInput = {};
            Object.entries(patch).forEach(([k, v]) => {
                if (k in DETAIL_LIMITS) detailInput[k] = v;
            });
            if (Object.keys(detailInput).length) {
                const { data: clean, error } = this._checkDetails(detailInput, { partial: true });
                if (error) return this._fail(error.replace('enter your', "enter the customer's"));
                Object.assign(data, clean);
            }
            if ('paymentMethod' in patch) {
                if (!PAYMENT_METHODS.includes(patch.paymentMethod)) return this._fail('Unknown payment method.');
                data.paymentMethod = patch.paymentMethod;
            }
            if ('deliveryTime' in patch) {
                const v = String(patch.deliveryTime ?? '').trim();
                if (v.length > 100) return this._fail('Delivery time is too long (max 100 characters).');
                data.deliveryTime = v || null;
            }
            if ('estimatedDelivery' in patch) {
                const v = patch.estimatedDelivery;
                if (v && Number.isNaN(new Date(v).getTime())) return this._fail('That estimated delivery date is not valid.');
                data.estimatedDelivery = v ? new Date(v).toISOString() : null;
            }
            if ('adminNotes' in patch) {
                const v = String(patch.adminNotes ?? '').trim();
                if (v.length > 1000) return this._fail('Admin notes are too long (max 1000 characters).');
                data.adminNotes = v || null;
            }
            if ('trackingId' in patch) {
                const v = String(patch.trackingId ?? '').trim();
                if (v.length > 100) return this._fail('The tracking number is too long (max 100 characters).');
                data.trackingId = v || null;
            }
            if (!Object.keys(data).length) return order;

            const updated = await this.updateOrder(rowId, data);
            if (!updated) return this._fail('Could not save the changes.');

            const addressChanged =
                (data.address !== undefined && data.address !== (order.address || null)) ||
                (data.city !== undefined && data.city !== (order.city || null));
            if (addressChanged) {
                await trackerService.addUpdate(
                    rowId,
                    { title: 'Delivery address updated', note: '', status: null, by: 'staff' },
                    { order }
                );
            }
            return updated;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not save the changes.');
        }
    }

    async updatePaymentStatus(rowId, paymentStatus) {
        if (!PAYMENT_STATUS.includes(paymentStatus)) return false;
        return this.updateOrder(rowId, { paymentStatus });
    }

    async setTracking(rowId, trackingId) {
        return this.updateOrder(rowId, { trackingId });
    }

    async setAdminNotes(rowId, adminNotes) {
        return this.updateOrder(rowId, { adminNotes });
    }

    async cancelOrder(rowId) {
        return this.updateStatus(rowId, 'cancelled');
    }

    async deleteOrder(rowId) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            await trackerService.deleteForOrder(rowId);
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Internal ----------

    async _getAllRows(extraQueries = []) {
        const rows = [];
        const pageSize = 100;
        let cursor = null;

        while (true) {
            const queries = [...extraQueries, Query.limit(pageSize)];
            if (cursor) queries.push(Query.cursorAfter(cursor));

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });

            if (!res?.rows?.length) break;
            rows.push(...res.rows);
            if (res.rows.length < pageSize) break;
            cursor = res.rows[res.rows.length - 1].$id;
        }
        return rows;
    }
}

const orderService = new OrderService();

export default orderService;