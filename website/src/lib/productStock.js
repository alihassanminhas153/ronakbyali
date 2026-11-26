export function isProductOutOfStock(product) {
  if (product?.status === 'outOfStock') return true;
  if (product?.isCustom === true || product?.remaining == null) return false;

  const remaining = Number(product.remaining);
  return !Number.isFinite(remaining) || remaining <= 0;
}
