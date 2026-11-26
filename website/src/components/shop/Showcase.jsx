// src/components/shop/Showcase.js
//
// Picks the products for the "On sale" and "Popular" rows of the shop page from rows that are
// already in the store (productsSlice.fetchAllProducts). Pure functions, no network.

import { getEffectivePricing } from '../../lib/saleMath';
import { isProductOutOfStock } from '../../lib/productStock';

// Where a product keeps its all-time order count. The first of these that holds a number
// above zero is used. If your column has another name, add it here (this is the only place).
export const ORDER_COUNT_FIELDS = ['orderCount', 'ordersCount', 'totalOrders', 'soldCount', 'totalSold', 'sold', 'salesCount'];

export function getOrderCount(product) {
  for (const field of ORDER_COUNT_FIELDS) {
    const n = Number(product?.[field]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// Products with an active sale or a price drop, biggest discount first. Sold-out products are left out.
export function getDiscountedProducts(products, sales) {
  const rows = [];
  for (const product of products) {
    if (!product || isProductOutOfStock(product)) continue;
    const pricing = getEffectivePricing(product, sales);
    const hasDrop = pricing.originalPrice > pricing.price && pricing.price > 0;
    const share = hasDrop ? 1 - pricing.price / pricing.originalPrice : (Number(pricing.discountPercentage) || 0) / 100;
    if (pricing.sale || hasDrop || share > 0) rows.push({ product, share });
  }
  return rows.sort((a, b) => b.share - a.share).map((row) => row.product);
}

// The most ordered products of all time (only those that have at least one order), best first.
export function getPopularProducts(products, limit = 4) {
  return products
    .filter((product) => product && !isProductOutOfStock(product))
    .map((product) => ({ product, orders: getOrderCount(product) }))
    .filter((row) => row.orders > 0)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit)
    .map((row) => row.product);
}