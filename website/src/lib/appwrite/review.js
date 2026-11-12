import envVars from '../../../env/var';
import { Client, Storage, TablesDB, Query, ID, Permission, Role } from 'appwrite';
import userService from './user';
import cartService from './cart';
import productService from './product';

export const REVIEW_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };

// true  = only customers who bought the product can review it
// false = anyone logged in can review (bought ones get isVerifiedPurchase = true)
export const REQUIRE_PURCHASE_TO_REVIEW = false;

export const MAX_REVIEW_IMAGES = 3;

// products.reviewIds and users.reviewIds keep only the NEWEST ids (the full
// list is always found by querying reviews.productId / reviews.userId), so
// those array columns never grow without limit.
export const MAX_REVIEW_IDS_STORED = 50;

// Columns (full list in detail.md):
//   productId, productName, productSlug, userId, username, reviewerName,
//   reviewerAvatarId, rating (1-5), title, message, imageIds (array),
//   isVerifiedPurchase, orderId, status, adminReply, repliedAt
//
// TABLE SETUP (Appwrite console > ronakbyali_reviews > Settings)
//   Row security : ON  (authors keep update/delete on their own row)
//   Permissions  : create(users), read(any), read/update/delete(label:admin)
//   "read(any)" is what makes approved reviews visible on product pages.
//   Admin approval only changes `status`; it never has to grant permissions
//   (Appwrite only lets a client grant roles it holds itself, so an admin can't
//   grant "user:<author id>" -> that was the 401 on approve/reject).
//
// HOW REVIEWS FLOW
//   1. Customer writes a review      -> status "pending"
//   2. Admin approves it (approveReview) -> status "approved" and the PRODUCT is
//      updated: reviewCount, ratingAverage and reviewIds. Only admins can update
//      products, so this is why products are updated at approval time and not at
//      posting time. Product pages only ask for status "approved".
//   3. Customer edits an approved review -> goes back to "pending" (not shown)
//      until the admin approves it again.
//   4. If a customer deletes a review, the product numbers refresh the next
//      time an admin approves/rejects something or runs recalculateProduct().
//      getRatingSummary() always counts live, so product pages stay accurate.
export class ReviewService {
    client = new Client();
    table;
    bucket;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliReviews;
    bucketId = envVars.ronakByAliBucketId;

