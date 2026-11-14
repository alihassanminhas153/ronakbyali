import envVars from '../../../env/var';
import { Client, Functions, ExecutionMethod } from 'appwrite';

// Talks to the "manage-user-labels" Appwrite Function (admin only).
// Every method returns { ok: true, ... } or { ok: false, message }.
export class LabelService {
    client = new Client();
    functions;
    functionId = envVars.ronakByAliLabelsFunction;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.functions = new Functions(this.client);
    }

    async _call(payload) {
        try {
            const execution = await this.functions.createExecution({
                functionId: this.functionId,
                body: JSON.stringify(payload),
                async: false,
                xpath: '/',
                method: ExecutionMethod.POST,
                headers: { 'content-type': 'application/json' },
            });
            let data = null;
            try {
                data = JSON.parse(execution.responseBody || '{}');
            } catch {
                data = null;
            }
            if (!data) return { ok: false, message: 'The function sent an unreadable answer.' };
            if (execution.responseStatusCode >= 400 || data.ok === false) {
                return { ok: false, message: data.message || `Request failed (${execution.responseStatusCode}).` };
            }
            return data;
        } catch (error) {
            console.error(error.message);
            return { ok: false, message: error.code === 401 ? 'You are not allowed to run this function.' : error.message };
        }
    }

    // live labels straight from Appwrite Auth
    getAccess({ userId }) {
        return this._call({ action: 'get', userId });
    }

    // role: one of the six roles; labels: EXTRA labels only (staff labels come from role)
    setAccess({ userId, role, labels = [] }) {
        return this._call({ action: 'set', userId, role, labels });
    }
}

const labelService = new LabelService();

export default labelService;
