import envVars from '../../envVars/vars';
import { Client, Storage, TablesDB, Query, ID } from 'appwrite';

// Store-wide options as key / value rows. Plain Appwrite database calls only.
// rowId = the key itself (e.g. "storeName"), so reading one is a direct lookup.
//
// Columns: key (unique), value (Text), label
//
// Values can be text, numbers, booleans, objects or arrays. Objects and
// arrays are saved as JSON text and turned back into objects when read.
// Phone numbers stay text, so "03001234567" never loses its leading zero.

// Starting values, used by seedDefaults(). Edit freely.
export const DEFAULT_SETTINGS = [
    { key: 'storeName', value: 'Ronak By Ali', label: 'Store name' },
    { key: 'tagline', value: '', label: 'Tagline' },
    { key: 'contactPhone', value: '', label: 'Contact phone' },
    { key: 'whatsappNumber', value: '', label: 'WhatsApp number (with country code)' },
    { key: 'contactEmail', value: '', label: 'Contact email' },
    { key: 'storeAddress', value: '', label: 'Store address' },
    { key: 'currency', value: 'Rs', label: 'Currency symbol' },
    { key: 'shippingFee', value: 250, label: 'Default delivery charges' },
    { key: 'freeShippingAbove', value: 5000, label: 'Free delivery above (0 = never)' },
    { key: 'deliveryFrom', value: 'Lahore', label: 'Delivery dispatched from' },
    { key: 'deliveryTimeRegular', value: '4-6 working days', label: 'Regular delivery time' },
    { key: 'deliveryTimeFast', value: '1-2 working days', label: 'Fast delivery time' },
    { key: 'advancePercent', value: 0, label: 'Advance payment % (0 = off)' },
    { key: 'codEnabled', value: true, label: 'Cash on delivery enabled' },
    { key: 'maintenanceMode', value: false, label: 'Maintenance mode' },
    { key: 'socialLinks', value: { facebook: '', instagram: '', tiktok: '', youtube: '' }, label: 'Social links' },
    { key: 'logoFileId', value: '', label: 'Logo (file id)' },
];

export class SettingsService {
    client = new Client();
    table;
    bucket;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliSettings;
    bucketId = envVars.ronakByAliBucketId;

    _cache = null; // { key: value } of the last getAllSettings()

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
        this.bucket = new Storage(this.client);
    }

    // ---------- Read ----------

    // One setting's value (or `fallback` if it doesn't exist).
    async getSetting(key, fallback = null) {
        try {
            const row = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: this._rowId(key),
            });
            return this._decode(row.value);
        } catch (error) {
            if (error.code !== 404) console.error(error.message);
            return fallback;
        }
    }

    // Every setting as { storeName: '...', shippingFee: 250, socialLinks: {...} }.
    // Cached; pass { refresh: true } after saving to reload.
    async getAllSettings({ refresh = false } = {}) {
        try {
            if (this._cache && !refresh) return this._cache;
            const rows = await this._getAllRows();
            const out = {};
            rows.forEach((r) => {
                out[r.key] = this._decode(r.value);
            });
            this._cache = out;
            return out;
        } catch (error) {
            console.error(error.message);
            return this._cache || {};
        }
    }

    // The raw rows with labels, for the admin settings screen.
    async getSettingRows() {
        try {
            return await this._getAllRows();
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Write (admin) ----------

    // Creates the setting if missing, updates it if it exists.
    async setSetting(key, value, label) {
        try {
            const rowId = this._rowId(key);
            const encoded = this._encode(value);
            this._cache = null;

            try {
                const data = { value: encoded };
                if (label !== undefined) data.label = label;
                return await this.table.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId,
                    data,
                });
            } catch (error) {
                if (error.code !== 404) throw error;
            }

            return await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: { key, value: encoded, label: label || key },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // values: { storeName: 'X', shippingFee: 300 }  (saves all, 5 at a time)
    async setSettings(values) {
        try {
            const entries = Object.entries(values || {});
            for (let i = 0; i < entries.length; i += 5) {
                await Promise.all(entries.slice(i, i + 5).map(([k, v]) => this.setSetting(k, v)));
            }
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteSetting(key) {
        try {
            this._cache = null;
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: this._rowId(key),
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Creates every DEFAULT_SETTINGS row that doesn't exist yet. Safe to run
    // again: existing values are never overwritten.
    async seedDefaults() {
        try {
            const existing = new Set((await this._getAllRows()).map((r) => r.key));
            for (const s of DEFAULT_SETTINGS) {
                if (existing.has(s.key)) continue;
                await this.table.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: this._rowId(s.key),
                    data: { key: s.key, value: this._encode(s.value), label: s.label },
                });
            }
            this._cache = null;
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Small helpers ----------

    async getNumber(key, fallback = 0) {
        const n = Number(await this.getSetting(key, fallback));
        return Number.isFinite(n) ? n : fallback;
    }

    // Delivery charges for a subtotal, using shippingFee + freeShippingAbove.
    async getDeliveryCharges(subtotal) {
        const settings = await this.getAllSettings();
        const fee = Number(settings.shippingFee) || 0;
        const freeAbove = Number(settings.freeShippingAbove) || 0;
        return freeAbove > 0 && subtotal >= freeAbove ? 0 : fee;
    }

    // WhatsApp chat link, optionally with a prefilled message.
    async getWhatsappLink(message = '') {
        const number = String(await this.getSetting('whatsappNumber', '')).replace(/\D/g, '');
        if (!number) return null;
        return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    }

    // ---------- Logo ----------

    getLogoUrl(fileId) {
        try {
            if (!fileId) return null;
            return this.bucket.getFileView({ bucketId: this.bucketId, fileId });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // Upload a new logo, save its id in the settings, delete the old file.
    async changeLogo(file) {
        try {
            const oldId = await this.getSetting('logoFileId', '');
            const uploaded = await this.bucket.createFile({
                bucketId: this.bucketId,
                fileId: ID.unique(),
                file,
            });
            const saved = await this.setSetting('logoFileId', uploaded.$id, 'Logo (file id)');
            if (!saved) {
                await this.bucket.deleteFile({ bucketId: this.bucketId, fileId: uploaded.$id });
                return false;
            }
            if (oldId) {
                try {
                    await this.bucket.deleteFile({ bucketId: this.bucketId, fileId: oldId });
                } catch {
                    /* old file already gone */
                }
            }
            return uploaded;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Internal ----------

    // Row ids allow letters, numbers, . - _ (max 36, not starting with a symbol).
    _rowId(key) {
        return String(key).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^[._-]+/, 's').slice(0, 36);
    }

    _encode(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    _decode(text) {
        if (text === 'true') return true;
        if (text === 'false') return false;
        if (typeof text === 'string' && (text.startsWith('{') || text.startsWith('['))) {
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        }
        // Plain numbers (but not things like phone numbers with a leading 0).
        if (typeof text === 'string' && /^(0|[1-9]\d*)(\.\d+)?$/.test(text) && text.length < 10) {
            return Number(text);
        }
        return text;
    }

    async _getAllRows() {
        const rows = [];
        const pageSize = 100;
        let cursor = null;

        while (true) {
            const queries = [Query.limit(pageSize)];
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

const settingsService = new SettingsService();

export default settingsService;