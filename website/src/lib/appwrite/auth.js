import envVars from '../../../env/var';
import { Client, Account, ID, OAuthProvider } from 'appwrite';
import userService from './user';

export class AuthService {
    client = new Client();
    account;

    // Message of the last failed high-level call (signUp, signIn, ...),
    // so the UI can show "wrong password", "account blocked", etc.
    lastError = null;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.account = new Account(this.client);
    }

    // =====================================================================
    // HIGH-LEVEL FLOWS  (use these from your forms)
    // Every one returns the PROFILE row on success (it has name, email,
    // role, username, lastCity, lastAddress, cartId, wishlistId ...)
    // or false on failure (check authService.lastError).
    // =====================================================================

    // Create account -> log in -> create profile (role "new", random username).
    async signUp({ email, password, name }) {
        this.lastError = null;
        try {
            const user = await this.account.create({
                userId: ID.unique(),
                email,
                password,
                name,
            });
            if (!user) return this._fail('Could not create the account.');
            await this.account.createEmailPasswordSession({ email, password });
            return await this._finishLogin('email');
        } catch (error) {
            if (error.code === 409) return this._fail('An account with this email already exists. Please log in.');
            return this._fail(error.message);
        }
    }

    // Log in with email + password -> return the existing profile
    // (or create it if this auth user has none yet).
    async signIn({ email, password }) {
        this.lastError = null;
        try {
            await this.account.createEmailPasswordSession({ email, password });
            return await this._finishLogin('email');
        } catch (error) {
            if (error.code === 401) return this._fail('Wrong email or password.');
            return this._fail(error.message);
        }
    }

    // One button for both: tries to log in; if there is no such account and
    // a `name` was given, creates it instead. If the email exists but the
    // password is wrong you get that error and nothing is created.
    async continueWithEmail({ email, password, name }) {
        const profile = await this.signIn({ email, password });
        if (profile) return profile;
        if (!name) return false; // login mode: keep signIn's error

        const created = await this.signUp({ email, password, name });
        if (!created && this.lastError?.includes('already exists')) {
            this.lastError = 'This email already has an account, but the password is wrong.';
        }
        return created;
    }

    // "Continue with Google". Redirects the browser away. Appwrite creates
    // the account if the Google email is new, or logs the user in if it
    // already exists. `successUrl` must be a page that calls completeLogin().
    continueWithGoogle({
        successUrl = `${window.location.origin}/auth/callback`,
        failureUrl = `${window.location.origin}/login`,
    } = {}) {
        return this.loginWithOAuth({
            provider: OAuthProvider.Google,
            successUrl,
            failureUrl,
        });
    }

    // Run this on the /auth/callback page (after Google), and on app start
    // to restore the session. Returns the profile, or false when nobody is
    // logged in.
    async completeLogin() {
        this.lastError = null;
        return this._finishLogin('google');
    }

    // The profile of whoever is logged in right now (no side effects).
    async getCurrentProfile() {
        const user = await this.getCurrentUser();
        if (!user) return false;
        return userService.getProfile({ userId: user.$id });
    }

    async _finishLogin(provider) {
        const user = await this.getCurrentUser();
        if (!user) return this._fail('Login failed. Please try again.');

        const profile = await userService.ensureProfile({
            user,
            defaults: { authProvider: provider },
        });
        if (!profile) return this._fail('Could not load your profile.');

        if (profile.isBlocked) {
            await this.logout();
            return this._fail('This account has been blocked. Please contact support.');
        }
        return profile;
    }

    _fail(message) {
        this.lastError = message || 'Something went wrong.';
        console.error(this.lastError);
        return false;
    }

    // =====================================================================
    // LOW-LEVEL
    // =====================================================================

    async createAccount({ email, password, name }) {
        try {
            const user = await this.account.create({
                userId: ID.unique(),
                email,
                password,
                name,
            });
            if (!user) return false;
            await this.login({ email, password });
            return user;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async login({ email, password }) {
        try {
            const session = await this.account.createEmailPasswordSession({ email, password });
            return session ? session : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    loginWithOAuth({
        provider = OAuthProvider.Google,
        successUrl = window.location.origin,
        failureUrl = `${window.location.origin}/login`,
    } = {}) {
        try {
            this.account.createOAuth2Session({
                provider,
                success: successUrl,
                failure: failureUrl,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async logout() {
        try {
            await this.account.deleteSession({ sessionId: 'current' });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async logoutAll() {
        try {
            await this.account.deleteSessions();
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Current user ----------

    // A 401 just means "guest", so it is not logged as an error.
    async getCurrentUser() {
        try {
            return await this.account.get();
        } catch (error) {
            if (error.code !== 401) console.error(error.message);
            return false;
        }
    }

    async isLoggedIn() {
        return !!(await this.getCurrentUser());
    }

    // ---------- Update account ----------

    async updateName({ name }) {
        try {
            const user = await this.account.updateName({ name });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async updateEmail({ email, password }) {
        try {
            const user = await this.account.updateEmail({ email, password });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Phone format: +923001234567
    async updatePhone({ phone, password }) {
        try {
            const user = await this.account.updatePhone({ phone, password });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async updatePassword({ oldPassword, newPassword }) {
        try {
            const user = await this.account.updatePassword({
                password: newPassword,
                oldPassword,
            });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Preferences ----------

    async getPrefs() {
        try {
            return await this.account.getPrefs();
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Replaces the whole prefs object. Use updatePref() to change one key.
    async updatePrefs({ prefs }) {
        try {
            const user = await this.account.updatePrefs({ prefs });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async updatePref({ key, value }) {
        try {
            const current = (await this.account.getPrefs()) || {};
            const user = await this.account.updatePrefs({
                prefs: { ...current, [key]: value },
            });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Email verification ----------

    async sendVerification({ url = `${window.location.origin}/verify` } = {}) {
        try {
            const token = await this.account.createVerification({ url });
            return token ? token : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async confirmVerification({ userId, secret }) {
        try {
            const token = await this.account.updateVerification({ userId, secret });
            return token ? token : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Password recovery ----------

    async sendPasswordRecovery({ email, url = `${window.location.origin}/reset-password` }) {
        try {
            const token = await this.account.createRecovery({ email, url });
            return token ? token : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async confirmPasswordRecovery({ userId, secret, password }) {
        try {
            const token = await this.account.updateRecovery({ userId, secret, password });
            return token ? token : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Sessions ----------

    async listSessions() {
        try {
            const res = await this.account.listSessions();
            return res?.sessions || [];
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteSession({ sessionId }) {
        try {
            await this.account.deleteSession({ sessionId });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const authService = new AuthService();

export default authService;