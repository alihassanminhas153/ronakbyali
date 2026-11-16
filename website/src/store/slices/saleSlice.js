import { createAsyncThunk, createEntityAdapter, createSelector, createSlice, isAnyOf } from '@reduxjs/toolkit';
import saleService from '../../lib/appwrite/sale';
import { getSaleStatus } from '../../lib/saleMath';

const isRow = (value) => Boolean(value) && typeof value === 'object' && typeof value.$id === 'string';

const adminThunk = (type, method, message) =>
    createAsyncThunk(type, async (args, { rejectWithValue }) => {
        const list = Array.isArray(args) ? args : args === undefined ? [] : [args];
        const result = await saleService[method](...list);
        return result ? result : rejectWithValue(message);
    });

export const fetchSales = createAsyncThunk('sales/fetchSales', async (_, { rejectWithValue }) => {
    const sales = await saleService.getSales();
    return sales || rejectWithValue('Could not load sales.');
});

export const addSale = adminThunk('sales/addSale', 'addSale', 'Could not create the sale.');
export const updateSale = adminThunk('sales/updateSale', 'updateSale', 'Could not update the sale.');
export const deleteSale = adminThunk('sales/deleteSale', 'deleteSale', 'Could not delete the sale.');

const adminThunks = [addSale, updateSale, deleteSale];
const adapter = createEntityAdapter({ selectId: (sale) => sale.$id });

const salesSlice = createSlice({
    name: 'sales',
    initialState: adapter.getInitialState({
        list: { status: 'idle', error: null },
        admin: { status: 'idle', error: null },
    }),
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSales.pending, (state) => {
                state.list.status = 'loading';
                state.list.error = null;
            })
            .addCase(fetchSales.fulfilled, (state, action) => {
                adapter.setAll(state, action.payload);
                state.list.status = 'succeeded';
            })
            .addCase(fetchSales.rejected, (state, action) => {
                state.list.status = 'failed';
                state.list.error = action.payload || action.error?.message || 'Could not load sales.';
            })
            .addCase(deleteSale.fulfilled, (state, action) => {
                const arg = action.meta.arg;
                const saleId = Array.isArray(arg) ? arg[0] : arg;
                adapter.removeOne(state, saleId);
            })
            .addMatcher(isAnyOf(addSale.fulfilled, updateSale.fulfilled), (state, action) => {
                if (isRow(action.payload)) adapter.upsertOne(state, action.payload);
            })
            .addMatcher(isAnyOf(...adminThunks.map((thunk) => thunk.pending)), (state) => {
                state.admin.status = 'loading';
                state.admin.error = null;
            })
            .addMatcher(isAnyOf(...adminThunks.map((thunk) => thunk.fulfilled)), (state) => {
                state.admin.status = 'succeeded';
            })
            .addMatcher(isAnyOf(...adminThunks.map((thunk) => thunk.rejected)), (state, action) => {
                state.admin.status = 'failed';
                state.admin.error = action.payload || action.error?.message || 'Sale action failed.';
            });
    },
});

export default salesSlice.reducer;

const selectEntities = (state) => state.sales.entities;
const selectIds = (state) => state.sales.ids;

export const selectSalesList = createSelector([selectEntities, selectIds], (entities, ids) =>
    ids.map((id) => entities[id]).filter(Boolean)
);
export const selectSaleById = (id) => (state) => state.sales.entities[id] ?? null;
export const selectSaleOptions = createSelector([selectSalesList], (sales) =>
    sales.map((sale) => ({
        value: sale.$id,
        label: `${sale.name} (${Number(sale.discountPercentage) || 0}%)`,
    }))
);
export const selectActiveSales = createSelector([selectSalesList], (sales) =>
    sales.filter((sale) => getSaleStatus(sale) === 'active')
);
export const selectSalesStatus = (state) => state.sales.list.status;
export const selectSalesError = (state) => state.sales.list.error;
export const selectSaleAdminStatus = (state) => state.sales.admin.status;
export const selectSaleAdminError = (state) => state.sales.admin.error;
