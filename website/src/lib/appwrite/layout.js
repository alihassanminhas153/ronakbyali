import envVars from '../../../env/var';
import { Client, Storage, TablesDB, Query, ID } from 'appwrite';

// Controls the HOMEPAGE: which sections exist, in what order, with which
// images and texts. Plain Appwrite database + storage calls only.
// rowId = the section key (e.g. "hero", "featured-4f2a").
//
// Columns (full list in detail.txt):
//   key (unique), type, title, subtitle, content (Text JSON), imageIds (array),
//   link, buttonText, category, itemsLimit, order, isActive
//
// SECTION TYPES
//   hero        big banner / slider        -> imageIds = slides
//   banner      single promo banner        -> imageIds[0], link, buttonText
//   featured    products with featured = true
//   categories  category tiles
//   products    product row. `category` = which category to show (empty = all)
//   text        heading + paragraph block  -> title, subtitle, content.body
//   custom      anything else you render yourself from `content`
export const SECTION_TYPES = ['hero', 'banner', 'featured', 'categories', 'products', 'text', 'custom'];

// What seedDefaultLayout() creates on an empty table.
export const DEFAULT_SECTIONS = [
    { key: 'hero', type: 'hero', title: 'Welcome to Ronak By Ali', subtitle: 'New collection is here', buttonText: 'Shop now', link: '/products' },
    { key: 'featured', type: 'featured', title: 'Featured', itemsLimit: 8 },
    { key: 'categories', type: 'categories', title: 'Shop by category' },
    { key: 'products', type: 'products', title: 'New arrivals', itemsLimit: 12 },
    { key: 'banner1', type: 'banner', title: 'Sale', subtitle: 'Up to 30% off', buttonText: 'View offers', link: '/products' },
];

