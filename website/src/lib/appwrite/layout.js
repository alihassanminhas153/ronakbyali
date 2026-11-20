import envVars from '../../../env/var';
import { Client, TablesDB, Query } from 'appwrite';

// Homepage section types and the defaults created on an empty table.
export const SECTION_TYPES = ['hero', 'banner', 'featured', 'categories', 'products', 'text', 'custom'];

export const DEFAULT_SECTIONS = [
    { key: 'hero', type: 'hero', title: 'Welcome to Ronak By Ali', subtitle: 'New collection is here', buttonText: 'Shop now', link: '/products' },
    { key: 'featured', type: 'featured', title: 'Featured', itemsLimit: 8 },
    { key: 'categories', type: 'categories', title: 'Shop by category' },
    { key: 'products', type: 'products', title: 'New arrivals', itemsLimit: 12 },
    { key: 'banner1', type: 'banner', title: 'Sale', subtitle: 'Up to 30% off', buttonText: 'View offers', link: '/products' },
];

// Controls the SIDEBAR / NAVIGATION layout (admin + user areas): which items
// exist, their order, whether they show in the sidebar, and which labels
// may see them. Plain Appwrite database calls only.
// rowId = `${area}_${key}`  (one row per nav item)
//
// Columns:
//   area, key, label, slug, order, inSidebar, labels (array)
export class LayoutService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliNavLayout;

    // Message of the last failed call (also returned as `message`).
    lastError = null;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    // =====================================================================
    // READ
    // =====================================================================

    // All nav rows (pass `area` to get only one area, e.g. "admin" or "user").
    // Returns { ok: true, rows } or { ok: false, message }.
    async listRows({ area } = {}) {
        this.lastError = null;
        try {
            const queries = [Query.limit(200)];
            if (area) queries.unshift(Query.equal('area', area));
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });
            return { ok: true, rows: res?.rows || [] };
        } catch (error) {
            return this._fail(error);
        }
    }

    // =====================================================================
    // SAVE
    // =====================================================================

    // Saves rows in one go: updates each row, creates it the first time.
    // Returns { ok: true } or { ok: false, message }.
    async saveRows(rows) {
        this.lastError = null;
        try {
            await Promise.all(rows.map((row) => this._saveRow(row)));
            return { ok: true };
        } catch (error) {
            return this._fail(error);
        }
    }

    // ---------- Internal ----------

    async _saveRow(row) {
        const args = {
            databaseId: this.databaseId,
            tableId: this.tableId,
            rowId: this._rowId(row),
            data: this._toData(row),
        };
        try {
            return await this.table.updateRow(args);
        } catch (error) {
            if (error.code !== 404) throw error;
            return await this.table.createRow(args);
        }
    }

    // Row ids allow letters, numbers, . - _ (max 36, not starting with a symbol).
    _rowId({ area, key }) {
        return `${area}_${key}`
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/^[._-]+/, 's')
            .slice(0, 36);
    }

    // Only the columns that live in the table are sent.
    _toData(row) {
        return {
            area: row.area,
            key: row.key,
            label: row.label,
            slug: row.slug || '',
            order: row.order,
            inSidebar: row.inSidebar,
            labels: row.labels || [],
        };
    }

    _fail(error) {
        this.lastError = error?.message || 'Something went wrong.';
        console.error(this.lastError);
        return { ok: false, message: this.lastError };
    }
}

const layoutService = new LayoutService();

export default layoutService;