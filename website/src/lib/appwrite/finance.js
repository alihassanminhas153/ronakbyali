import envVars from '../../../env/var';
import { Client, TablesDB, ID, Query } from 'appwrite';

export const LEDGER_TYPES = ['investment', 'expense', 'withdrawal', 'income'];

const STORE_KEY = 'ronakbyali_finance_manual';
const AUTO_MESSAGE = 'This entry is calculated from your products and orders. Change the product or order instead.';
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

export class FinanceService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    financeTableId = envVars.ronakByAliFinance || 'ronakbyali_finance';
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

    _entryData(data) {
        const type = String(data?.type || '');
        const title = String(data?.title || '').trim();
        const category = String(data?.category || '').trim();
        const note = String(data?.note || '').trim();
        const amount = Number(data?.amount);
        const date = data?.date ? new Date(data.date) : null;
        if (!LEDGER_TYPES.includes(type)) return { error: 'Unknown entry type.' };
        if (!title) return { error: 'Give this entry a short title.' };
        if (title.length > 150) return { error: 'The title is too long (max 150 characters).' };
        if (category.length > 100) return { error: 'The category is too long (max 100 characters).' };
        if (note.length > 1000) return { error: 'The note is too long (max 1000 characters).' };
        if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter an amount above 0.' };
        if (!date || Number.isNaN(date.getTime())) return { error: 'Choose a valid date.' };
        return {
            data: {
                type,
                title,
                category: category || null,
                amount,
                date: date.toISOString(),
                note: note || null,
            },
        };
    }

    _fromRow(row) {
        return {
            ...row,
            amount: Number(row.amount) || 0,
            date: row.date,
            auto: false,
        };
    }

    async _migrateLegacyEntries() {
        if (typeof localStorage === 'undefined') return true;
        let serialized;
        try {
            serialized = localStorage.getItem(STORE_KEY);
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not read the previous finance entries from this browser.');
        }
        if (!serialized) return true;

        let rows;
        try {
            rows = JSON.parse(serialized);
        } catch (error) {
            console.error(error.message);
            return this._fail('The previous finance entries in this browser are invalid.');
        }
        if (!Array.isArray(rows)) return this._fail('The previous finance entries in this browser are invalid.');

        for (const row of rows) {
            const { data, error } = this._entryData(row);
            if (error || !ID_PATTERN.test(String(row?.$id || ''))) {
                return this._fail('A previous finance entry could not be migrated. It has been kept in this browser.');
            }
            try {
                await this.table.createRow({
                    databaseId: this.databaseId,
                    tableId: this.financeTableId,
                    rowId: row.$id,
                    data,
                });
            } catch (createError) {
                if (createError.code !== 409) {
                    console.error(createError.message);
                    return this._fail('Could not migrate the previous finance entries. They have been kept in this browser.');
                }
            }
        }

        try {
            localStorage.removeItem(STORE_KEY);
            return true;
        } catch (error) {
            console.error(error.message);
            return this._fail('Finance entries were migrated, but the old browser copy could not be cleared.');
        }
    }

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
            if (!(await this._migrateLegacyEntries())) return false;
            const [products, orders, entries] = await Promise.allSettled([
                this._listAll(this.productsTableId),
                this._listAll(this.ordersTableId),
                this._listAll(this.financeTableId),
            ]);
            if (products.status === 'rejected') console.error(products.reason?.message);
            if (orders.status === 'rejected') console.error(orders.reason?.message);
            if (entries.status === 'rejected') {
                console.error(entries.reason?.message);
                return this._fail('Could not load the finance entries.');
            }
            if (products.status === 'rejected' || orders.status === 'rejected') {
                this.lastError = 'Some automatic entries could not be loaded.';
            }

            const auto = this._autoEntries(
                products.status === 'fulfilled' ? products.value : [],
                orders.status === 'fulfilled' ? orders.value : []
            );
            const manual = entries.value.map((row) => this._fromRow(row));
            return [...auto, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not load the finance entries.');
        }
    }

    // data: { type, title, category, amount, date (ISO), note }
    async addEntry(data) {
        this.lastError = null;
        const clean = this._entryData(data);
        if (clean.error) return this._fail(clean.error);
        try {
            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.financeTableId,
                rowId: ID.unique(),
                data: clean.data,
            });
            return this._fromRow(row);
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not save the finance entry.');
        }
    }

    async updateEntry(rowId, data) {
        this.lastError = null;
        if (String(rowId).startsWith('auto-')) return this._fail(AUTO_MESSAGE);
        const clean = this._entryData(data);
        if (clean.error) return this._fail(clean.error);
        try {
            const row = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.financeTableId,
                rowId,
                data: clean.data,
            });
            return this._fromRow(row);
        } catch (error) {
            console.error(error.message);
            return this._fail(error.code === 404 ? 'That entry no longer exists.' : 'Could not update the finance entry.');
        }
    }

    async deleteEntry(rowId) {
        this.lastError = null;
        if (String(rowId).startsWith('auto-')) return this._fail(AUTO_MESSAGE);
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.financeTableId,
                rowId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return this._fail(error.code === 404 ? 'That entry no longer exists.' : 'Could not delete the finance entry.');
        }
    }
}

const financeService = new FinanceService();

export default financeService;