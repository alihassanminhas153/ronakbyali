import envVars from '../../envVars/vars';
import { Client, Account, ID, OAuthProvider } from 'appwrite';

export class AuthService {
    client = new Client();
    account;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.account = new Account(this.client);
    }

    // ---------- Sign up / Sign in / Sign out ----------

    // Creates the account and immediately logs the user in.
    // Returns the created user object on success, false on failure.
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

    // Email + password login. Returns the session object, or false.
    async login({ email, password }) {
        try {
            const session = await this.account.createEmailPasswordSession({
                email,
                password,
            });
            return session ? session : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // OAuth login (Google by default). This redirects the browser away,
    // so there is nothing meaningful to return. After the provider
    // finishes, the user lands on `successUrl` with a session already set.
    // Enable the provider in the Appwrite console first.
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

    // "Continue with Google" button. One call covers BOTH cases: if the
    // Google email has no account yet, Appwrite creates it (sign up);
    // if it already exists, the user is simply logged in (sign in).
    // `successUrl` should be a page that calls userService.ensureProfile().
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

    // Logs out of the current device only.
    async logout() {
        try {
            await this.account.deleteSession({ sessionId: 'current' });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Logs out of every device the user is signed in on.
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

    // Returns the logged-in user, or false when nobody is logged in.
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
        const user = await this.getCurrentUser();
        return !!user;
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

    // Appwrite requires the current password to change the email.
    async updateEmail({ email, password }) {
        try {
            const user = await this.account.updateEmail({ email, password });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Appwrite requires the current password to change the phone number.
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

    // Change password while logged in (needs the old one).
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

    // ---------- Preferences (small per-user JSON stored on the account) ----------

    async getPrefs() {
        try {
            return await this.account.getPrefs();
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Replaces the whole prefs object, so merge with getPrefs() first
    // if you only want to change one key. Use updatePref() for that.
    async updatePrefs({ prefs }) {
        try {
            const user = await this.account.updatePrefs({ prefs });
            return user ? user : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Change a single pref (e.g. theme) without wiping the others.
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

    // Sends a verification email. `url` is the page in YOUR app that will
    // call confirmVerification() with the userId + secret from the link.
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

    // ---------- Password recovery (forgot password) ----------

    // Sends a recovery email. `url` is the page in YOUR app that will
    // call confirmPasswordRecovery() with the userId + secret from the link.
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
            const token = await this.account.updateRecovery({
                userId,
                secret,
                password,
            });
            return token ? token : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Sessions ----------

    // All active sessions (devices) for the current user.
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