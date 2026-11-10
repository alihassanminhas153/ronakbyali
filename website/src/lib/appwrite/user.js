import envVars from '../../../env/var';
import { Client, Storage, TablesDB, Query, ID, Permission, Role } from 'appwrite';
import cartService from './cart';
import wishlistService from './wishlist';

// ---------- Roles ----------
export const ROLES = {
    ADMIN: 'admin',
    SUPPORT: 'support',
    MANAGER: 'manager',
    CUSTOMER: 'customer',
    LOYAL: 'loyal',
    NEW: 'new',
};
// Staff roles are never changed automatically.
export const STAFF_ROLES = [ROLES.ADMIN, ROLES.SUPPORT, ROLES.MANAGER];
// A customer becomes "loyal" once they have placed this many orders.
export const LOYAL_AFTER_ORDERS = 2;

// true for admin / support / manager ("team" accounts).
export const isStaffRole = (role) => STAFF_ROLES.includes(role);

// The ONLY columns a signed-in user may change on their own profile.
// role, isBlocked, ordersCount, totalSpent, cartId... are never in this list.
export const SELF_EDITABLE_FIELDS = ['name', 'username', 'phone', 'lastAddress', 'lastCity', 'avatarFileId'];

// Profile data that lives in YOUR database. Login, email and password stay
// in Appwrite Auth (see auth.js). Each profile row uses the auth user's $id
// as its rowId, so lookups are direct.
//
// Columns (full list in detail.txt):
//   name, email, username(unique), phone, role, avatarFileId, isBlocked,
//   lastAddress, lastCity, cartId, wishlistId, ordersCount, totalSpent,
//   authProvider, lastLoginAt
export class UserService {
    client = new Client();
    table;
    bucket;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliUsers;
    bucketId = envVars.ronakByAliBucketId;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
        this.bucket = new Storage(this.client);
    }

    // ---------- Profiles ----------

    // Creates the profile row. A unique random username is generated unless
    // you pass one in `data`. The unique index on `username` is the real
    // guard (a normal user cannot read other people's rows, so the pre-check
    // can miss), so on a 409 conflict we simply try a new username.
    async createProfile({ userId, data = {} }) {
        try {
            for (let attempt = 0; attempt < 6; attempt++) {
                const username =
                    attempt === 0 && data.username
                        ? data.username
                        : await this.generateUniqueUsername(data.name || data.email, attempt > 2);

                if (!username) return false;

                try {
                    const profile = await this.table.createRow({
                        databaseId: this.databaseId,
                        tableId: this.tableId,
                        rowId: userId,
                        data: {
                            name: '',
                            email: '',
                            phone: null,
                            role: ROLES.NEW,
                            isBlocked: false,
                            lastAddress: null,
                            lastCity: null,
                            cartId: null,          // filled right after, see _createCartAndWishlist
                            wishlistId: null,
                            ordersCount: 0,
                            totalSpent: 0,
                            authProvider: 'email',
                            ...data,
                            username,
                        },
                        permissions: [
                            Permission.read(Role.user(userId)),
                            Permission.update(Role.user(userId)),
                            Permission.delete(Role.user(userId)),
                        ],
                    });
                    // Brand-new account only: make its cart + wishlist rows
                    // and store their ids on the profile.
                    if (profile) return await this._createCartAndWishlist(profile);
                } catch (error) {
                    if (error.code !== 409) throw error;
                    // Row for this user already exists? Then just return it.
                    const existing = await this.getProfile({ userId });
                    if (existing) return existing;
                    // Otherwise the username (or email) collided; loop again.
                }
            }
            return false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Runs ONCE per account, right after its profile row is first created
    // (never on login/logout). Creates the cart and wishlist rows and saves
    // their ids in users.cartId and users.wishlistId. If one of them fails the
    // account still works: cart/wishlist services create a missing row on
    // first use.
    async _createCartAndWishlist(profile) {
        try {
            const [cart, wishlist] = await Promise.all([
                cartService.createCart({ profile }),
                wishlistService.createWishlist({ profile }),
            ]);

            const links = {};
            if (cart) links.cartId = cart.$id;
            if (wishlist) links.wishlistId = wishlist.$id;
            if (!Object.keys(links).length) return profile;

            const linked = await this.updateProfile({ userId: profile.$id, data: links });
            return linked || { ...profile, ...links };
        } catch (error) {
            console.error(error.message);
            return profile;
        }
    }

    // Use after ANY login (email or Google).
    //  1. profile with the same id exists   -> return it (previous values)
    //  2. profile with the same email exists -> return it
    //  3. otherwise create a new profile with role "new", a random username,
    //     and (only this once) a cart row + wishlist row linked to it
    // `user` is the object from authService.getCurrentUser().
    async ensureProfile({ user, defaults = {} }) {
        try {
            if (!user) return false;

            const existing =
                (await this.getProfile({ userId: user.$id })) ||
                (user.email ? await this.getProfileByEmail({ email: user.email }) : false);

            if (existing) {
                // Keep "last login" fresh, but never fail the login over it.
                const touched = await this.updateProfile({
                    userId: existing.$id,
                    data: { lastLoginAt: new Date().toISOString() },
                });
                return touched || existing;
            }

            return await this.createProfile({
                userId: user.$id,
                data: {
                    name: user.name || (user.email ? user.email.split('@')[0] : ''),
                    email: user.email || '',
                    role: ROLES.NEW,
                    lastLoginAt: new Date().toISOString(),
                    ...defaults,
                },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getProfile({ userId }) {
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

    async updateProfile({ userId, data }) {
        try {
            const profile = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: userId,
                data,
            });
            return profile ? profile : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Profile edits made by the signed-in user. Unknown / protected fields are
    // dropped so the UI can never send role, isBlocked, totals, etc.
    // Usernames are trimmed and lower-cased. (Client-side guard only; see the
    // note about server enforcement in the setBlocked comment below.)
    async updateOwnProfile({ userId, data = {} }) {
        const safe = {};
        for (const key of SELF_EDITABLE_FIELDS) {
            if (key in data) {
                safe[key] =
                    key === 'username' ? String(data[key]).trim().toLowerCase() : data[key];
            }
        }
        if (!Object.keys(safe).length) return false;
        return this.updateProfile({ userId, data: safe });
    }

    async deleteProfile({ userId }) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: userId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getProfileByEmail({ email }) {
        return this._getOneBy('email', email);
    }

    // Profile page lookup (/u/:username)
    async getProfileByUsername({ username }) {
        return this._getOneBy('username', username);
    }

    async _getOneBy(column, value) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal(column, value), Query.limit(1)],
            });
            return res?.rows?.length ? res.rows[0] : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Only the safe fields, for showing a profile to other people.
    toPublicProfile(profile) {
        if (!profile) return null;
        const { $id, name, username, avatarFileId, role, $createdAt } = profile;
        return { $id, name, username, avatarFileId, role, $createdAt };
    }

    // ---------- Username ----------

    // true if no visible row uses this username.
    async isUsernameAvailable(username) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('username', username), Query.limit(1)],
            });
            return (res?.rows?.length || 0) === 0;
        } catch (error) {
            console.error(error.message);
            return false; // fail closed
        }
    }

    // "Ali Raza" -> "aliraza4821". `longer` adds more random digits.
    async generateUniqueUsername(seed, longer = false) {
        try {
            const base =
                String(seed || '')
                    .split('@')[0]
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                    .slice(0, 12) || 'user';

            for (let i = 0; i < 8; i++) {
                const digits = longer ? 6 : 4;
                const num = Math.floor(Math.random() * 10 ** digits)
                    .toString()
                    .padStart(digits, '0');
                const candidate = `${base}${num}`;
                if (await this.isUsernameAvailable(candidate)) return candidate;
            }
            return false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Roles & orders ----------

    // staff roles stay as they are; others depend on how many orders were placed.
    computeRole(currentRole, ordersCount) {
        if (isStaffRole(currentRole)) return currentRole;
        if (ordersCount >= LOYAL_AFTER_ORDERS) return ROLES.LOYAL;
        if (ordersCount >= 1) return ROLES.CUSTOMER;
        return ROLES.NEW;
    }

    // Called by orderService after an order is placed: saves the latest
    // city/address/phone and moves the role new -> customer -> loyal.
    async applyOrderToProfile({ profile, order }) {
        try {
            const ordersCount = (Number(profile.ordersCount) || 0) + 1;
            return await this.updateProfile({
                userId: profile.$id,
                data: {
                    phone: order.customerPhone || profile.phone || null,
                    lastCity: order.city || null,
                    lastAddress: order.address || null,
                    ordersCount,
                    totalSpent: (Number(profile.totalSpent) || 0) + (Number(order.total) || 0),
                    role: this.computeRole(profile.role, ordersCount),
                },
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Admin only (needs table permission for the admin label).
    async setRole({ userId, role }) {
        if (!Object.values(ROLES).includes(role)) return false;
        return this.updateProfile({ userId, data: { role } });
    }

    // Admin only (needs table permission for the admin label).
    // NOTE: a profile row is updatable by its owner (see createProfile
    // permissions), so a blocked user could in theory flip isBlocked back with a
    // hand-made API call. For hard enforcement also disable the account
    // server-side (Appwrite Function calling Users.updateStatus) or drop the
    // owner's update permission on this column.
    async setBlocked({ userId, isBlocked }) {
        return this.updateProfile({ userId, data: { isBlocked: !!isBlocked } });
    }

    // ---------- Listing (admin screens) ----------

    async getProfilesPage({ role, limit = 25, offset = 0 } = {}) {
        try {
            const queries = [];
            if (role) queries.push(Query.equal('role', role));
            queries.push(Query.orderDesc('$createdAt'));
            queries.push(Query.limit(limit));
            queries.push(Query.offset(offset));

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

    async getProfiles({ role } = {}) {
        try {
            const queries = role ? [Query.equal('role', role)] : [];
            return await this._getAllRows(queries);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Case-insensitive search over name, email, username and phone (in memory).
    async searchProfiles({ term, role } = {}) {
        try {
            const trimmed = (term || '').trim().toLowerCase();
            const queries = role ? [Query.equal('role', role)] : [];
            const rows = await this._getAllRows(queries);
            if (!trimmed) return rows;
            return rows.filter((r) =>
                [r.name, r.email, r.username, r.phone].some((v) =>
                    String(v || '').toLowerCase().includes(trimmed)
                )
            );
        } catch (error) {
            console.error(error.message);
            return false;
        }
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

    // ---------- Avatar ----------

    async uploadAvatar({ file }) {
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

    async deleteAvatar({ fileId }) {
        try {
            await this.bucket.deleteFile({ bucketId: this.bucketId, fileId });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Synchronous, safe to call directly in JSX (getFileView, free plan).
    getAvatarUrl({ fileId }) {
        try {
            if (!fileId) return null;
            return this.bucket.getFileView({ bucketId: this.bucketId, fileId });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    async changeAvatar({ userId, file, oldFileId }) {
        try {
            const uploaded = await this.uploadAvatar({ file });
            if (!uploaded) return false;

            const profile = await this.updateProfile({
                userId,
                data: { avatarFileId: uploaded.$id },
            });
            if (!profile) {
                await this.deleteAvatar({ fileId: uploaded.$id }); // roll back
                return false;
            }

            if (oldFileId) await this.deleteAvatar({ fileId: oldFileId });
            return profile;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const userService = new UserService();

export default userService;