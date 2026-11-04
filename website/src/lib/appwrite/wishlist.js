import envVars from '../../envVars/vars';
import { Client, TablesDB, Permission, Role } from 'appwrite';
import productService from './product';

// ONE wishlist row per user. rowId = the user's $id (same value stored in
// users.wishlistId).
//
// Columns (full list in detail.txt):
//   userId, username, name, email, phone, city, address   <- copied from the user
//   productIds (array)           wished products
//   itemCount                    how many
//   purchasedProductIds (array)  every product this user has bought
export class WishlistService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliWishlist;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    async getWishlist({ userId }) {
        try {
            return await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: userId,
            });
        } catch (error) {
            if (error.code !== 404) console.error(error.message);
            return false;
        }
    }

    // Creates the user's wishlist row. userService calls this ONCE, when the
    // account is first created (not on login). rowId = the user's id.
    async createWishlist({ profile }) {
        try {
            return await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: profile.$id,
                data: {
                    ...this._snapshot(profile),
                    productIds: [],
                    itemCount: 0,
                    purchasedProductIds: [],
                },
                permissions: [
                    Permission.read(Role.user(profile.$id)),
                    Permission.update(Role.user(profile.$id)),
                    Permission.delete(Role.user(profile.$id)),
                ],
            });
        } catch (error) {
            // 409 = the wishlist already exists, which is fine.
            if (error.code === 409) return await this.getWishlist({ userId: profile.$id });
            console.error(error.message);
            return false;
        }
    }

    // Safety net for old accounts that somehow have no wishlist row yet.
    async getOrCreateWishlist({ profile }) {
        const existing = await this.getWishlist({ userId: profile.$id });
        return existing || (await this.createWishlist({ profile }));
    }

    async syncProfile({ profile }) {
        try {
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: profile.$id,
                data: this._snapshot(profile),
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Items ----------

    async add({ profile, productId }) {
        try {
            const list = await this.getOrCreateWishlist({ profile });
            if (!list) return false;
            if ((list.productIds || []).includes(productId)) return list;
            return await this._save(list.$id, [...(list.productIds || []), productId]);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async remove({ userId, productId }) {
        try {
            const list = await this.getWishlist({ userId });
            if (!list) return false;
            return await this._save(userId, (list.productIds || []).filter((id) => id !== productId));
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Heart button: adds if missing, removes if present.
    // Returns { wished: true|false, wishlist } or false on failure.
    async toggle({ profile, productId }) {
        try {
            const list = await this.getOrCreateWishlist({ profile });
            if (!list) return false;

            const has = (list.productIds || []).includes(productId);
            const ids = has
                ? list.productIds.filter((id) => id !== productId)
                : [...(list.productIds || []), productId];

            const saved = await this._save(list.$id, ids);
            return saved ? { wished: !has, wishlist: saved } : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async has({ userId, productId }) {
        const list = await this.getWishlist({ userId });
        return !!list && (list.productIds || []).includes(productId);
    }

    async clear({ userId }) {
        return this._save(userId, []);
    }

    // Wishlist products with their CURRENT data.
    async getWishlistWithProducts({ userId }) {
        try {
            const wishlist = await this.getWishlist({ userId });
            if (!wishlist) return { wishlist: false, products: [] };
            const products = (await productService.getProductsByIds(wishlist.productIds || [])) || [];
            return { wishlist, products };
        } catch (error) {
            console.error(error.message);
            return { wishlist: false, products: [] };
        }
    }

    // ---------- After an order ----------

    async markPurchased({ userId, productIds }) {
        try {
            const list = await this.getWishlist({ userId });
            if (!list) return false;
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: userId,
                data: {
                    purchasedProductIds: [
                        ...new Set([...(list.purchasedProductIds || []), ...(productIds || [])]),
                    ],
                },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Internal ----------

    _snapshot(profile) {
        return {
            userId: profile.$id,
            username: profile.username || null,
            name: profile.name || null,
            email: profile.email || null,
            phone: profile.phone || null,
            city: profile.lastCity || null,
            address: profile.lastAddress || null,
        };
    }

    async _save(rowId, productIds) {
        try {
            const ids = [...new Set(productIds)];
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: { productIds: ids, itemCount: ids.length },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const wishlistService = new WishlistService();

export default wishlistService;