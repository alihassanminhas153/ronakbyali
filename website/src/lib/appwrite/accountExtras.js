import envVars from '../../../env/var';
import { Account, Client } from 'appwrite';

// Small helpers that talk to Appwrite Auth (not the users table).
// Kept in their own file so auth.js stays untouched.
//
// ASSUMPTION: authSlice stores the avatar file id in the auth prefs under this
// key. Change it if your auth.js uses a different one.
export const AVATAR_PREF_KEY = 'avatarFileId';

const client = new Client()
    .setEndpoint(envVars.ronakByAliUrl)
    .setProject(envVars.ronakByAliProjectId);
const account = new Account(client);

// Returns { ok: true } or { ok: false, message }.
export async function changePassword({ oldPassword, password }) {
    try {
        await account.updatePassword({ password, oldPassword });
        return { ok: true };
    } catch (error) {
        const message =
            error.code === 401
                ? 'Your current password is incorrect.'
                : error.code === 429
                  ? 'Too many attempts. Please wait a moment and try again.'
                  : error.message || 'Could not change your password.';
        return { ok: false, message };
    }
}

// updatePrefs replaces the whole object, so read, merge, write.
export async function clearAvatarPref() {
    try {
        const prefs = await account.getPrefs();
        const next = { ...(prefs || {}) };
        delete next[AVATAR_PREF_KEY];
        await account.updatePrefs({ prefs: next });
        return true;
    } catch (error) {
        console.error(error.message);
        return false;
    }
}