import envVars from '../../envVars/vars';
import { Client, Storage, TablesDB, Query, ID } from 'appwrite';

export const PRODUCT_STATUS = { IN_STOCK: 'inStock', OUT_OF_STOCK: 'outOfStock' };

// Everything for the PRODUCTS table (+ product images in the bucket).
// Functions never name individual columns: they take the whole `data`
// object the frontend arranged and pass it to Appwrite. Column list: detail.txt
export class ProductService {
    client = new Client();
    table;
    bucket;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliProducts;
    bucketId = envVars.ronakByAliBucketId;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
        this.bucket = new Storage(this.client);
    }

    // ---------- Data helpers ----------

    // "Rs 2,500"
    formatPrice(value, currency = 'Rs') {
        return `${currency} ${Number(value || 0).toLocaleString('en-PK')}`;
    }

    // Fills the calculated columns so the admin form only enters the basics:
    //   price           = originalPrice minus discountPercentage (if not given)
    //   priceFormat     = "Rs 2,500" (if not given)
    //   remaining       = totalAvailable - sold
    //   status          = inStock / outOfStock from `remaining`
    prepareProductData(data = {}) {
        const out = { ...data };
        const original = Number(out.originalPrice) || 0;
        const pct = Number(out.discountPercentage) || 0;

        if (out.price == null || out.price === '') {
            out.price = pct > 0 ? Math.round(original * (1 - pct / 100)) : original;
        }
        if (!out.priceFormat) out.priceFormat = this.formatPrice(out.price);

        if (out.totalAvailable != null && out.totalAvailable !== '') {
            out.sold = Number(out.sold) || 0;
            out.remaining = Math.max(0, Number(out.totalAvailable) - out.sold);
            out.status = out.remaining > 0 ? PRODUCT_STATUS.IN_STOCK : PRODUCT_STATUS.OUT_OF_STOCK;
        }
        return out;
    }

    // ---------- Create ----------

    async addProduct(data) {
        try {
            const product = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: this.prepareProductData(data),
            });
            return product ? product : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // items: array of product objects (bulk upload), 10 at a time.
    async addProducts(items) {
        try {
            return await this._inChunks(items, 10, (data) =>
                this.table.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: ID.unique(),
                    data: this.prepareProductData(data),
                })
            );
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Update ----------

    // data: only the fields that changed
    async updateProduct(rowId, data) {
        try {
            const product = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data,
            });
            return product ? product : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // updates: [{ id, data }, ...]
    async updateProducts(updates) {
        try {
            await this._inChunks(updates, 10, ({ id, data }) =>
                this.table.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: id,
                    data,
                })
            );
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // updates: [{ id, order }, ...]  (drag-and-drop reordering)
    async updateProductOrder(updates) {
        return this.updateProducts(updates.map(({ id, order }) => ({ id, data: { order } })));
    }

    // Set stock numbers and keep remaining + status in sync.
    async updateStock(rowId, { totalAvailable, sold }) {
        try {
            const current = await this.getProduct(rowId);
            if (!current) return false;
            const total = totalAvailable != null ? Number(totalAvailable) : Number(current.totalAvailable) || 0;
            const soldNow = sold != null ? Number(sold) : Number(current.sold) || 0;
            const remaining = Math.max(0, total - soldNow);
            return await this.updateProduct(rowId, {
                totalAvailable: total,
                sold: soldNow,
                remaining,
                status: remaining > 0 ? PRODUCT_STATUS.IN_STOCK : PRODUCT_STATUS.OUT_OF_STOCK,
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Add (+) or remove (-) sold units, e.g. adjustStock(id, 2) after 2 are sold.
    // Used by orderService when an admin confirms / cancels an order.
    async adjustStock(rowId, soldDelta) {
        try {
            const current = await this.getProduct(rowId);
            if (!current) return false;
            const sold = Math.max(0, (Number(current.sold) || 0) + Number(soldDelta || 0));
            return await this.updateStock(rowId, { sold });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Delete ----------

    async deleteProduct(rowId, deleteFiles = true) {
        try {
            const product = deleteFiles ? await this.getProduct(rowId) : null;
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            if (product) await this._deleteProductFiles(product);
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteProducts(rowIds, deleteFiles = true) {
        try {
            const results = await this._inChunks(rowIds, 10, (rowId) =>
                this.deleteProduct(rowId, deleteFiles)
            );
            return results.every(Boolean);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Read: single ----------

    async getProduct(rowId) {
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

    // Public product page lookup (/products/:slug)
    async getProductBySlug(slug) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('slug', slug), Query.limit(1)],
            });
            return res?.rows?.length ? res.rows[0] : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Hydrate cart / wishlist / order items.
    async getProductsByIds(ids) {
        try {
            const unique = [...new Set(ids || [])].filter(Boolean);
            const chunks = [];
            for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

            const results = await Promise.all(
                chunks.map((chunk) =>
                    this.table.listRows({
                        databaseId: this.databaseId,
                        tableId: this.tableId,
                        queries: [Query.equal('$id', chunk), Query.limit(100)],
                    })
                )
            );
            return results.flatMap((res) => res?.rows || []);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Read: lists ----------

    // filters: { category: 'Lawn', status: 'inStock' }. Empty values ignored.
    async getProducts(filters = {}) {
        try {
            return await this._listAllRows(this._filterQueries(filters));
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async countProducts(filters = {}) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [...this._filterQueries(filters), Query.limit(1)],
            });
            return res?.total || 0;
        } catch (error) {
            console.error(error.message);
            return 0;
        }
    }

    // options: { filters, minPrice, maxPrice, sortBy, limit, offset }
    // sortBy: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest' | 'order'
    async getProductsPage(options = {}) {
        try {
            const {
                filters = {},
                minPrice,
                maxPrice,
                sortBy = 'name-asc',
                limit = 35,
                offset = 0,
            } = options;

            const queries = [
                ...this._filterQueries(filters),
                ...this._priceQueries({ minPrice, maxPrice }),
                ...this._sortQueries(sortBy),
                Query.limit(limit),
                Query.offset(offset),
            ];

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

    // In-memory text search over name, description, category, group, tags.
    async searchProducts(options = {}) {
        try {
            const {
                term,
                filters = {},
                minPrice,
                maxPrice,
                sortBy = 'name-asc',
                limit = 35,
                offset = 0,
            } = options;

            const trimmed = (term || '').trim().toLowerCase();
            if (!trimmed) {
                return await this.getProductsPage({ filters, minPrice, maxPrice, sortBy, limit, offset });
            }

            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                ...this._priceQueries({ minPrice, maxPrice }),
            ]);

            const matched = rows.filter((r) =>
                [r.name, r.description, r.category, r.group, ...(r.tags || [])].some((v) =>
                    String(v || '').toLowerCase().includes(trimmed)
                )
            );

            const sorted = this._sortRowsInMemory(matched, sortBy);
            return { rows: sorted.slice(offset, offset + limit), total: sorted.length };
        } catch (error) {
            console.error(error.message);
            return { rows: [], total: 0 };
        }
    }

    async getFeaturedProducts(limit = 8) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('featured', true),
                    Query.orderAsc('order'),
                    Query.limit(limit),
                ],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getRelatedProducts(product, limit = 8) {
        try {
            if (!product?.category) return [];
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('category', product.category),
                    Query.notEqual('$id', product.$id),
                    Query.limit(limit),
                ],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Categories / groups / price range ----------

    // { categoryName: count }
    async listCategories(filters = {}) {
        try {
            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                Query.select(['$id', 'category']),
            ]);
            const counts = {};
            rows.forEach((r) => {
                if (!r.category) return;
                counts[r.category] = (counts[r.category] || 0) + 1;
            });
            return counts;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // { groupName: count }
    async listGroups(filters = {}) {
        try {
            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                Query.select(['$id', 'group']),
            ]);
            const counts = {};
            rows.forEach((r) => {
                if (!r.group) return;
                counts[r.group] = (counts[r.group] || 0) + 1;
            });
            return counts;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // [{ name, count, sampleFileId }] for picture tiles. sampleFileId is the
    // first image id of the first product in that category.
    async listCategoriesWithSample(filters = {}) {
        try {
            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                Query.select(['$id', 'category', 'imageIds']),
            ]);
            return this._tally(rows, 'category');
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // One level down: [{ name, count, sampleFileId, sampleCategory }]
    async listGroupsWithSample(filters = {}) {
        try {
            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                Query.select(['$id', 'category', 'group', 'imageIds']),
            ]);
            return this._tally(rows, 'group');
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getPriceRange(filters = {}) {
        try {
            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                Query.select(['$id', 'price']),
            ]);
            if (rows.length === 0) return { min: 0, max: 0 };
            const prices = rows.map((r) => Number(r.price) || 0);
            return { min: Math.min(...prices), max: Math.max(...prices) };
        } catch (error) {
            console.error(error.message);
            return { min: 0, max: 0 };
        }
    }

    // ---------- Slugs ----------

    async isSlugAvailable(slug, excludeRowId) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('slug', slug), Query.limit(1)],
            });
            const rows = res?.rows || [];
            if (rows.length === 0) return true;
            if (excludeRowId && rows[0].$id === excludeRowId) return true;
            return false;
        } catch (error) {
            console.error(error.message);
            return false; // fail closed
        }
    }

    async getAllSlugs() {
        try {
            const rows = await this._listAllRows([Query.select(['$id', 'slug'])]);
            return new Set(rows.map((r) => r.slug).filter(Boolean));
        } catch (error) {
            console.error(error.message);
            return new Set();
        }
    }

    // "Rose Lawn Suit" -> "rose-lawn-suit", then "-2", "-3"... if taken.
    async generateUniqueSlug(text, excludeRowId) {
        try {
            const base =
                String(text || '')
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '') || 'product';

            let slug = base;
            for (let n = 2; n < 50; n++) {
                if (await this.isSlugAvailable(slug, excludeRowId)) return slug;
                slug = `${base}-${n}`;
            }
            return false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Images ----------
    // A product keeps ALL its image ids in the `imageIds` array.
    // imageIds[0] is the main image.

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

    // files: array of File objects -> uploaded files in order, or false.
    async uploadImages(files) {
        try {
            return await this._inChunks(files, 5, (file) =>
                this.bucket.createFile({
                    bucketId: this.bucketId,
                    fileId: ID.unique(),
                    file,
                })
            );
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteImage(fileId) {
        try {
            const id = this._extractFileId(fileId);
            if (!id) return false;
            await this.bucket.deleteFile({ bucketId: this.bucketId, fileId: id });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteImages(fileIds) {
        try {
            const results = await this._inChunks(fileIds || [], 10, (id) => this.deleteImage(id));
            return results.every(Boolean);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Synchronous, safe in JSX: <img src={productService.getImageUrl(id)} />
    getImageUrl(fileId) {
        try {
            const id = this._extractFileId(fileId);
            if (!id) return null;
            return this.bucket.getFileView({ bucketId: this.bucketId, fileId: id });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // Main image url of a product row.
    getMainImageUrl(product) {
        return this.getImageUrl(product?.imageIds?.[0]);
    }

    // All image urls of a product row.
    getImageUrls(product) {
        return (product?.imageIds || []).map((id) => this.getImageUrl(id)).filter(Boolean);
    }

    // Upload files and append their ids to the product's imageIds.
    async addImages(rowId, files) {
        try {
            const current = await this.getProduct(rowId);
            if (!current) return false;

            const uploaded = await this.uploadImages(files);
            if (!uploaded) return false;

            const product = await this.updateProduct(rowId, {
                imageIds: [...(current.imageIds || []), ...uploaded.map((f) => f.$id)],
            });
            if (!product) {
                await this.deleteImages(uploaded.map((f) => f.$id)); // roll back
                return false;
            }
            return product;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Remove one image from the product and from the bucket.
    async removeImage(rowId, fileId) {
        try {
            const current = await this.getProduct(rowId);
            if (!current) return false;
            const product = await this.updateProduct(rowId, {
                imageIds: (current.imageIds || []).filter((id) => id !== fileId),
            });
            if (!product) return false;
            await this.deleteImage(fileId);
            return product;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Make an existing image the main one (moves it to the front).
    async setMainImage(rowId, fileId) {
        try {
            const current = await this.getProduct(rowId);
            if (!current || !(current.imageIds || []).includes(fileId)) return false;
            return await this.updateProduct(rowId, {
                imageIds: [fileId, ...current.imageIds.filter((id) => id !== fileId)],
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Internal helpers ----------

    _filterQueries(filters = {}) {
        const queries = [];
        Object.entries(filters || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            queries.push(Query.equal(key, value));
        });
        return queries;
    }

    _priceQueries({ minPrice, maxPrice } = {}) {
        const queries = [];
        if (minPrice != null && minPrice !== '') queries.push(Query.greaterThanEqual('price', Number(minPrice)));
        if (maxPrice != null && maxPrice !== '') queries.push(Query.lessThanEqual('price', Number(maxPrice)));
        return queries;
    }

    _sortQueries(sortBy) {
        switch (sortBy) {
            case 'price-asc':
                return [Query.orderAsc('price')];
            case 'price-desc':
                return [Query.orderDesc('price')];
            case 'name-desc':
                return [Query.orderDesc('name')];
            case 'newest':
                return [Query.orderDesc('$createdAt')];
            case 'order':
                return [Query.orderAsc('order')];
            case 'name-asc':
            default:
                return [Query.orderAsc('name')];
        }
    }

    _sortRowsInMemory(rows, sortBy) {
        const sorted = [...rows];
        switch (sortBy) {
            case 'price-asc':
                sorted.sort((a, b) => Number(a.price) - Number(b.price));
                break;
            case 'price-desc':
                sorted.sort((a, b) => Number(b.price) - Number(a.price));
                break;
            case 'name-desc':
                sorted.sort((a, b) => String(b.name).localeCompare(String(a.name)));
                break;
            case 'newest':
                sorted.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
                break;
            case 'order':
                sorted.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
                break;
            case 'name-asc':
            default:
                sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        }
        return sorted;
    }

    _tally(rows, key) {
        const map = new Map();
        rows.forEach((r) => {
            const name = r[key];
            if (!name) return;
            if (!map.has(name)) {
                map.set(name, { count: 0, sampleFileId: null, sampleCategory: r.category || null });
            }
            const entry = map.get(name);
            entry.count += 1;
            if (!entry.sampleFileId && r.imageIds?.length) entry.sampleFileId = r.imageIds[0];
        });
        return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
    }

    async _listAllRows(extraQueries = []) {
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

    async _inChunks(items, size, fn) {
        const results = [];
        for (let i = 0; i < items.length; i += size) {
            const part = await Promise.all(items.slice(i, i + size).map(fn));
            results.push(...part);
        }
        return results;
    }

    async _deleteProductFiles(product) {
        const ids = (product.imageIds || []).filter(Boolean);
        await Promise.all(ids.map((id) => this.deleteImage(id)));
    }

    // If a row ever stores a full file URL instead of the raw id, pull the
    // id back out of ".../files/<id>/view?...".
    _extractFileId(fileId) {
        if (!fileId) return null;
        if (!fileId.includes('/')) return fileId;
        const match = fileId.match(/\/files\/([^/]+)\//);
        return match ? match[1] : fileId;
    }
}

const productService = new ProductService();

export default productService;