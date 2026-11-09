import envVars from '../../../env/var';
import { Client, TablesDB, Query, ID } from 'appwrite';

export const ALERT_TYPES = ['info', 'success', 'warning', 'error', 'promo'];
export const ALERT_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', EXPIRED: 'expired' };
export const ALERT_LIMITS = { title: 150, message: 1000, link: 500, buttonText: 50, userId: 36 };

// The state an alert is really in right now. Stored status can lag behind
// (an alert whose end time passed is "expired" even before the DB row says so).
//   'active' | 'inactive' | 'expired' | 'scheduled' (active, but starts later)
export function alertState(alert, now = Date.now()) {
  if (!alert) return null;
  if (alert.status === ALERT_STATUS.EXPIRED) return 'expired';
  if (alert.endsAt && new Date(alert.endsAt).getTime() < now) return 'expired';
  if (alert.status === ALERT_STATUS.INACTIVE) return 'inactive';
  if (alert.startsAt && new Date(alert.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}
export const isExpired = (alert) => alertState(alert) === 'expired';

// Columns (table ronakbyali_alerts):
//   userId (empty = everyone), title, message, type, status (active | inactive | expired),
//   popup (Boolean), link, buttonText, priority, impressions, seenCount,
//   seenBy (array of user ids), startsAt, endsAt
//
// WHO SEES WHAT
//   - Customers and guests: announcement bars + popups (staff never see them)
//   - Admin: full management (create / edit / status / reset / delete)
//
// POPUP RULES
//   - "Got it" (markSeen)  -> never shown again to that user. Kept in this browser
//                             (localStorage) and, for signed-in users, on the row (seenBy).
//   - X / outside click (dismiss) -> hidden for this browser session only (sessionStorage).
//   - Admin "reset seen" clears seenBy + seenCount, and browsers notice it (see hasSeen).
//
// NOTE: Appwrite only lets signed-in users write to this table, so guests keep their
// "seen" state in this browser only, and their impressions are not counted.

const EDITABLE = ['title', 'message', 'type', 'status', 'popup', 'link', 'buttonText', 'priority', 'userId', 'startsAt', 'endsAt'];
const SETTABLE_STATUS = [ALERT_STATUS.ACTIVE, ALERT_STATUS.INACTIVE]; // "expired" is never set by hand
const SEEN_KEY = 'rba_seen_alerts';
const SEEN_CAP = 200;

export class AlertService {
    client = new Client();
    table;
    lastError = null;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliAlerts;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    // =====================================================================
    // SHOWING ALERTS (storefront: customers and guests)
    // =====================================================================

    // Announcement bars (popup = false) this visitor can see right now.
    // userId: the signed-in user's id, or nothing for guests.
    async getActiveAlerts({ userId } = {}) {
        try {
            const rows = await this._listLive({ popup: false, userId });
            return rows.filter((a) => !this._isDismissed(a.$id));
        } catch (error) {
            this._fail(error, 'Could not load alerts.');
            return [];
        }
    }

    // Popups this visitor should still see (not confirmed, not dismissed this session).
    // Highest priority first.
    async getPopupAlerts({ userId } = {}) {
        try {
            const rows = await this._listLive({ popup: true, userId });
            return rows.filter((a) => !this.hasSeen(a, userId) && !this._isDismissed(a.$id));
        } catch (error) {
            this._fail(error, 'Could not load alerts.');
            return [];
        }
    }

    // The single popup to show right now (highest priority), or null.
    async getPopupAlert({ userId } = {}) {
        const list = await this.getPopupAlerts({ userId });
        return list[0] || null;
    }

    // true if this visitor already pressed the "Got it" button.
    hasSeen(alert, userId) {
        if (userId && (alert.seenBy || []).includes(userId)) return true;
        const remembered = this._readSeen(userId)[alert.$id];
        if (remembered === undefined) return false;
        // If the admin pressed "reset seen", seenCount fell below what this browser
        // recorded, so the popup is allowed to show again.
        return (Number(alert.seenCount) || 0) >= remembered;
    }

    // ---------- Visitor actions ----------

    // Call when a popup / bar is shown. Counts once per browser session.
    async trackImpression(alert, userId) {
        try {
            if (!alert?.$id) return false;
            const key = `imp_${alert.$id}`;
            if (this._sessionGet(key)) return false;
            this._sessionSet(key, '1');
            if (!userId) return false; // guests cannot write to the table

            const fresh = await this.getAlert(alert.$id);
            if (!fresh) return false;
            return !!(await this._write(alert.$id, { impressions: (Number(fresh.impressions) || 0) + 1 }));
        } catch (error) {
            this._fail(error, 'Could not record the view.');
            return false;
        }
    }

    // The "Got it" button: never show this popup to this visitor again.
    // Remembered in this browser straight away, then saved on the alert for
    // signed-in users so it follows them to other devices.
    async markSeen({ alert, userId }) {
        try {
            if (!alert?.$id) return false;
            this._rememberSeen(userId, alert.$id, Number(alert.seenCount) || 0);
            if (!userId) return true; // guests: this browser only

            const fresh = await this.getAlert(alert.$id);
            if (!fresh) return false;
            const seenBy = fresh.seenBy || [];
            if (seenBy.includes(userId)) return true;

            const seenCount = (Number(fresh.seenCount) || 0) + 1;
            const saved = await this._write(alert.$id, { seenCount, seenBy: [...seenBy, userId] });
            if (saved) this._rememberSeen(userId, alert.$id, seenCount);
            return !!saved;
        } catch (error) {
            this._fail(error, 'Could not save that you saw this.');
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

    // data: { title, message, type, status, popup, link, buttonText, priority, userId, startsAt, endsAt }
    async createAlert(data) {
        this.lastError = null;
        try {
            const clean = this._clean(data);
            if (!clean.title || !clean.message) return this._fail(null, 'A title and a message are required.');
            if (clean.status && !SETTABLE_STATUS.includes(clean.status)) {
                return this._fail(null, 'A new alert must be active or inactive.');
            }
            const dateError = this._dateError(clean);
            if (dateError) return this._fail(null, dateError);

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
                    ...clean,
                },
            });
            return alert || false;
        } catch (error) {
            return this._fail(error, 'Could not create the alert.');
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
            return this._fail(error, 'Could not find that alert.');
        }
    }

    // Admin edit. Expired alerts are final: nothing can be changed on them.
    async saveAlert(rowId, data) {
        this.lastError = null;
        try {
            const current = await this.getAlert(rowId);
            if (!current) return false;
            if (alertState(current) === 'expired') return this._fail(null, 'This alert has expired and can no longer be changed.');

            const clean = this._clean(data);
            if (clean.status && !SETTABLE_STATUS.includes(clean.status)) {
                return this._fail(null, 'Status can only be active or inactive.');
            }
            const merged = {
                startsAt: 'startsAt' in clean ? clean.startsAt : current.startsAt,
                endsAt: 'endsAt' in clean ? clean.endsAt : current.endsAt,
            };
            const dateError = this._dateError(merged);
            if (dateError) return this._fail(null, dateError);
            if (merged.endsAt && new Date(merged.endsAt).getTime() <= Date.now()) {
                return this._fail(null, 'The end time is already in the past.');
            }
            return await this._write(rowId, clean);
        } catch (error) {
            return this._fail(error, 'Could not save the alert.');
        }
    }

    // inactive -> active and active -> inactive. Expired ones cannot change.
    async setStatus(rowId, status) {
        if (!SETTABLE_STATUS.includes(status)) return this._fail(null, 'Status can only be active or inactive.');
        return this.saveAlert(rowId, { status });
    }

    // Make everyone see the popup again (clears who has seen it).
    async resetSeen(rowId) {
        this.lastError = null;
        const current = await this.getAlert(rowId);
        if (!current) return false;
        if (alertState(current) === 'expired') return this._fail(null, 'This alert has expired and can no longer be changed.');
        return this._write(rowId, { seenBy: [], seenCount: 0 });
    }

    async deleteAlert(rowId) {
        this.lastError = null;
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            return true;
        } catch (error) {
            return this._fail(error, 'Could not delete the alert.');
        }
    }

    // One page for the admin list. filters: { status, popup, type } (empty values are ignored)
    // sort: 'newest' (default) | 'oldest' | 'priority'
    async getAlertsPage({ limit = 10, offset = 0, sort = 'newest', ...filters } = {}) {
        this.lastError = null;
        try {
            const queries = [];
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') queries.push(Query.equal(key, value));
            });
            if (sort === 'oldest') queries.push(Query.orderAsc('$createdAt'));
            else if (sort === 'priority') queries.push(Query.orderDesc('priority'), Query.orderDesc('$createdAt'));
            else queries.push(Query.orderDesc('$createdAt'));
            queries.push(Query.limit(limit), Query.offset(offset));

            const res = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries });
            return { rows: res?.rows || [], total: res?.total || 0 };
        } catch (error) {
            return this._fail(error, 'Could not load alerts.');
        }
    }

    // Every alert (up to `max`), for the charts.
    async getAllAlerts(max = 500) {
        this.lastError = null;
        try {
            return await this._listAll([Query.orderDesc('$createdAt')], max);
        } catch (error) {
            return this._fail(error, 'Could not load alerts.');
        }
    }

    // Marks alerts whose end time has passed as "expired" in the table.
    // Returns how many rows were changed. Safe to call whenever the admin screen opens.
    async expireOverdue() {
        try {
            const rows = await this._listAll([Query.notEqual('status', ALERT_STATUS.EXPIRED)]);
            const now = Date.now();
            const due = rows.filter((a) => a.endsAt && new Date(a.endsAt).getTime() < now);
            const done = await Promise.all(due.map((a) => this._write(a.$id, { status: ALERT_STATUS.EXPIRED })));
            return done.filter(Boolean).length;
        } catch (error) {
            this._fail(error, 'Could not update expired alerts.');
            return 0;
        }
    }

    // =====================================================================
    // INTERNAL
    // =====================================================================

    async _listLive({ popup, userId }) {
        const res = await this.table.listRows({
            databaseId: this.databaseId,
            tableId: this.tableId,
            queries: [
                Query.equal('status', ALERT_STATUS.ACTIVE),
                Query.equal('popup', popup),
                Query.orderDesc('priority'),
                Query.limit(50),
            ],
        });
        return (res?.rows || []).filter((a) => alertState(a) === 'active' && this._isForUser(a, userId));
    }

    async _listAll(queries = [], max = 500) {
        const rows = [];
        let cursor = null;
        while (rows.length < max) {
            const q = [...queries, Query.limit(100)];
            if (cursor) q.push(Query.cursorAfter(cursor));
            const res = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries: q });
            const batch = res?.rows || [];
            rows.push(...batch);
            if (batch.length < 100) break;
            cursor = batch[batch.length - 1].$id;
        }
        return rows.slice(0, max);
    }

    async _write(rowId, data) {
        try {
            const alert = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data,
            });
            return alert || false;
        } catch (error) {
            return this._fail(error, 'Could not save the alert.');
        }
    }

    // Keeps only the columns the admin may edit and tidies the values.
    _clean(data = {}) {
        const out = {};
        EDITABLE.forEach((k) => {
            if (data[k] !== undefined) out[k] = data[k];
        });
        ['title', 'message', 'link', 'buttonText', 'userId'].forEach((k) => {
            if (typeof out[k] === 'string') out[k] = out[k].trim();
        });
        ['link', 'userId', 'startsAt', 'endsAt'].forEach((k) => {
            if (k in out && out[k] === '') out[k] = null;
        });
        if ('buttonText' in out && !out.buttonText) out.buttonText = 'Got it';
        if ('priority' in out) out.priority = Math.trunc(Number(out.priority)) || 0;
        if ('popup' in out) out.popup = Boolean(out.popup);
        return out;
    }

    _dateError({ startsAt, endsAt }) {
        if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
            return 'The end time must be after the start time.';
        }
        return null;
    }

    _fail(error, fallback) {
        this.lastError = error?.message || fallback;
        if (error) console.error(error.message);
        return false;
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

    // { [alertId]: seenCount when it was confirmed }, one list per user (guests share "guest").
    _readSeen(userId) {
        try {
            const raw = JSON.parse(window.localStorage.getItem(`${SEEN_KEY}:${userId || 'guest'}`) || '{}');
            if (Array.isArray(raw)) return Object.fromEntries(raw.map((id) => [id, 0]));
            return raw && typeof raw === 'object' ? raw : {};
        } catch {
            return {};
        }
    }

    _rememberSeen(userId, alertId, count) {
        try {
            const map = this._readSeen(userId);
            delete map[alertId];
            map[alertId] = Number(count) || 0;
            const keys = Object.keys(map);
            if (keys.length > SEEN_CAP) keys.slice(0, keys.length - SEEN_CAP).forEach((k) => delete map[k]);
            window.localStorage.setItem(`${SEEN_KEY}:${userId || 'guest'}`, JSON.stringify(map));
        } catch {
            /* ignore */
        }
    }
}

const alertService = new AlertService();

export default alertService;