import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
// import cartReducer from "./slices/cartSlice";
// import ordersReducer from "./slices/ordersSlice";
// import productsReducer from "./slices/productsSlice";
// import uiReducer from "./slices/uiSlice";
// import wishlistReducer from "./slices/wishlistSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    // cart: cartReducer,
    // orders: ordersReducer,
    // products: productsReducer,
    // ui: uiReducer,
    // wishlist: wishlistReducer,
  },
});

export default store;
