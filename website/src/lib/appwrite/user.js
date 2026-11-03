import envVars from '../../envVars/vars';
import { Client, Storage, TablesDB, Query, ID, Permission, Role } from 'appwrite';

// Profile data that lives in YOUR database (phone, address, role, avatar...).
// Login, email and password stay in Appwrite Auth (see auth.js). Each
// profile row uses the auth user's $id as its rowId, so lookups are direct.
//
// Suggested columns on the users table:
//   name (string), email (string), phone (string), address (string),
//   role (string, default "customer"), avatarFileId (string)
export class UserService {
    client = new Client();
    table;
    bucket;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliUsers;
    bucketId = envVars.ronakByAliBucketId;    // avatars share the main bucket

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
        this.bucket = new Storage(this.client);
    }

    // ---------- Profiles ----------

    // Call right after signup. `userId` is the auth user's $id.
    // Only that user can read/update/delete their own row; add table-level
    // permissions in the console if admins need to see everyone.
    async createProfile({ userId, data }) {
        try {
            const profile = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: userId,
                data,
                permissions: [
                    Permission.read(Role.user(userId)),
                    Permission.update(Role.user(userId)),
                    Permission.delete(Role.user(userId)),
                ],
            });
            return profile ? profile : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Use after any login, especially "Continue with Google". Returns the
    // existing profile, or creates one from the auth user the first time
    // they sign in. `user` is the object from authService.getCurrentUser().
    async ensureProfile({ user, defaults = {} }) {
        try {
            if (!user) return false;
            const existing = await this.getProfile({ userId: user.$id });
            if (existing) return existing;
            return await this.createProfile({
                userId: user.$id,
                data: {
                    name: user.name || '',
                    email: user.email || '',
                    role: 'customer',
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
            console.error(error.message);
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
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('email', email), Query.limit(1)],
            });
            return res?.rows?.length ? res.rows[0] : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Listing (admin screens) ----------

    // One page of profiles plus the total count, for pagination controls.
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

    // Every profile, optionally filtered by role.
    async getProfiles({ role } = {}) {
        try {
            const queries = role ? [Query.equal('role', role)] : [];
            return await this._getAllRows(queries);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Case-insensitive search over name, email and phone (in memory).
    // Fine for a few thousand users; not built to scale past that.
    async searchProfiles({ term, role } = {}) {
        try {
            const trimmed = (term || '').trim().toLowerCase();
            const queries = role ? [Query.equal('role', role)] : [];
            const rows = await this._getAllRows(queries);
            if (!trimmed) return rows;
            return rows.filter((r) =>
                [r.name, r.email, r.phone].some((v) =>
                    String(v || '').toLowerCase().includes(trimmed)
                )
            );
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Internal pagination helper, same cursor pattern as product.js
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
            await this.bucket.deleteFile({
                bucketId: this.bucketId,
                fileId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Synchronous, safe to call directly in JSX.
    // Uses getFileView() because image transformations (getFilePreview)
    // are paid-plan only, same as in service.js.
    getAvatarUrl({ fileId }) {
        try {
            if (!fileId) return null;
            return this.bucket.getFileView({
                bucketId: this.bucketId,
                fileId,
            });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // Upload a new avatar, save its id on the profile, then delete the old
    // file so the bucket doesn't fill up with orphans.
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