import envVars from '../../envVars/vars';
import { Client, Storage, TablesDB, Query, ID } from 'appwrite';

// Everything for the PRODUCTS table (+ product images in the bucket).
// Rule used across this file: functions never name individual columns.
// They take the whole `data` object that the frontend has already
// arranged and pass it straight to Appwrite. Column list: see detail.txt
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

    // ---------- Create ----------

    // data: the full product object from the frontend
    async addProduct(data) {
        try {
            const product = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data,
            });
            return product ? product : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // items: array of product objects (bulk / folder upload).
    // Runs 10 at a time to stay under Appwrite's rate limits.
    // Returns the created rows, or false if any row fails (nothing is
    // rolled back, so check with getProducts if cleanup is needed).
    async addProducts(items) {
        try {
            return await this._inChunks(items, 10, (data) =>
                this.table.createRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: ID.unique(),
                    data,
                })
            );
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Update ----------

    // data: only the fields that changed (partial object is fine)
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

    // updates: [{ id, data }, ...]  (bulk edit, e.g. mark many out of stock)
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
    // Needs an integer `order` column on the table.
    async updateProductOrder(updates) {
        return this.updateProducts(
            updates.map(({ id, order }) => ({ id, data: { order } }))
        );
    }

    // ---------- Delete ----------

    // Deletes the row and, by default, its image files too.
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

    // rowIds: array of ids. Returns true only if every delete worked.
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

    // Fetch many products by id (hydrate cart / wishlist / order items).
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

    // filters: any { column: value } pairs, e.g. { category: 'Lawn', status: true }.
    // Empty / null values are ignored. Returns ALL matching rows.
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

    // One page + total count, for the catalog grid.
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

    // Text search over name, description, category and group, plus the same
    // options as getProductsPage() and a `term`.
    // Matching is done in memory, so no fulltext indexes are needed.
    // Fine for a few thousand products; not built to scale past that.
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
                [r.name, r.description, r.category, r.group].some((v) =>
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

    // Needs a boolean `featured` column.
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

    // product: the product object currently being viewed.
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

    // { groupName: count }, optionally scoped, e.g. listGroups({ category: 'Lawn' })
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

    // [{ name, count, sampleFileId }] for picture tiles on the browse page.
    async listCategoriesWithSample(filters = {}) {
        try {
            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                Query.select(['$id', 'category', 'fileId']),
            ]);
            return this._tally(rows, 'category');
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Same, one level down: [{ name, count, sampleFileId, sampleCategory }]
    async listGroupsWithSample(filters = {}) {
        try {
            const rows = await this._listAllRows([
                ...this._filterQueries(filters),
                Query.select(['$id', 'category', 'group', 'fileId']),
            ]);
            return this._tally(rows, 'group');
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // { min, max } price in the current scope, for a price slider.
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

    // true if `slug` is not used by another row. Pass excludeRowId while
    // editing so a product's own slug doesn't count as taken.
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
            // Fail closed so a network error can't create a duplicate slug.
            return false;
        }
    }

    // Set of every slug in use, for bulk uploads that dedupe many at once.
    async getAllSlugs() {
        try {
            const rows = await this._listAllRows([Query.select(['$id', 'slug'])]);
            return new Set(rows.map((r) => r.slug).filter(Boolean));
        } catch (error) {
            console.error(error.message);
            return new Set();
        }
    }

    // Turns any text (usually the product name) into a free slug:
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

    // file: a File object from an <input type="file">
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

    // files: array of File objects. Returns the uploaded files in order,
    // or false if any upload fails (already-uploaded ones are removed).
    async uploadImages(files) {
        try {
            const uploaded = await this._inChunks(files, 5, (file) =>
                this.bucket.createFile({
                    bucketId: this.bucketId,
                    fileId: ID.unique(),
                    file,
                })
            );
            return uploaded;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteImage(fileId) {
        try {
            const id = this._extractFileId(fileId);
            if (!id) return false;
            await this.bucket.deleteFile({
                bucketId: this.bucketId,
                fileId: id,
            });
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

    // Synchronous, so it is safe to use directly in JSX:
    //   <img src={productService.getImageUrl(product.fileId)} />
    // Uses getFileView() because image transformations (getFilePreview)
    // are a paid-plan feature and return 403 on the free plan.
    getImageUrl(fileId) {
        try {
            const id = this._extractFileId(fileId);
            if (!id) return null;
            return this.bucket.getFileView({
                bucketId: this.bucketId,
                fileId: id,
            });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // Replace a product's main image: upload the new file, save its id on
    // the row, then delete the old file. Rolls back the upload on failure.
    async changeImage(rowId, file) {
        try {
            const current = await this.getProduct(rowId);
            if (!current) return false;

            const uploaded = await this.uploadImage(file);
            if (!uploaded) return false;

            const product = await this.updateProduct(rowId, { fileId: uploaded.$id });
            if (!product) {
                await this.deleteImage(uploaded.$id);
                return false;
            }

            if (current.fileId) await this.deleteImage(current.fileId);
            return product;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Internal helpers ----------

    // { column: value } -> Query.equal list. Skips empty values.
    // An array value means "any of these".
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

    // Count rows per value of `key` and remember one image as a sample.
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
            if (!entry.sampleFileId && r.fileId) entry.sampleFileId = r.fileId;
        });
        return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
    }

    // Cursor pagination so results beyond 25 rows are never dropped.
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

    // Run `fn` over `items` a few at a time instead of all at once.
    async _inChunks(items, size, fn) {
        const results = [];
        for (let i = 0; i < items.length; i += size) {
            const part = await Promise.all(items.slice(i, i + size).map(fn));
            results.push(...part);
        }
        return results;
    }

    async _deleteProductFiles(product) {
        const ids = [product.fileId, ...(product.galleryIds || [])].filter(Boolean);
        await Promise.all(ids.map((id) => this.deleteImage(id)));
    }

    // Safety net: if a row ever stores a full file URL instead of the raw
    // id, pull the id back out of ".../files/<id>/view?..." so it still works.
    _extractFileId(fileId) {
        if (!fileId) return null;
        if (!fileId.includes('/')) return fileId;
        const match = fileId.match(/\/files\/([^/]+)\//);
        return match ? match[1] : fileId;
    }
}

const productService = new ProductService();

export default productService;