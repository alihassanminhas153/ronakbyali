import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import cartReducer from "./slices/cartSlice";
import ordersReducer from "./slices/ordersSlice";
import productsReducer from "./slices/productsSlice";
import uiReducer from "./slices/uiSlice";
import usersReducer from "./slices/userSlice";
import wishlistReducer from "./slices/wishlistSlice";
import alertsReducer from './slices/alertSlice';
import reviewsReducer from "./slices/reviewSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    orders: ordersReducer,
    products: productsReducer,
    ui: uiReducer,
    users: usersReducer,
    wishlist: wishlistReducer,
    alerts: alertsReducer,
    reviews: reviewsReducer,
  },
});

export default store;