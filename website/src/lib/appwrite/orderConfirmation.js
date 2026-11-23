import envVars from '../../../env/var';
import { Client, Query, TablesDB, ID } from 'appwrite';

const CONTACT_METHODS = ['whatsapp', 'call', 'email', 'other'];

export class OrderConfirmationService {
    client = new Client();
    table;
    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliOrderConfirmations;
    lastError = null;

    constructor() {
        this.client.setEndpoint(envVars.ronakByAliUrl).setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    _fail(message, error = null) {
        this.lastError = message;
        if (error) console.error(error.message || message);
        return false;
    }

    // Creates or updates the confirmation record of an order. `status` is
    // 'confirmed' (default), 'pending' (= not confirmed) or 'expired'.
    // Optional fields are only written when passed, so an update never wipes
    // details saved earlier (for example by the confirm function).
    async upsertForOrder({ order, status = 'confirmed', contactMethod, paymentProtocol, notes, confirmedBy, confirmedAt } = {}) {
        this.lastError = null;
        if (!order?.$id || !order?.userId) return this._fail('A valid order is required for confirmation.');
        if (!['pending', 'confirmed', 'expired'].includes(status)) return this._fail('Choose a valid confirmation status.');
        if (contactMethod && !CONTACT_METHODS.includes(contactMethod)) return this._fail('Choose a valid contact method.');
        const confirmed = status === 'confirmed';
        const data = {
            orderId: order.$id,
            orderNumber: order.orderNumber || null,
            userId: order.userId,
            isCustom: Boolean(order.isCustom),
            total: Math.max(0, Number(order.total) || 0),
            advanceAmount: Math.max(0, Number(order.advanceAmount) || 0),
            confirmedAt: confirmed ? confirmedAt || new Date().toISOString() : null,
            expiredAt: status === 'expired' ? new Date().toISOString() : null,
            status,
            isConfirmed: confirmed,
        };
        if (contactMethod !== undefined) data.contactMethod = contactMethod || null;
        if (paymentProtocol !== undefined) data.paymentProtocol = String(paymentProtocol || '').trim().slice(0, 1000) || null;
        if (notes !== undefined) data.notes = String(notes || '').trim().slice(0, 1000) || null;
        if (confirmedBy !== undefined) data.confirmedBy = confirmedBy || null;
        try {
            const existing = await this.getByOrderId(order.$id);
            if (existing === false) return false;
            if (existing) {
                const updated = await this.table.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: existing.$id,
                    data,
                });
                return updated || this._fail('Could not update the order confirmation.');
            }
            const created = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data,
            });
            return created || this._fail('Could not save the order confirmation.');
        } catch (error) {
            return this._fail('Could not save the order confirmation.', error);
        }
    }

    // Kept for existing callers: always writes a confirmed record.
    async createForOrder(args = {}) {
        return this.upsertForOrder({ ...args, status: 'confirmed' });
    }

    async getByOrderId(orderId) {
        this.lastError = null;
        try {
            const result = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('orderId', orderId), Query.limit(1)],
            });
            return result.rows?.[0] || null;
        } catch (error) {
            this._fail('Could not load the order confirmation.', error);
            return false;
        }
    }

    async list({ limit = 50, offset = 0, isCustom } = {}) {
        this.lastError = null;
        try {
            const queries = [];
            if (typeof isCustom === 'boolean') queries.push(Query.equal('isCustom', isCustom));
            queries.push(Query.equal('status', 'confirmed'));
            queries.push(Query.orderDesc('confirmedAt'), Query.limit(Math.min(100, Math.max(1, Number(limit) || 50))), Query.offset(Math.max(0, Number(offset) || 0)));
            const result = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries });
            return { rows: result.rows || [], total: result.total || 0 };
        } catch (error) {
            this._fail('Could not load confirmed orders.', error);
            return false;
        }
    }

    async setStatusForOrder(orderId, status) {
        this.lastError = null;
        if (!['pending', 'confirmed', 'expired'].includes(status)) {
            return this._fail('Choose a valid confirmation status.');
        }
        const confirmation = await this.getByOrderId(orderId);
        if (confirmation === false) return false;
        if (!confirmation) return true;
        try {
            const updated = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: confirmation.$id,
                data: {
                    status,
                    isConfirmed: status === 'confirmed',
                    expiredAt: status === 'expired' ? new Date().toISOString() : null,
                },
            });
            return updated || this._fail('Could not update the order confirmation record.');
        } catch (error) {
            return this._fail('Could not update the order confirmation record.', error);
        }
    }

    async deleteForOrder(orderId) {
        const confirmation = await this.getByOrderId(orderId);
        if (confirmation === false) return false;
        if (!confirmation) return true;
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: confirmation.$id,
            });
            return true;
        } catch (error) {
            this._fail('Could not delete the order confirmation.', error);
            return false;
        }
    }
}

const orderConfirmationService = new OrderConfirmationService();
export default orderConfirmationService;