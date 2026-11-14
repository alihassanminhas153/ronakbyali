import envVars from '../../../env/var';
import { Client, Functions, ExecutionMethod } from 'appwrite';

// Talks to the "order-notifier" Appwrite Function (POST /confirm).
// Put this file at src/lib/appwrite/orderConfirm.js
// Needs envVars.ronakByAliNotifierFunction = the function's ID (add it to env/var.js and .env).
// Every method returns { ok: true, ... } or { ok: false, message }, like labels.js.
export class OrderConfirmService {
    client = new Client();
    functions;
    functionId = envVars.ronakByAliNotifierFunction;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.functions = new Functions(this.client);
    }

    async confirm({ orderId }) {
        try {
            const execution = await this.functions.createExecution({
                functionId: this.functionId,
                body: JSON.stringify({ orderId }),
                async: false,
                xpath: '/confirm',
                method: ExecutionMethod.POST,
                headers: { 'content-type': 'application/json' },
            });
            let data = null;
            try {
                data = JSON.parse(execution.responseBody || '{}');
            } catch {
                data = null;
            }
            if (!data) return { ok: false, message: 'The server sent an unreadable answer.' };
            if (execution.responseStatusCode >= 400 || data.ok === false) {
                return { ok: false, message: data.message || `Request failed (${execution.responseStatusCode}).` };
            }
            return data;
        } catch (error) {
            console.error(error.message);
            return { ok: false, message: error.code === 401 ? 'Please sign in to confirm your order.' : error.message };
        }
    }
}

const orderConfirmService = new OrderConfirmService();

export default orderConfirmService;