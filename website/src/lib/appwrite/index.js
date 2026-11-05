import productService from './product';
import authService from './auth';
import userService from './user';
import orderService from './order';
import cartService from './cart';
import wishlistService from './wishlist';
import alertService from './alert';
import settingsService from './settings';
import layoutService from './layout';
import reviewService from './review';

// `service` is the old name for the products service, kept so existing
// imports like `import { service } from '.../appwrite'` keep working.
const service = productService;

export {
    service,
    productService,
    authService,
    userService,
    orderService,
    cartService,
    wishlistService,
    alertService,
    settingsService,
    layoutService,
    reviewService
};

// Constants for dropdowns, filters and checks in your UI.
export { ROLES, STAFF_ROLES, LOYAL_AFTER_ORDERS } from './user';
export { PRODUCT_STATUS } from './product';
export { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS, DELIVERY_TYPES } from './order';
export { ALERT_TYPES, ALERT_STATUS } from './alert';
export { DEFAULT_SETTINGS } from './settings';
export { SECTION_TYPES, DEFAULT_SECTIONS } from './layout';

export default {
    service,
    productService,
    authService,
    userService,
    orderService,
    cartService,
    wishlistService,
    alertService,
    settingsService,
    layoutService,
    reviewService
};