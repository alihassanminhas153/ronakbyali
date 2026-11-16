import envVars from '../../../env/var';
import { Client, TablesDB, Query, ID } from 'appwrite';
import alertService from './alert';

export class SaleService {
    client = new Client();
    table;
    lastError = null;

    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliSales;

    constructor() {
        this.client
            .setEndpoint(envVars.ronakByAliUrl)
            .setProject(envVars.ronakByAliProjectId);
        this.table = new TablesDB(this.client);
    }

    async addSale(data = {}) {
        this.lastError = null;
        const validationError = this._validationError(data);
        if (validationError) return this._fail(null, validationError);

        try {
            const sale = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: {
                    ...data,
                    name: data.name.trim(),
                    discountPercentage: Number(data.discountPercentage),
                },
            });
            return sale ? await this._syncSaleAlert(sale) : false;
        } catch (error) {
            return this._fail(error, 'Could not create the sale.');
        }
    }

    async updateSale(rowId, data = {}) {
        this.lastError = null;
        try {
            const current = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            const validationError = this._validationError({ ...current, ...data });
            if (validationError) return this._fail(null, validationError);

            const update = { ...data };
            if ('name' in update) update.name = update.name.trim();
            if ('discountPercentage' in update) {
                update.discountPercentage = Number(update.discountPercentage);
            }
            const sale = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: update,
            });
            return sale ? await this._syncSaleAlert(sale) : false;
        } catch (error) {
            return this._fail(error, 'Could not update the sale.');
        }
    }

    async deleteSale(rowId) {
        this.lastError = null;
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
            return true;
        } catch (error) {
            return this._fail(error, 'Could not delete the sale.');
        }
    }

    async getSale(rowId) {
        this.lastError = null;
        try {
            return await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
            });
        } catch (error) {
            return this._fail(error, 'Could not load the sale.');
        }
    }

    async getSales() {
        this.lastError = null;
        try {
            return await this._listAllRows([Query.orderDesc('$createdAt')]);
        } catch (error) {
            return this._fail(error, 'Could not load sales.');
        }
    }

    _validationError(data = {}) {
        const { name, startsAt, endsAt, discountPercentage } =
            data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        if (typeof name !== 'string' || !name.trim()) return 'A sale name is required.';

        const start = startsAt == null || startsAt === '' ? Number.NaN : new Date(startsAt).getTime();
        const end = endsAt == null || endsAt === '' ? Number.NaN : new Date(endsAt).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            return 'Valid sale start and end times are required.';
        }
        if (end <= start) return 'The sale end time must be after its start time.';

        const percentage = Number(discountPercentage);
        if (
            discountPercentage === null ||
            discountPercentage === '' ||
            !Number.isFinite(percentage) ||
            percentage < 0 ||
            percentage > 100
        ) {
            return 'The discount percentage must be between 0 and 100.';
        }
        return null;
    }

    async _listAllRows(extraQueries = []) {
        const rows = [];
        const pageSize = 100;
        let cursor = null;

        while (true) {
            const queries = [...extraQueries, Query.limit(pageSize)];
            if (cursor) queries.push(Query.cursorAfter(cursor));

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });

            if (!res?.rows?.length) break;
            rows.push(...res.rows);
            if (res.rows.length < pageSize) break;
            cursor = res.rows[res.rows.length - 1].$id;
        }
        return rows;
    }

    async _syncSaleAlert(sale) {
        if (!sale.makeAlert && !sale.alertId) return sale;

        try {
            if (!sale.makeAlert) {
                const deleted = await alertService.deleteAlert(sale.alertId);
                if (!deleted) return this._alertWarning(sale, alertService.lastError);
                const updated = await this.table.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: sale.$id,
                    data: { alertId: null },
                });
                return updated || this._alertWarning(sale, 'Could not clear the sale alert link.');
            }

            const endsAt = new Date(sale.endsAt);
            const formattedEnd = Number.isNaN(endsAt.getTime()) ? sale.endsAt : endsAt.toLocaleString();
            const alertData = {
                title: sale.name,
                message: `${sale.discountPercentage}% off on selected products. Valid until ${formattedEnd}.`,
                type: sale.type || 'promo',
                startsAt: sale.startsAt,
                endsAt: sale.endsAt,
                pages: ['products', 'product'],
                saleId: sale.$id,
            };

            if (sale.alertId) {
                const alert = await alertService.saveAlert(sale.alertId, alertData);
                return alert ? sale : this._alertWarning(sale, alertService.lastError);
            }

            const alert = await alertService.createAlert({
                ...alertData,
                status: 'active',
                popup: false,
            });
            if (!alert) return this._alertWarning(sale, alertService.lastError, 'create');

            try {
                const updated = await this.table.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    rowId: sale.$id,
                    data: { alertId: alert.$id },
                });
                return updated || this._alertWarning(sale, 'Could not link the alert to the sale.');
            } catch (error) {
                await alertService.deleteAlert(alert.$id);
                return this._alertWarning(sale, error.message);
            }
        } catch (error) {
            return this._alertWarning(sale, error.message);
        }
    }

    _alertWarning(sale, message, type = 'sync') {
        this.lastError = message || 'Sale saved, but the alert could not be synchronized.';
        return { ...sale, alertWarning: true, alertWarningType: type };
    }

    _fail(error, fallback) {
        this.lastError = error?.message || fallback;
        if (error) console.error(error.message);
        return false;
    }
}

const saleService = new SaleService();

export default saleService;
