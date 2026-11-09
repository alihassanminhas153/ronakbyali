import envVars from '../../../env/var';
import { Client, TablesDB, ID } from 'appwrite';

// Quick titles the admin can tap when adding a manual update.
export const UPDATE_PRESETS = [
    'Packed and ready',
    'Handed to the courier',
    'Arrived at the city hub',
    'Out for delivery',
    'Delivery attempted',
    'Delivered',
];

const MAX_UPDATES = 200;

// Accepts what the admin pastes from TCS / Leopards / etc. Only http(s) links are
// stored, so a pasted "javascript:..." can never end up behind a button.
// Returns { link } (null = cleared) or { error }.
export function normalizeLink(input) {
    const raw = String(input ?? '').trim();
    if (!raw) return { link: null };
    if (raw.length > 2000) return { error: 'That link is too long.' };
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || /^(javascript|data|vbscript):/i.test(raw);
    const withScheme = hasScheme ? raw : `https://${raw}`;
    let url;
    try {
        url = new URL(withScheme);
    } catch {
        return { error: 'That does not look like a valid link.' };
    }
    if (!['http:', 'https:'].includes(url.protocol)) return { error: 'Only http or https links are allowed.' };
    return { link: url.toString() };
}

// One stored update = one JSON string inside the `updates` array column.
// { id, at, title, note, status, by }. Plain strings typed in the console still work.
function parseUpdate(entry, i) {
    let obj = null;
    try {
        obj = JSON.parse(entry);
    } catch {
        /* plain text */
    }
    if (obj && typeof obj === 'object') {
        return {
            id: obj.id || `u${i}`,
            at: obj.at || null,
            title: String(obj.title || 'Update'),
            note: String(obj.note || ''),
            status: obj.status || null,
            by: obj.by || null,
        };
    }
    return { id: `u${i}`, at: null, title: String(entry), note: '', status: null, by: null };
}

// Row -> { $id, orderId, link, updates[] } with the NEWEST update first.
export function toTracker(row) {
    const list = (row?.updates || []).map(parseUpdate).reverse();
    return { $id: row.$id, orderId: row.orderId || row.$id, link: row.updateLink || null, updates: list };
}

// Table ronakByAli_tracker (env: ronakByAliTracker). The row id IS the order's id,
// so finding the tracker of an order is a single getRow. Columns:
//   orderId (text), updates (text[]), updateLink (text)
export class TrackerService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliOrderTracker; 

    lastError = null;

    constructor() {
        this.client.setEndpoint(envVars.ronakByAliUrl).setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    _fail(message) {
        this.lastError = message;
        return false;
    }

    _entry({ title, note = '', status = null, by = null, at = null }) {
        return JSON.stringify({
            id: ID.unique(),
            at: at || new Date().toISOString(),
            title: String(title).trim().slice(0, 150),
            note: String(note || '').trim().slice(0, 500),
            status,
            by,
        });
    }

    // row | null (not found) | false (error)
    async _getRow(orderId) {
        try {
            return await this.table.getRow({ databaseId: this.databaseId, tableId: this.tableId, rowId: orderId });
        } catch (error) {
            if (error.code === 404) return null;
            console.error(error.message);
            return false;
        }
    }

    // Called when an order is placed. Safe to call twice (409 = already there).
    async createForOrder({ order, by = 'customer' }) {
        try {
            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: order.$id,
                data: {
                    orderId: order.$id,
                    updates: [
                        this._entry({
                            title: 'Order placed',
                            note: order.orderNumber ? `Order ${order.orderNumber} was received.` : '',
                            status: 'pending',
                            by,
                            at: order.$createdAt,
                        }),
                    ],
                    updateLink: null,
                },
            });
            return toTracker(row);
        } catch (error) {
            if (error.code === 409) {
                const row = await this._getRow(order.$id);
                return row ? toTracker(row) : false;
            }
            console.error(error.message);
            return this._fail('Could not create the tracking record.');
        }
    }

    // Reads the tracker of an order and creates it when an older order has none yet.
    async ensure(order) {
        this.lastError = null;
        const row = await this._getRow(order.$id);
        if (row) return toTracker(row);
        if (row === false) return this._fail('Could not load the tracking updates.');
        return this.createForOrder({ order, by: 'system' });
    }

    async _rowOrCreate(orderId, order) {
        const row = await this._getRow(orderId);
        if (row) return row;
        if (row === false) return this._fail('Could not load the tracking updates.');
        const created = await this.createForOrder({ order: order || { $id: orderId }, by: 'system' });
        if (!created) return false;
        return (await this._getRow(orderId)) || this._fail('Could not load the tracking updates.');
    }

    // Adds ONE step to the timeline. entry: { title, note, status, by }
    async addUpdate(orderId, entry, { order } = {}) {
        this.lastError = null;
        try {
            if (!String(entry?.title || '').trim()) return this._fail('Write a short title for the update.');
            const base = await this._rowOrCreate(orderId, order);
            if (!base) return false;
            const list = [...(base.updates || []), this._entry(entry)].slice(-MAX_UPDATES);
            const row = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: orderId,
                data: { updates: list },
            });
            return toTracker(row);
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not save the update.');
        }
    }

    // Stores the courier link (TCS etc). null / '' clears it. Adding a link also adds a timeline step.
    async setLink(orderId, input, { order } = {}) {
        this.lastError = null;
        try {
            const { link, error } = normalizeLink(input);
            if (error) return this._fail(error);
            const base = await this._rowOrCreate(orderId, order);
            if (!base) return false;
            if ((base.updateLink || null) === link) return toTracker(base);

            const data = { updateLink: link };
            if (link) {
                data.updates = [
                    ...(base.updates || []),
                    this._entry({
                        title: 'Tracking link added',
                        note: 'You can follow the parcel on the courier website.',
                        by: 'staff',
                    }),
                ].slice(-MAX_UPDATES);
            }
            const row = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: orderId,
                data,
            });
            return toTracker(row);
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not save the tracking link.');
        }
    }

    async deleteForOrder(orderId) {
        try {
            await this.table.deleteRow({ databaseId: this.databaseId, tableId: this.tableId, rowId: orderId });
            return true;
        } catch (error) {
            if (error.code !== 404) console.error(error.message);
            return false;
        }
    }
}

const trackerService = new TrackerService();

export default trackerService;