import envVars from '../../envVars/vars';
import { Client, TablesDB, Query, ID, Permission, Role } from 'appwrite';
import userService from './user';
import cartService from './cart';
import wishlistService from './wishlist';
import productService from './product';

export const ORDER_STATUS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
export const PAYMENT_METHODS = ['cod', 'bank_transfer', 'card', 'easypaisa', 'jazzcash'];
export const PAYMENT_STATUS = ['unpaid', 'partial', 'paid', 'refunded'];
export const DELIVERY_TYPES = ['fast', 'regular', 'pickup'];

// Stock is only "taken" while an order is in one of the other statuses.
const STOCK_NOT_TAKEN = ['pending', 'cancelled', 'returned'];

// Columns (full list in detail.txt):
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

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    // =====================================================================
    // PLACE AN ORDER (customer side)
    // =====================================================================
    //
    // profile: the logged-in user's profile row
    // items:   [{ productId, name, price, quantity, fileId, variant }]
    //          (copied into the order so it stays correct if the product changes)
    // form:    { customerName, customerPhone, customerEmail, city, address,
    //            paymentMethod, deliveryType, deliveryTime, estimatedDelivery,
    //            deliveryCharges, discount, advanceAmount, notes }
    //
    // After the order row is saved this also:
    //   - saves phone, lastCity, lastAddress on the user, adds to ordersCount
    //     and totalSpent, and moves the role new -> customer -> loyal
    //   - removes the bought products from the cart and adds them to
    //     purchasedProductIds on both the cart and the wishlist
    // Returns the order row, or false.
    async placeOrder({ profile, items, form = {} }) {
        try {
            if (!profile?.$id || !items?.length) return false;

            const cleanItems = items.map((i) => ({
                productId: i.productId,
                name: i.name,
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1,
                fileId: i.fileId || null,
                variant: i.variant || null,
            }));

            const subtotal = cleanItems.reduce((s, i) => s + i.price * i.quantity, 0);
            const deliveryCharges = Number(form.deliveryCharges) || 0;
            const discount = Number(form.discount) || 0;
            const total = Math.max(0, subtotal + deliveryCharges - discount);
            const advanceAmount = Math.min(total, Number(form.advanceAmount) || 0);

            const data = {
                userId: profile.$id,
                username: profile.username || null,
                items: JSON.stringify(cleanItems),
                subtotal,
                deliveryCharges,
                discount,
                total,
                advanceAmount,
                codAmount: Math.max(0, total - advanceAmount),
                status: 'pending',
                paymentMethod: form.paymentMethod || 'cod',
                paymentStatus: advanceAmount >= total && total > 0 ? 'paid' : advanceAmount > 0 ? 'partial' : 'unpaid',
                deliveryType: form.deliveryType || 'regular',
                deliveryTime: form.deliveryTime || null,
                estimatedDelivery: form.estimatedDelivery || null,
                customerName: form.customerName || profile.name || '',
                customerEmail: form.customerEmail || profile.email || null,
                customerPhone: form.customerPhone || profile.phone || '',
                city: form.city || '',
                address: form.address || '',
                notes: form.notes || null,
                trackingId: null,
                adminNotes: null,
            };

            const order = await this._createWithUniqueNumber(profile.$id, data);
            if (!order) return false;

            await this._afterOrder({ profile, order, items: cleanItems });
            return order;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // orderNumber has a unique index, so a 409 means "number taken, try again".
    async _createWithUniqueNumber(userId, data) {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                return await this.table.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: ID.unique(),
                    data: { ...data, orderNumber: this.generateOrderNumber() },
                    permissions: [Permission.read(Role.user(userId))],
                });
            } catch (error) {
                if (error.code !== 409) throw error;
            }
        }
        return false;
    }

    // "RBA-7K2QX9"
    generateOrderNumber() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let out = '';
        for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return `RBA-${out}`;
    }

    // Problems here are logged but never undo the order itself.
    async _afterOrder({ profile, order, items }) {
        const productIds = [...new Set(items.map((i) => i.productId))];
        await Promise.allSettled([
            userService.applyOrderToProfile({ profile, order }),
            cartService.markPurchased({ userId: profile.$id, productIds }),
            wishlistService.markPurchased({ userId: profile.$id, productIds }),
        ]);
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

    // Admin search over order number, name, phone, email, username, tracking id.
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

    // The items column as a real array.
    parseItems(order) {
        try {
            const items = JSON.parse(order?.items || '[]');
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    // =====================================================================
    // ADMIN: UPDATE  (needs the admin label on the table)
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
    //   pending -> confirmed (or later)   sold += quantity, remaining -= quantity
    //   confirmed (or later) -> cancelled/returned   the stock is given back
    // A COD order marked "delivered" is also marked "paid".
    async updateStatus(rowId, status, { adjustStock = true } = {}) {
        try {
            if (!ORDER_STATUS.includes(status)) return false;
            const order = await this.getOrder(rowId);
            if (!order) return false;

            const patch = { status };
            if (status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
                patch.paymentStatus = 'paid';
            }

            const updated = await this.updateOrder(rowId, patch);
            if (!updated) return false;

            const was = !STOCK_NOT_TAKEN.includes(order.status);
            const now = !STOCK_NOT_TAKEN.includes(status);
            if (adjustStock && was !== now) {
                const sign = now ? 1 : -1;
                for (const item of this.parseItems(order)) {
                    await productService.adjustStock(item.productId, sign * (Number(item.quantity) || 0));
                }
            }
            return updated;
        } catch (error) {
            console.error(error.message);
            return false;
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