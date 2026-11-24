// src/lib/designPicks.js   (pure helpers, no imports)
//
// A "pick" is what the customer chose in the design chooser:
//   { imageId, name, quantity }
// A product with hasDesigns === true keeps one design per image:
//   imageIds[i]  <->  designNames[i]

export const hasDesigns = (product) =>
  product?.hasDesigns === true && (product.imageIds || []).filter(Boolean).length >= 2;

// [{ id, name }] in the product's image order. Empty when the product has no designs.
export const getDesigns = (product) => {
  if (!hasDesigns(product)) return [];
  const names = product.designNames || [];
  return product.imageIds
    .map((id, i) => ({ id, name: String(names[i] || `Design ${i + 1}`).trim() }))
    .filter((d) => d.id);
};

export const totalQty = (picks) => (picks || []).reduce((n, p) => n + (Number(p.quantity) || 0), 0);

// "Rose × 2, Blue × 1"
export const picksText = (picks) => (picks || []).map((p) => `${p.name} × ${p.quantity}`).join(', ');

// One order/cart line per design: the design name is the variant, the design image is its picture.
export const picksToLines = (product, picks) =>
  (picks || [])
    .filter((p) => p?.imageId && Number(p.quantity) > 0)
    .map((p) => ({
      productId: product.$id,
      quantity: Number(p.quantity),
      variant: p.name,
      designImageId: p.imageId,
    }));