export class LayoutService {
    client = new Client();
    table;
    bucket;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliLayout;
    bucketId = envVars.ronakByAliBucketId;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
        this.bucket = new Storage(this.client);
    }

    // =====================================================================
    // READ
    // =====================================================================

    // All sections in page order. activeOnly = hide switched-off sections.
    async getLayout({ activeOnly = false } = {}) {
        try {
            const queries = [Query.orderAsc('order'), Query.limit(100)];
            if (activeOnly) queries.unshift(Query.equal('isActive', true));
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Ready to render: active sections in order, each with `imageUrls` and
    // `content` already parsed into an object.
    async getHomepageSections() {
        const rows = await this.getLayout({ activeOnly: true });
        if (!rows) return [];
        return rows.map((s) => ({
            ...s,
            content: this.parseContent(s),
            imageUrls: this.getImageUrls(s),
        }));
    }

    async getSection(key) {
        try {
            return await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: this._rowId(key),
            });
        } catch (error) {
            if (error.code !== 404) console.error(error.message);
            return false;
        }
    }

    // =====================================================================
    // CREATE / UPDATE / DELETE (admin)
    // =====================================================================

    // data: { type, title, subtitle, link, buttonText, category, itemsLimit,
    //         content (object), isActive, key? }
    // New sections go to the end of the page.
    async createSection(data) {
        try {
            if (!SECTION_TYPES.includes(data?.type)) return false;

            const all = (await this.getLayout()) || [];
            const key = data.key || `${data.type}-${Math.random().toString(36).slice(2, 6)}`;
            const { content, ...rest } = data;

            const section = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: this._rowId(key),
                data: {
                    isActive: true,
                    imageIds: [],
                    ...rest,
                    key,
                    content: JSON.stringify(content || {}),
                    order: all.length,
                },
            });
            return section ? section : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // data: only the fields that changed. `content` may be an object.
    async updateSection(rowId, data) {
        try {
            const patch = { ...data };
            if (patch.content && typeof patch.content === 'object') {
                patch.content = JSON.stringify(patch.content);
            }
            const section = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: patch,
            });
            return section ? section : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteSection(rowId, deleteFiles = true) {
        try {
            const section = deleteFiles ? await this.getSection(rowId) : null;
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            if (section) await Promise.all((section.imageIds || []).map((id) => this.deleteImage(id)));
            await this._normalizeOrder();
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Show / hide a section without deleting it.
    async setActive(rowId, isActive) {
        return this.updateSection(rowId, { isActive: !!isActive });
    }

    // Creates DEFAULT_SECTIONS if the layout is empty. Returns the layout.
    async seedDefaultLayout() {
        try {
            const existing = await this.getLayout();
            if (existing && existing.length) return existing;
            for (const s of DEFAULT_SECTIONS) await this.createSection(s);
            return await this.getLayout();
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // =====================================================================
    // POSITIONS (what goes above what)
    // =====================================================================

    // orderedIds: every section id in the new top-to-bottom order
    // (use after drag-and-drop). Only changed rows are written.
    async reorderSections(orderedIds) {
        try {
            const all = (await this.getLayout()) || [];
            const current = new Map(all.map((s) => [s.$id, s.order]));
            const updates = orderedIds
                .map((id, index) => ({ id, index }))
                .filter(({ id, index }) => current.has(id) && current.get(id) !== index);

            for (let i = 0; i < updates.length; i += 10) {
                await Promise.all(
                    updates.slice(i, i + 10).map(({ id, index }) =>
                        this.table.updateRow({
                            databaseId: this.databaseId,
                            tableId: this.tableId,
                            rowId: id,
                            data: { order: index },
                        })
                    )
                );
            }
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Move one section to a position (0 = very top of the page).
    async moveSection(rowId, toIndex) {
        try {
            const ids = ((await this.getLayout()) || []).map((s) => s.$id);
            const from = ids.indexOf(rowId);
            if (from === -1) return false;
            ids.splice(from, 1);
            ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, rowId);
            return await this.reorderSections(ids);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async moveUp(rowId) {
        const ids = ((await this.getLayout()) || []).map((s) => s.$id);
        const i = ids.indexOf(rowId);
        return i > 0 ? this.moveSection(rowId, i - 1) : true;
    }

    async moveDown(rowId) {
        const ids = ((await this.getLayout()) || []).map((s) => s.$id);
        const i = ids.indexOf(rowId);
        return i !== -1 && i < ids.length - 1 ? this.moveSection(rowId, i + 1) : true;
    }

    async moveToTop(rowId) {
        return this.moveSection(rowId, 0);
    }

    async moveToBottom(rowId) {
        return this.moveSection(rowId, 9999);
    }

    // =====================================================================
    // CONTENT (the free-form JSON column)
    // =====================================================================

    // The `content` column as an object.
    parseContent(section) {
        try {
            const obj = JSON.parse(section?.content || '{}');
            return obj && typeof obj === 'object' ? obj : {};
        } catch {
            return {};
        }
    }

    // Merge new values into content: updateContent(id, { body: 'Hello' }).
    async updateContent(rowId, partial) {
        try {
            const section = await this.getSection(rowId);
            if (!section) return false;
            return await this.updateSection(rowId, {
                content: { ...this.parseContent(section), ...partial },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // =====================================================================
    // IMAGES  (a section keeps its image ids in `imageIds`;
    // for a hero they are the slides, in order)
    // =====================================================================

    async uploadImage(file) {
        try {
            const uploaded = await this.bucket.createFile({
                bucketId: this.bucketId,
                fileId: ID.unique(),
                file,
            });
            return uploaded ? uploaded : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteImage(fileId) {
        try {
            await this.bucket.deleteFile({ bucketId: this.bucketId, fileId });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    getImageUrl(fileId) {
        try {
            if (!fileId) return null;
            return this.bucket.getFileView({ bucketId: this.bucketId, fileId });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    getImageUrls(section) {
        return (section?.imageIds || []).map((id) => this.getImageUrl(id)).filter(Boolean);
    }

    // Upload files and add them to the end of the section's images.
    async addImages(rowId, files) {
        try {
            const section = await this.getSection(rowId);
            if (!section) return false;

            const uploaded = [];
            for (const file of files) {
                const f = await this.uploadImage(file);
                if (!f) {
                    await Promise.all(uploaded.map((u) => this.deleteImage(u.$id))); // roll back
                    return false;
                }
                uploaded.push(f);
            }

            const saved = await this.updateSection(rowId, {
                imageIds: [...(section.imageIds || []), ...uploaded.map((f) => f.$id)],
            });
            if (!saved) {
                await Promise.all(uploaded.map((u) => this.deleteImage(u.$id)));
                return false;
            }
            return saved;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Replace ALL images of a section with one new image (single banner).
    async replaceImage(rowId, file) {
        try {
            const section = await this.getSection(rowId);
            if (!section) return false;
            const uploaded = await this.uploadImage(file);
            if (!uploaded) return false;

            const saved = await this.updateSection(rowId, { imageIds: [uploaded.$id] });
            if (!saved) {
                await this.deleteImage(uploaded.$id);
                return false;
            }
            await Promise.all((section.imageIds || []).map((id) => this.deleteImage(id)));
            return saved;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async removeImage(rowId, fileId) {
        try {
            const section = await this.getSection(rowId);
            if (!section) return false;
            const saved = await this.updateSection(rowId, {
                imageIds: (section.imageIds || []).filter((id) => id !== fileId),
            });
            if (!saved) return false;
            await this.deleteImage(fileId);
            return saved;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // New image order, e.g. after dragging hero slides.
    async reorderImages(rowId, orderedFileIds) {
        return this.updateSection(rowId, { imageIds: orderedFileIds });
    }

    // ---------- Internal ----------

    // Row ids allow letters, numbers, . - _ (max 36, not starting with a symbol).
    _rowId(key) {
        return String(key).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^[._-]+/, 's').slice(0, 36);
    }

    // Close gaps in `order` (0,1,2,...) after a delete.
    async _normalizeOrder() {
        const all = (await this.getLayout()) || [];
        return this.reorderSections(all.map((s) => s.$id));
    }
}

const layoutService = new LayoutService();

export default layoutService;