import envVars from '../../../env/var';
import { Client, TablesDB, Query } from 'appwrite';

// Sidebar + page-access rules for the admin and user dashboards (table: ronakbyali_nav_layout).
// One row per page: rowId = `${area}_${key}`. The list of pages lives in lib/layout/layoutRegistry.js.
//
// Columns:
//   area, key, label, slug, order, inSidebar,
//   blockedLabels (array)  labels that can NEVER open the page (they get the "Access denied" page)
//   labels (array)         old "visible to" column, no longer read or written. Keep it or delete it.
//
// Plain Appwrite database calls only. Same style as the other services in this folder.
export class NavLayoutService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliNavLayout; // must be: ronakbyali_nav_layout

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

    // All rows (pass `area` for one panel only: "admin" or "user").
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
            blockedLabels: row.blockedLabels || [],
        };
    }

    _fail(error) {
        this.lastError = error?.message || 'Something went wrong.';
        console.error(this.lastError);
        return { ok: false, message: this.lastError, code: error?.code };
    }
}

const navLayoutService = new NavLayoutService();

export default navLayoutService;
