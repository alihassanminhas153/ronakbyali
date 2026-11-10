import envVars from '../../../env/var';
import { Client, TablesDB, ID, Query } from 'appwrite';

// There is NO finance table. The ledger is built from two sources:
//
//  1. AUTOMATIC entries, calculated live from tables you already have
//     - products -> one "investment" per product:  costPrice x totalAvailable
//     - orders   -> one "expense" per RETURNED order: its deliveryCharges (lost shipping)
//     They are read-only (flag `auto: true`); change the product / order instead.
//
//  2. MANUAL entries (expenses, withdrawals, other income, extra investments) that the
//     admin types in. With no table to put them in, they are kept in this browser's
//     localStorage. They survive refreshes but are NOT shared between devices.
//     (If you later add a table, only _readManual / _writeManual below need to change.)
//
// Sales, cost of goods, carts and wishlists still come from the orders / products /
// cart / wishlist tables exactly as before, so nothing else on the page changes.
//
// Entry shape (same as the old table rows):
//   { $id, $createdAt, $updatedAt, type, title, category, amount, date (ISO), note, auto? }
export const LEDGER_TYPES = ['investment', 'expense', 'withdrawal', 'income'];

const STORE_KEY = 'ronakbyali_finance_manual';
const AUTO_MESSAGE = 'This entry is calculated from your products and orders. Change the product or order instead.';

export class FinanceService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    productsTableId = envVars.ronakByAliProducts || 'ronakbyali_products';
    ordersTableId = envVars.ronakByAliOrders || 'ronakbyali_orders';

    lastError = null;

    constructor() {
        this.client.setEndpoint(envVars.ronakByAliUrl).setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    _fail(message) {
        this.lastError = message;
        return false;
    }

    /* ---------- manual entries (browser storage) ---------- */

    _readManual() {
        try {
            const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    _writeManual(rows) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(rows));
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    /* ---------- automatic entries (other tables) ---------- */

    async _listAll(tableId) {
        const rows = [];
        let cursor = null;
        for (;;) {
            const queries = [Query.limit(100)];
            if (cursor) queries.push(Query.cursorAfter(cursor));
            const res = await this.table.listRows({ databaseId: this.databaseId, tableId, queries });
            if (!res?.rows?.length) break;
            rows.push(...res.rows);
            if (res.rows.length < 100) break;
            cursor = res.rows[res.rows.length - 1].$id;
        }
        return rows;
    }

    _autoEntries(products, orders) {
        const out = [];

        for (const p of products) {
            const cost = Number(p.costPrice) || 0;
            const units = Number(p.totalAvailable) || 0;
            const amount = cost * units;
            if (amount <= 0) continue;
            out.push({
                $id: `auto-stock-${p.$id}`,
                $createdAt: p.$createdAt,
                $updatedAt: p.$updatedAt,
                type: 'investment',
                title: `Stock: ${p.name}`,
                category: p.category || 'Stock',
                amount,
                date: p.$createdAt,
                note: `${units} units at Rs ${cost} each (from products)`,
                auto: true,
            });
        }

        for (const o of orders) {
            const shipping = Number(o.deliveryCharges) || 0;
            if (o.status !== 'returned' || shipping <= 0) continue;
            out.push({
                $id: `auto-return-${o.$id}`,
                $createdAt: o.$createdAt,
                $updatedAt: o.$updatedAt,
                type: 'expense',
                title: `Returned order ${o.orderNumber}`,
                category: 'Returns',
                amount: shipping,
                date: o.$updatedAt || o.$createdAt,
                note: 'Delivery charges lost on a returned order (from orders)',
                auto: true,
            });
        }

        return out;
    }

    // Every entry (automatic + manual), newest first. Returns an array, or false on error.
    // If products/orders can't be loaded the manual entries are still returned and
    // lastError explains what is missing.
    async getEntries() {
        this.lastError = null;
        try {
            const [products, orders] = await Promise.allSettled([
                this._listAll(this.productsTableId),
                this._listAll(this.ordersTableId),
            ]);
            if (products.status === 'rejected') console.error(products.reason?.message);
            if (orders.status === 'rejected') console.error(orders.reason?.message);
            if (products.status === 'rejected' || orders.status === 'rejected') {
                this.lastError = 'Some automatic entries could not be loaded.';
            }

            const auto = this._autoEntries(
                products.status === 'fulfilled' ? products.value : [],
                orders.status === 'fulfilled' ? orders.value : []
            );
            return [...auto, ...this._readManual()].sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not load the finance entries.');
        }
    }

    // data: { type, title, category, amount, date (ISO), note }
    async addEntry(data) {
        this.lastError = null;
        if (!LEDGER_TYPES.includes(data?.type)) return this._fail('Unknown entry type.');
        const now = new Date().toISOString();
        const row = { ...data, amount: Number(data.amount) || 0, $id: ID.unique(), $createdAt: now, $updatedAt: now };
        if (!this._writeManual([row, ...this._readManual()])) return this._fail('Could not save the entry in this browser.');
        return row;
    }

    async updateEntry(rowId, data) {
        this.lastError = null;
        if (String(rowId).startsWith('auto-')) return this._fail(AUTO_MESSAGE);
        const rows = this._readManual();
        const i = rows.findIndex((r) => r.$id === rowId);
        if (i === -1) return this._fail('That entry no longer exists.');
        const row = { ...rows[i], ...data, amount: Number(data.amount ?? rows[i].amount) || 0, $updatedAt: new Date().toISOString() };
        rows[i] = row;
        if (!this._writeManual(rows)) return this._fail('Could not update the entry in this browser.');
        return row;
    }

    async deleteEntry(rowId) {
        this.lastError = null;
        if (String(rowId).startsWith('auto-')) return this._fail(AUTO_MESSAGE);
        const rows = this._readManual();
        if (!this._writeManual(rows.filter((r) => r.$id !== rowId))) return this._fail('Could not delete the entry in this browser.');
        return true;
    }
}

const financeService = new FinanceService();

export default financeService;