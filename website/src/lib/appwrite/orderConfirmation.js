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

    async createForOrder({ order, contactMethod, paymentProtocol, notes, confirmedBy } = {}) {
        this.lastError = null;
        if (!order?.$id || !order?.userId) return this._fail('A valid order is required for confirmation.');
        if (contactMethod && !CONTACT_METHODS.includes(contactMethod)) return this._fail('Choose a valid contact method.');
        const data = {
            orderId: order.$id,
            orderNumber: order.orderNumber || null,
            userId: order.userId,
            isCustom: Boolean(order.isCustom),
            total: Math.max(0, Number(order.total) || 0),
            advanceAmount: Math.max(0, Number(order.advanceAmount) || 0),
            contactMethod: contactMethod || null,
            paymentProtocol: String(paymentProtocol || '').trim().slice(0, 1000) || null,
            confirmedBy: confirmedBy || null,
            confirmedAt: new Date().toISOString(),
            notes: String(notes || '').trim().slice(0, 1000) || null,
            status: 'confirmed',
        };
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
            queries.push(Query.orderDesc('confirmedAt'), Query.limit(Math.min(100, Math.max(1, Number(limit) || 50))), Query.offset(Math.max(0, Number(offset) || 0)));
            const result = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries });
            return { rows: result.rows || [], total: result.total || 0 };
        } catch (error) {
            this._fail('Could not load confirmed orders.', error);
            return false;
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
