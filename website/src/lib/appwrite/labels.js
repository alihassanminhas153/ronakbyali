import envVars from '../../../env/var';
import { Client, Functions, ExecutionMethod } from 'appwrite';

// Talks to the "manage-user-labels" Appwrite Function. The browser can never
// write labels itself; the function does it with a server key and mirrors
// role + labels into the users table in the same call. Admin label required.
//
// Every method returns the function's JSON on success or false on failure
// (the message is in labelService.lastError).
export class LabelService {
    client = new Client();
    functions;
    functionId = envVars.ronakByAliLabelsFunction;
    lastError = null;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.functions = new Functions(this.client);
    }

    async _call(action, payload = {}) {
        this.lastError = null;
        if (!this.functionId) {
            return this._fail('Labels function id is missing (ronakByAliLabelsFunction in env/var.js).');
        }
        try {
            const execution = await this.functions.createExecution({
                functionId: this.functionId,
                body: JSON.stringify({ action, ...payload }),
                async: false,
                path: '/',
                method: ExecutionMethod.POST,
                headers: { 'content-type': 'application/json' },
            });

            let data = {};
            try {
                data = JSON.parse(execution.responseBody || '{}');
            } catch {
                /* empty or non-JSON body */
            }
            if (
                execution.status === 'failed' ||
                execution.responseStatusCode >= 400 ||
                data.ok === false
            ) {
                return this._fail(
                    data.message || data.error || 'The labels function failed. Please try again.',
                );
            }
            return data;
        } catch (error) {
            return this._fail(error.message);
        }
    }

    _fail(message) {
        this.lastError = message || 'Something went wrong.';
        console.error(this.lastError);
        return false;
    }

    // Live labels straight from Appwrite Auth.
    // Accepts getAccess({ userId }) or getAccess(userId).
    // -> { ok, userId, labels, role }
    getAccess(arg) {
        const userId = typeof arg === 'string' ? arg : arg?.userId;
        return this._call('get', { userId });
    }

    // Sets role + extra labels and mirrors them into the users table.
    // `labels` = EXTRA labels only; admin / support / manager come from `role`.
    // -> { ok, userId, role, labels, profile }
    setAccess({ userId, role, labels = [] }) {
        return this._call('set', { userId, role, labels });
    }
}

const labelService = new LabelService();

export default labelService;