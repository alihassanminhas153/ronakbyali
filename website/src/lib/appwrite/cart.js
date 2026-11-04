import envVars from '../../envVars/vars';
import { Client, TablesDB, Permission, Role } from 'appwrite';
import productService from './product';

// ONE cart row per user. rowId = the user's $id (same value stored in
// users.cartId), so lookups are direct.
//
// Columns (full list in detail.txt):
//   userId, username, name, email, phone, city, address   <- copied from the user
//   productIds (array)   product ids currently in the cart
//   items (Text, JSON)   [{ productId, quantity, variant }]
//   itemCount            total quantity
//   purchasedProductIds (array)   every product this user has bought
export class CartService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliCart;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    // ---------- Cart row ----------

    async getCart({ userId }) {
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

    // Creates the user's cart row. userService calls this ONCE, when the
    // account is first created (not on login). rowId = the user's id.
    // profile: the user's profile row.
    async createCart({ profile }) {
        try {
            return await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: profile.$id,
                data: {
                    ...this._snapshot(profile),
                    productIds: [],
                    items: '[]',
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
            // 409 = the cart already exists, which is fine.
            if (error.code === 409) return await this.getCart({ userId: profile.$id });
            console.error(error.message);
            return false;
        }
    }

    // Safety net for old accounts that somehow have no cart row yet.
    // Normal accounts never need this: their cart is made at signup.
    async getOrCreateCart({ profile }) {
        const existing = await this.getCart({ userId: profile.$id });
        return existing || (await this.createCart({ profile }));
    }

    // Refresh the copied user details (call after the profile changes).
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

    // The cart items as a real array.
    parseItems(cart) {
        try {
            const items = JSON.parse(cart?.items || '[]');
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    async addItem({ profile, productId, quantity = 1, variant = null }) {
        try {
            const cart = await this.getOrCreateCart({ profile });
            if (!cart) return false;

            const items = this.parseItems(cart);
            const found = items.find((i) => i.productId === productId && (i.variant || null) === variant);
            if (found) found.quantity += Number(quantity) || 1;
            else items.push({ productId, quantity: Number(quantity) || 1, variant });

            return await this._save(cart.$id, items);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // quantity <= 0 removes the item.
    async setQuantity({ userId, productId, quantity, variant = null }) {
        try {
            const cart = await this.getCart({ userId });
            if (!cart) return false;

            let items = this.parseItems(cart);
            items = items
                .map((i) =>
                    i.productId === productId && (i.variant || null) === variant
                        ? { ...i, quantity: Number(quantity) }
                        : i
                )
                .filter((i) => i.quantity > 0);

            return await this._save(userId, items);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async removeItem({ userId, productId, variant = null }) {
        return this.setQuantity({ userId, productId, quantity: 0, variant });
    }

    async clear({ userId }) {
        return this._save(userId, []);
    }

    // Cart lines with the CURRENT product data (price, name, images ...).
    // Returns { cart, lines: [{ productId, quantity, variant, product }], subtotal }
    async getCartWithProducts({ userId }) {
        try {
            const cart = await this.getCart({ userId });
            if (!cart) return { cart: false, lines: [], subtotal: 0 };

            const items = this.parseItems(cart);
            const products = (await productService.getProductsByIds(items.map((i) => i.productId))) || [];
            const byId = new Map(products.map((p) => [p.$id, p]));

            // Drop lines whose product no longer exists.
            const lines = items
                .filter((i) => byId.has(i.productId))
                .map((i) => ({ ...i, product: byId.get(i.productId) }));

            const subtotal = lines.reduce(
                (sum, l) => sum + (Number(l.product.price) || 0) * l.quantity,
                0
            );
            return { cart, lines, subtotal };
        } catch (error) {
            console.error(error.message);
            return { cart: false, lines: [], subtotal: 0 };
        }
    }

    // ---------- After an order ----------

    // Moves the bought products out of the cart and into purchasedProductIds.
    async markPurchased({ userId, productIds }) {
        try {
            const cart = await this.getCart({ userId });
            if (!cart) return false;

            const bought = new Set(productIds || []);
            const items = this.parseItems(cart).filter((i) => !bought.has(i.productId));
            const purchased = [...new Set([...(cart.purchasedProductIds || []), ...bought])];

            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: userId,
                data: {
                    items: JSON.stringify(items),
                    productIds: [...new Set(items.map((i) => i.productId))],
                    itemCount: items.reduce((n, i) => n + i.quantity, 0),
                    purchasedProductIds: purchased,
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

    async _save(rowId, items) {
        try {
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: {
                    items: JSON.stringify(items),
                    productIds: [...new Set(items.map((i) => i.productId))],
                    itemCount: items.reduce((n, i) => n + i.quantity, 0),
                },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const cartService = new CartService();

export default cartService;