    // Message of the last failed call, to show in the UI.
    lastError = null;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
        this.bucket = new Storage(this.client);
    }

    // =====================================================================
    // CUSTOMER SIDE
    // =====================================================================

    // Can this user review this product? Use it to show or hide the form.
    // Returns { allowed, reason, purchased, existing }
    //   reason: null | 'already_reviewed' | 'purchase_required'
    async canReview({ userId, productId }) {
        try {
            const existing = await this.getMyReviewForProduct({ userId, productId });
            const cart = await cartService.getCart({ userId });
            const purchased = (cart?.purchasedProductIds || []).includes(productId);

            if (existing) return { allowed: false, reason: 'already_reviewed', purchased, existing };
            if (REQUIRE_PURCHASE_TO_REVIEW && !purchased) {
                return { allowed: false, reason: 'purchase_required', purchased, existing: null };
            }
            return { allowed: true, reason: null, purchased, existing: null };
        } catch (error) {
            console.error(error.message);
            return { allowed: false, reason: 'error', purchased: false, existing: null };
        }
    }

    // profile: logged-in user's profile row    product: the product row
    // files: optional File objects (up to MAX_REVIEW_IMAGES photos)
    // Returns the new review (status "pending") or false (see lastError).
    async createReview({ profile, product, rating, title = '', message, files = [], orderId = null }) {
        this.lastError = null;
        const uploadedIds = [];
        try {
            if (!profile?.$id) return this._fail('Please log in to write a review.');
            if (profile.isBlocked) return this._fail('This account cannot post reviews.');
            if (!product?.$id) return this._fail('Product not found.');

            const stars = Math.round(Number(rating));
            if (!(stars >= 1 && stars <= 5)) return this._fail('Please choose a rating from 1 to 5 stars.');

            const text = String(message || '').trim();
            if (text.length < 5) return this._fail('Please write a few words about the product.');
            if (text.length > 2000) return this._fail('Your review is too long (max 2000 characters).');

            const check = await this.canReview({ userId: profile.$id, productId: product.$id });
            if (!check.allowed) {
                return this._fail(
                    check.reason === 'already_reviewed'
                        ? 'You have already reviewed this product.'
                        : 'Only customers who bought this product can review it.'
                );
            }

            for (const file of Array.from(files || []).slice(0, MAX_REVIEW_IMAGES)) {
                const uploaded = await this.bucket.createFile({
                    bucketId: this.bucketId,
                    fileId: ID.unique(),
                    file,
                });
                uploadedIds.push(uploaded.$id);
            }

            const review = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: {
                    productId: product.$id,
                    productName: product.name || null,
                    productSlug: product.slug || null,
                    userId: profile.$id,
                    username: profile.username || null,
                    reviewerName: profile.name || null,
                    reviewerAvatarId: profile.avatarFileId || null,
                    rating: stars,
                    title: String(title || '').trim().slice(0, 150) || null,
                    message: text,
                    imageIds: uploadedIds,
                    isVerifiedPurchase: check.purchased,
                    orderId,
                    status: REVIEW_STATUS.PENDING,
                    adminReply: null,
                    repliedAt: null,
                },
                // The author may edit / delete their own review (the table gives everyone read access).
                permissions: this._ownerPermissions(profile.$id),
            });

            await this._addToUserReviewIds(profile.$id, review.$id);
            return review;
        } catch (error) {
            await Promise.all(uploadedIds.map((id) => this.deleteImage(id)));
            // 409 = the unique index (one review per user per product) said no.
            if (error.code === 409) return this._fail('You have already reviewed this product.');
            return this._fail(error.message);
        }
    }

    // Edit your own review. It goes back to "pending" and is hidden from the
    // shop until the admin approves it again.  review: the review row being edited.
    async updateMyReview({ review, rating, title, message }) {
        this.lastError = null;
        try {
            const data = { status: REVIEW_STATUS.PENDING };

            if (rating !== undefined) {
                const stars = Math.round(Number(rating));
                if (!(stars >= 1 && stars <= 5)) return this._fail('Please choose a rating from 1 to 5 stars.');
                data.rating = stars;
            }
            if (title !== undefined) data.title = String(title || '').trim().slice(0, 150) || null;
            if (message !== undefined) {
                const text = String(message || '').trim();
                if (text.length < 5) return this._fail('Please write a few words about the product.');
                if (text.length > 2000) return this._fail('Your review is too long (max 2000 characters).');
                data.message = text;
            }

            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: review.$id,
                data,
                permissions: this._ownerPermissions(review.userId),
            });
        } catch (error) {
            return this._fail(error.message);
        }
    }

    // Delete your own review (and its photos).
    async deleteMyReview(review) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: review.$id,
            });
            await Promise.all((review.imageIds || []).map((id) => this.deleteImage(id)));
            await this._removeFromUserReviewIds(review.userId, review.$id);
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getMyReviewForProduct({ userId, productId }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('userId', userId), Query.equal('productId', productId), Query.limit(1)],
            });
            return res?.rows?.length ? res.rows[0] : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // All of a user's reviews, any status.
    async getMyReviews({ userId, limit = 25, offset = 0 }) {
        return this.getReviewsPage({ userId, limit, offset });
    }

    // =====================================================================
    // PUBLIC (product page)
    // =====================================================================

    // Approved reviews of a product.
    // sortBy: 'newest' | 'oldest' | 'highest' | 'lowest'     rating: 1-5 filter
    async getProductReviews({ productId, sortBy = 'newest', rating, limit = 10, offset = 0 }) {
        try {
            const queries = [
                Query.equal('productId', productId),
                Query.equal('status', REVIEW_STATUS.APPROVED),
            ];
            if (rating) queries.push(Query.equal('rating', Number(rating)));

            if (sortBy === 'oldest') queries.push(Query.orderAsc('$createdAt'));
            else if (sortBy === 'highest') queries.push(Query.orderDesc('rating'));
            else if (sortBy === 'lowest') queries.push(Query.orderAsc('rating'));
            else queries.push(Query.orderDesc('$createdAt'));

            queries.push(Query.limit(limit), Query.offset(offset));

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });
            return { rows: res?.rows || [], total: res?.total || 0, error: null };
        } catch (error) {
            console.error(error.message);
            return { rows: [], total: 0, error: error.message };
        }
    }

    // Live numbers for the product page: { average, total, counts: {1..5} }
    async getRatingSummary(productId) {
        try {
            const rows = await this._getAllRows([
                Query.equal('productId', productId),
                Query.equal('status', REVIEW_STATUS.APPROVED),
                Query.select(['$id', 'rating']),
            ]);
            return this._summarize(rows);
        } catch (error) {
            console.error(error.message);
            return { average: 0, total: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        }
    }

    // =====================================================================
    // ADMIN  (needs the admin label on the table)
    // =====================================================================

    async getReview(rowId) {
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

    // filters: { status, productId, userId, rating }. Newest first.
    // Use { status: 'pending' } for the moderation queue.
    async getReviewsPage({ limit = 25, offset = 0, ...filters } = {}) {
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

    async countReviews(filters = {}) {
        const { total } = await this.getReviewsPage({ ...filters, limit: 1 });
        return total;
    }

    // Marks the review approved and refreshes the product's reviewCount,
    // ratingAverage and reviewIds. Only `status` is changed on the review row.
    async approveReview(rowId) {
        this.lastError = null;
        try {
            const review = await this.getReview(rowId);
            if (!review) return this._fail('Review not found.');

            const updated = await this._setStatus(review, REVIEW_STATUS.APPROVED);
            if (!updated) return false;

            await this.recalculateProduct(review.productId);
            return updated;
        } catch (error) {
            return this._fail(error.message);
        }
    }

    // Marks the review rejected (not shown in the shop) and refreshes the product.
    async rejectReview(rowId) {
        this.lastError = null;
        try {
            const review = await this.getReview(rowId);
            if (!review) return this._fail('Review not found.');

            const updated = await this._setStatus(review, REVIEW_STATUS.REJECTED);
            if (!updated) return false;

            await this.recalculateProduct(review.productId);
            return updated;
        } catch (error) {
            return this._fail(error.message);
        }
    }

    async replyToReview(rowId, text) {
        try {
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: {
                    adminReply: String(text || '').trim().slice(0, 1000) || null,
                    repliedAt: text ? new Date().toISOString() : null,
                },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteReview(rowId) {
        try {
            const review = await this.getReview(rowId);
            if (!review) return false;

            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            await Promise.all((review.imageIds || []).map((id) => this.deleteImage(id)));
            await this._removeFromUserReviewIds(review.userId, rowId);
            await this.recalculateProduct(review.productId);
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Counts the approved reviews and writes reviewCount, ratingAverage and
    // reviewIds (newest MAX_REVIEW_IDS_STORED) onto the product row.
    async recalculateProduct(productId) {
        try {
            const rows = await this._getAllRows([
                Query.equal('productId', productId),
                Query.equal('status', REVIEW_STATUS.APPROVED),
                Query.orderDesc('$createdAt'),
            ]);
            const { average, total } = this._summarize(rows);

            return await productService.updateProduct(productId, {
                reviewCount: total,
                ratingAverage: average,
                reviewIds: rows.slice(0, MAX_REVIEW_IDS_STORED).map((r) => r.$id),
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Recalculates every product that has at least one review. Handy once
    // after importing data or if numbers ever look wrong.
    async syncAllProducts() {
        try {
            const rows = await this._getAllRows([Query.select(['$id', 'productId'])]);
            const productIds = [...new Set(rows.map((r) => r.productId))];
            for (const id of productIds) await this.recalculateProduct(id);
            return productIds.length;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Call when you delete a product, so its reviews and photos don't pile up.
    async deleteReviewsForProduct(productId) {
        try {
            const rows = await this._getAllRows([Query.equal('productId', productId)]);
            for (const review of rows) {
                await this.table.deleteRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: review.$id,
                });
                await Promise.all((review.imageIds || []).map((id) => this.deleteImage(id)));
                await this._removeFromUserReviewIds(review.userId, review.$id);
            }
            return rows.length;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // =====================================================================
    // IMAGES
    // =====================================================================

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

    getImageUrls(review) {
        return (review?.imageIds || []).map((id) => this.getImageUrl(id)).filter(Boolean);
    }

    // =====================================================================
    // INTERNAL
    // =====================================================================

    // The author can read / edit / delete their own review row.
    _ownerPermissions(userId) {
        return [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
        ];
    }

    // Changes ONLY the status. No `permissions` argument on purpose: an admin
    // can't grant "user:<author id>" (Appwrite 401), and it isn't needed because
    // the table already gives read access and the row keeps its owner permissions.
    async _setStatus(review, status) {
        try {
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: review.$id,
                data: { status },
            });
        } catch (error) {
            console.error(error.message);
            this.lastError = error.message;
            return false;
        }
    }

    _summarize(rows) {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        rows.forEach((r) => {
            const stars = Number(r.rating) || 0;
            if (counts[stars] !== undefined) counts[stars] += 1;
            sum += stars;
        });
        const total = rows.length;
        return { average: total ? Math.round((sum / total) * 10) / 10 : 0, total, counts };
    }

    // users.reviewIds: newest first, capped.
    async _addToUserReviewIds(userId, reviewId) {
        try {
            const profile = await userService.getProfile({ userId });
            if (!profile) return false;
            const ids = [reviewId, ...(profile.reviewIds || []).filter((id) => id !== reviewId)];
            return await userService.updateProfile({
                userId,
                data: { reviewIds: ids.slice(0, MAX_REVIEW_IDS_STORED) },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async _removeFromUserReviewIds(userId, reviewId) {
        try {
            const profile = await userService.getProfile({ userId });
            if (!profile || !(profile.reviewIds || []).includes(reviewId)) return false;
            return await userService.updateProfile({
                userId,
                data: { reviewIds: profile.reviewIds.filter((id) => id !== reviewId) },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    _fail(message) {
        this.lastError = message || 'Something went wrong.';
        console.error(this.lastError);
        return false;
    }

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

const reviewService = new ReviewService();

export default reviewService;