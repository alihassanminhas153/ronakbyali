import envVars from '../../../env/var';
import { Client, TablesDB, ID, Query } from 'appwrite';

// Money the admin records BY HAND: investments, expenses, withdrawals, other income.
// (Sales and cost of goods come from the orders + products tables, nothing to type.)
//
// Table `ronakbyali_finance` (env: ronakByAliFinance). Row id = auto. Columns:
//   type (Enum: investment, expense, withdrawal, income)  Req
//   title (String 150)  Req
//   category (String 100)
//   amount (Float, min 0)  Req
//   date (Datetime)  Req
//   note (String 1000)
// Indexes: type (Key), date (Key), category (Key)
// Permissions: Create / Read / Update / Delete -> Label `admin` ONLY (never "Any").
export const LEDGER_TYPES = ['investment', 'expense', 'withdrawal', 'income'];

export class FinanceService {
    client = new Client();
    table;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliFinance;

    lastError = null;

    constructor() {
        this.client.setEndpoint(envVars.ronakByAliUrl).setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    _fail(message) {
        this.lastError = message;
        return false;
    }

    // Every entry, newest first. Returns an array, or false on error.
    async getEntries() {
        this.lastError = null;
        try {
            const rows = [];
            let cursor = null;
            for (;;) {
                const queries = [Query.orderDesc('date'), Query.limit(100)];
                if (cursor) queries.push(Query.cursorAfter(cursor));
                const res = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries });
                if (!res?.rows?.length) break;
                rows.push(...res.rows);
                if (res.rows.length < 100) break;
                cursor = res.rows[res.rows.length - 1].$id;
            }
            return rows;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not load the finance entries.');
        }
    }

    // data: { type, title, category, amount, date (ISO), note }
    async addEntry(data) {
        this.lastError = null;
        try {
            if (!LEDGER_TYPES.includes(data?.type)) return this._fail('Unknown entry type.');
            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data,
            });
            return row ? row : false;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not save the entry.');
        }
    }

    async updateEntry(rowId, data) {
        this.lastError = null;
        try {
            const row = await this.table.updateRow({ databaseId: this.databaseId, tableId: this.tableId, rowId, data });
            return row ? row : false;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not update the entry.');
        }
    }

    async deleteEntry(rowId) {
        this.lastError = null;
        try {
            await this.table.deleteRow({ databaseId: this.databaseId, tableId: this.tableId, rowId });
            return true;
        } catch (error) {
            console.error(error.message);
            return this._fail('Could not delete the entry.');
        }
    }
}

const financeService = new FinanceService();

export default financeService;