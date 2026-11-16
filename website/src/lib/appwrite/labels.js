import envVars from '../../../env/var';
import { Client, Functions, ExecutionMethod } from 'appwrite';

// Talks to the "manage-user-labels" Appwrite Function. The browser can never
// write labels itself; the function does it with a server key and then mirrors
// role + labels into the users table in the same call.
//
// Every method returns the function's JSON on success or false on failure
// (the message is in labelService.lastError). Admin label required.
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
            if (execution.status === 'failed' || execution.responseStatusCode >= 400) {
                return this._fail(data.error || 'The labels function failed. Please try again.');
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

    // -> { userId, labels, role, mirrored }
    setLabels({ userId, labels }) {
        return this._call('setLabels', { userId, labels });
    }

    // -> { user: { id, name, email, labels, status, emailVerification, ... } }
    getUser({ userId }) {
        return this._call('getUser', { userId });
    }

    // Re-mirrors one user's labels into role/labels.  -> { userId, labels, role, mirrored }
    resync({ userId }) {
        return this._call('resync', { userId });
    }

    // Backfill for every account.  -> { total, mirrored }
    resyncAll() {
        return this._call('resyncAll');
    }
}

const labelService = new LabelService();

export default labelService;