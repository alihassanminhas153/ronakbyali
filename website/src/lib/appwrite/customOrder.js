import envVars from '../../../env/var';
import { Client, ID, Permission, Query, Role, TablesDB } from 'appwrite';
import { optimizeImage } from '../imageOptimizer';
import { getEffectivePricing } from '../saleMath';
import { getDeliveryChargesForLines } from '../orderDelivery';
import orderService, { DELIVERY_TYPES } from './order';
import productService from './product';

const CUSTOM_STATUSES = ['requested', 'contacted', 'confirmed', 'in_progress', 'ready', 'cancelled'];
const CONTACT_METHODS = ['whatsapp', 'call', 'email', 'other'];
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export class CustomOrderService {
    client = new Client();
    table;
    databaseId = envVars.ronakByAliDatabaseId;
    tableId = envVars.ronakByAliCustomOrders;
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

    parseOptions(product) {
        return parseJsonArray(product?.customOptions)
            .filter((option) => option && typeof option.id === 'string' && typeof option.label === 'string')
            .map((option) => ({ id: option.id, label: option.label, price: Number(option.price) || 0 }));
    }

    parseSelections(order) {
        return parseJsonArray(order?.customSelections)
            .filter((selection) => selection && typeof selection.id === 'string' && typeof selection.label === 'string')
            .map((selection) => ({ id: selection.id, label: selection.label, price: Number(selection.price) || 0 }));
    }

    priceSelection(product, selectedIds, quantity, sales = []) {
        this.lastError = null;
        const options = this.parseOptions(product);
        const ids = [...new Set(Array.isArray(selectedIds) ? selectedIds : [])];
        if (options.length && !ids.length) {
            return this._fail('Choose at least one customization.');
        }
        const selections = ids.map((id) => options.find((option) => option.id === id));
        if (selections.some((option) => !option)) {
            return this._fail('One of the selected customizations is no longer available.');
        }
        const count = Number(quantity);
        if (!Number.isInteger(count) || count < 1 || count > 50) {
            return this._fail('Choose a quantity between 1 and 50.');
        }
        const basePrice = Number(getEffectivePricing(product, sales).price);
        if (!Number.isFinite(basePrice) || basePrice < 0) return this._fail('This product does not have a valid price.');

        const optionUnit = selections.reduce((sum, option) => sum + option.price, 0);
        const unit = basePrice + optionUnit;
        return {
            unit,
            optionsTotal: optionUnit * count,
            subtotal: unit * count,
            selections,
        };
    }

    async uploadReferences(files = []) {
        this.lastError = null;
        const list = Array.from(files || []);
        if (list.length > 5) return this._fail('Choose no more than 5 reference images.');
        for (const file of list) {
            if (!IMAGE_TYPES.has(file.type)) return this._fail('Reference images must be JPG, PNG, or WebP files.');
            if (file.size > MAX_FILE_BYTES) return this._fail('Each reference image must be 5 MB or smaller.');
        }

        const uploaded = [];
        try {
            for (const file of list) {
                const optimized = await optimizeImage(file);
                const result = await productService.uploadImage(optimized);
                if (!result?.$id) throw new Error('Could not upload a reference image.');
                uploaded.push(result.$id);
            }
            return uploaded;
        } catch (error) {
            await Promise.allSettled(uploaded.map((id) => productService.deleteImage(id)));
            return this._fail(error.message || 'Could not upload reference images.', error);
        }
    }

    async placeCustomOrder({ profile, product, quantity, selectedIds = [], form = {}, files = [], sales = [] }) {
        this.lastError = null;
        let fileIds = [];
        let order = null;
        try {
            if (!profile?.$id) return this._fail('Please sign in to send a customization request.');
            if (!product?.$id || product.isCustom !== true) return this._fail('This product is not available for customization.');
            const pricing = this.priceSelection(product, selectedIds, quantity, sales);
            if (!pricing) return false;
            const deliveryType = form.deliveryType || 'regular';
            if (!DELIVERY_TYPES.includes(deliveryType)) return this._fail('Choose a valid delivery option.');

            const { data: details, error } = orderService._checkDetails({
                customerName: form.customerName || profile.name,
                customerPhone: form.customerPhone || profile.phone,
                customerEmail: form.customerEmail || profile.email,
                city: form.city,
                address: form.address,
                notes: form.notes,
            });
            if (error) return this._fail(error);

            const lines = [{ product, quantity: Number(quantity) }];
            const deliveryCharges = await getDeliveryChargesForLines(lines, pricing.subtotal);
            if (deliveryCharges === false || !Number.isFinite(Number(deliveryCharges))) {
                return this._fail('Could not calculate delivery charges. Please try again.');
            }
            const delivery = Number(deliveryCharges) || 0;
            fileIds = await this.uploadReferences(files);
            if (fileIds === false) return false;

            const customOrderId = ID.unique();
            order = await orderService.placeOrder({
                profile,
                custom: true,
                customOrderId,
                items: [{
                    productId: product.$id,
                    name: product.name,
                    price: pricing.unit,
                    quantity: Number(quantity),
                    fileId: product.imageIds?.[0] || null,
                }],
                form: {
                    ...details,
                    deliveryType,
                    deliveryCharges: delivery,
                    discount: 0,
                    advanceAmount: 0,
                    paymentMethod: 'bank_transfer',
                    notes: form.notes,
                    isCustom: true,
                    customDetails: String(form.notes || '').trim().slice(0, 1000),
                    customSelections: JSON.stringify(pricing.selections),
                    customFileIds: fileIds,
                    customFileId: fileIds[0] || null,
                },
            });
            if (!order) throw new Error(orderService.lastError || 'Could not place your customization request.');

            const customOrder = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: customOrderId,
                permissions: [Permission.read(Role.user(profile.$id))],
                data: {
                    orderId: order.$id,
                    orderNumber: order.orderNumber,
                    userId: profile.$id,
                    customerName: details.customerName,
                    customerPhone: details.customerPhone,
                    productId: product.$id,
                    productName: product.name,
                    quantity: Number(quantity),
                    selections: JSON.stringify(pricing.selections),
                    customerNote: String(form.notes || '').trim().slice(0, 1000) || null,
                    referenceFileIds: fileIds,
                    quotedTotal: pricing.subtotal + delivery,
                    status: 'requested',
                    isCustom: true,
                },
            });
            if (!customOrder?.$id) throw new Error('Could not save the custom-order details.');
            return { ...order, customization: customOrder.$id };
        } catch (error) {
            if (order) {
                const cancelled = await orderService.cancelFailedCustomOrder({
                    userId: profile.$id,
                    orderId: order.$id,
                });
                if (!cancelled) console.error(orderService.lastError || 'Could not cancel the incomplete custom order.');
            }
            if (fileIds.length) await Promise.allSettled(fileIds.map((id) => productService.deleteImage(id)));
            return this._fail(error.message || 'Could not place your customization request.', error);
        }
    }

    async getCustomOrders({ limit = 50, offset = 0, status } = {}) {
        this.lastError = null;
        try {
            const queries = [];
            if (status && CUSTOM_STATUSES.includes(status)) queries.push(Query.equal('status', status));
            queries.push(Query.orderDesc('$createdAt'), Query.limit(Math.min(100, Math.max(1, Number(limit) || 50))), Query.offset(Math.max(0, Number(offset) || 0)));
            const result = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries });
            return { rows: result.rows || [], total: result.total || 0 };
        } catch (error) {
            this._fail('Could not load custom orders.', error);
            return false;
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
            this._fail('Could not load the custom order details.', error);
            return false;
        }
    }

    async updateCustomOrder(rowId, patch = {}) {
        this.lastError = null;
        const allowed = {};
        if ('status' in patch) {
            if (!CUSTOM_STATUSES.includes(patch.status)) return this._fail('Choose a valid custom-order status.');
            allowed.status = patch.status;
        }
        if ('contactMethod' in patch) {
            if (patch.contactMethod && !CONTACT_METHODS.includes(patch.contactMethod)) return this._fail('Choose a valid contact method.');
            allowed.contactMethod = patch.contactMethod || null;
        }
        if ('contactedAt' in patch) {
            if (patch.contactedAt && Number.isNaN(new Date(patch.contactedAt).getTime())) return this._fail('Enter a valid contact date.');
            allowed.contactedAt = patch.contactedAt ? new Date(patch.contactedAt).toISOString() : null;
        }
        if ('quotedTotal' in patch) {
            const total = patch.quotedTotal === '' || patch.quotedTotal == null ? null : Number(patch.quotedTotal);
            if (total != null && (!Number.isFinite(total) || total < 0 || total > 999999999)) return this._fail('Enter a valid quoted total.');
            allowed.quotedTotal = total;
        }
        if ('adminNotes' in patch) {
            const notes = String(patch.adminNotes || '').trim();
            if (notes.length > 2000) return this._fail('Admin notes must be 2,000 characters or fewer.');
            allowed.adminNotes = notes || null;
        }
        if (!Object.keys(allowed).length) return this._fail('There are no custom-order changes to save.');
        try {
            return await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: allowed,
            });
        } catch (error) {
            this._fail('Could not update the custom order.', error);
            return false;
        }
    }

    getReferenceUrls(fileIds = []) {
        return (Array.isArray(fileIds) ? fileIds : []).map((id) => productService.getImageUrl(id)).filter(Boolean);
    }

    async deleteForOrder(orderId) {
        const custom = await this.getByOrderId(orderId);
        if (custom === false) return false;
        if (!custom) return true;
        try {
            await this.table.deleteRow({ databaseId: this.databaseId, tableId: this.tableId, rowId: custom.$id });
            return true;
        } catch (error) {
            this._fail('Could not delete the custom order.', error);
            return false;
        }
    }
}

const customOrderService = new CustomOrderService();
export default customOrderService;
