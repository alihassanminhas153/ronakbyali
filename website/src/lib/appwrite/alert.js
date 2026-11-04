import envVars from '../../envVars/vars';
import { Client, TablesDB, Query, ID } from 'appwrite';

export const ALERT_TYPES = ['info', 'success', 'warning', 'error', 'promo'];
export const ALERT_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' };

// Columns (full list in detail.txt):
//   userId (empty = everyone), title, message, type, status, popup (Boolean),
//   link, buttonText, priority, impressions, seenCount, seenBy (array),
//   startsAt, endsAt
//
// POPUP RULES
//   - "Got it" button (markSeen)  -> never shown again to that user
//   - X / click outside (dismiss) -> hidden for this browser session only,
//                                    shows again on the next visit
export class AlertService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliAlerts;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    // =====================================================================
    // SHOWING ALERTS (storefront)
    // =====================================================================

    // Announcement-bar alerts (popup = false) for this visitor.
    // userId: pass the logged-in user's id, or nothing for guests.
    async getActiveAlerts({ userId } = {}) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('status', ALERT_STATUS.ACTIVE),
                    Query.equal('popup', false),
                    Query.orderDesc('priority'),
                    Query.limit(50),
                ],
            });
            return (res?.rows || []).filter((a) => this._isLive(a) && this._isForUser(a, userId));
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // Popups this visitor should still see (not seen, not dismissed this session).
    async getPopupAlerts({ userId } = {}) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('status', ALERT_STATUS.ACTIVE),
                    Query.equal('popup', true),
                    Query.orderDesc('priority'),
                    Query.limit(50),
                ],
            });
            return (res?.rows || []).filter(
                (a) =>
                    this._isLive(a) &&
                    this._isForUser(a, userId) &&
                    !this.hasSeen(a, userId) &&
                    !this._isDismissed(a.$id)
            );
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // The single popup to show right now (highest priority), or null.
    async getPopupAlert({ userId } = {}) {
        const list = await this.getPopupAlerts({ userId });
        return list[0] || null;
    }

    // true if this user pressed the "seen" button before.
    hasSeen(alert, userId) {
        if (userId && (alert.seenBy || []).includes(userId)) return true;
        return this._readList('rba_seen_alerts').includes(alert.$id);
    }

    // ---------- Visitor actions ----------

    // Call when the popup / bar is shown. Counts once per browser session.
    async trackImpression(alert) {
        try {
            const key = `imp_${alert.$id}`;
            if (this._sessionGet(key)) return false;
            this._sessionSet(key, '1');

            const fresh = await this.getAlert(alert.$id);
            if (!fresh) return false;
            return await this.updateAlert(alert.$id, {
                impressions: (Number(fresh.impressions) || 0) + 1,
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // The "Got it" / "Seen" button: never show this popup to this user again.
    // Always remembered in this browser; also saved on the alert for
    // logged-in users so it follows them to other devices.
    async markSeen({ alert, userId }) {
        try {
            this._addToList('rba_seen_alerts', alert.$id);

            const fresh = await this.getAlert(alert.$id);
            if (!fresh) return false;

            const seenBy = fresh.seenBy || [];
            const data = { seenCount: (Number(fresh.seenCount) || 0) + 1 };
            if (userId && !seenBy.includes(userId)) data.seenBy = [...seenBy, userId];

            return await this.updateAlert(alert.$id, data);
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // The X button or clicking outside: only hides it for this session.
    dismiss(alertId) {
        this._sessionSet(`dismissed_${alertId}`, '1');
        return true;
    }

    // =====================================================================
    // ADMIN
    // =====================================================================

    // data: { title, message, type, status, popup, link, buttonText,
    //         priority, userId, startsAt, endsAt }
    async createAlert(data) {
        try {
            const alert = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: {
                    type: 'info',
                    status: ALERT_STATUS.ACTIVE,
                    popup: false,
                    buttonText: 'Got it',
                    priority: 0,
                    impressions: 0,
                    seenCount: 0,
                    seenBy: [],
                    userId: null,
                    ...data,
                },
            });
            return alert ? alert : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getAlert(rowId) {
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

    async updateAlert(rowId, data) {
        try {
            const alert = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data,
            });
            return alert ? alert : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async setStatus(rowId, status) {
        if (!Object.values(ALERT_STATUS).includes(status)) return false;
        return this.updateAlert(rowId, { status });
    }

    // Make everyone see the popup again (clears who has seen it).
    async resetSeen(rowId) {
        return this.updateAlert(rowId, { seenBy: [], seenCount: 0 });
    }

    async deleteAlert(rowId) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // All alerts for the admin screen. filters: { status, popup, type }
    async getAlertsPage({ limit = 25, offset = 0, ...filters } = {}) {
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

    // =====================================================================
    // INTERNAL
    // =====================================================================

    _isLive(alert) {
        const now = Date.now();
        if (alert.startsAt && new Date(alert.startsAt).getTime() > now) return false;
        if (alert.endsAt && new Date(alert.endsAt).getTime() < now) return false;
        return true;
    }

    // empty userId = for everyone; otherwise only for that user.
    _isForUser(alert, userId) {
        return !alert.userId || alert.userId === userId;
    }

    _isDismissed(alertId) {
        return !!this._sessionGet(`dismissed_${alertId}`);
    }

    // Browser storage helpers (safe if storage is blocked).
    _sessionGet(key) {
        try {
            return window.sessionStorage.getItem(`rba_${key}`);
        } catch {
            return null;
        }
    }

    _sessionSet(key, value) {
        try {
            window.sessionStorage.setItem(`rba_${key}`, value);
        } catch {
            /* ignore */
        }
    }

    _readList(key) {
        try {
            const list = JSON.parse(window.localStorage.getItem(key) || '[]');
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    _addToList(key, id) {
        try {
            const list = this._readList(key);
            if (!list.includes(id)) {
                list.push(id);
                window.localStorage.setItem(key, JSON.stringify(list));
            }
        } catch {
            /* ignore */
        }
    }
}

const alertService = new AlertService();

export default alertService;