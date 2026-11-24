import productService from './appwrite/product';

// Helpers for products whose images are different designs / styles.
//   product.hasDesigns   true when the images are different designs (false = same product, many photos)
//   product.imageIds[i]  the image of design i
//   product.designNames[i] its name ("Rose", "Navy blue"...)
// A customer's choice ("picks") is: [{ id: <imageId>, name, quantity }]

export const MAX_PER_DESIGN = 50;

export const needsDesignChoice = (product) =>
  Boolean(product?.hasDesigns) && (product?.imageIds || []).filter(Boolean).length > 1;

// [{ id, name, url }] in the order the admin set.
export function getDesigns(product) {
  if (!needsDesignChoice(product)) return [];
  const names = product.designNames || [];
  return product.imageIds
    .filter(Boolean)
    .map((id, i) => ({ id, name: String(names[i] || '').trim() || `Design ${i + 1}`, url: productService.getImageUrl(id) }));
}

export const picksTotal = (picks = []) => picks.reduce((sum, pick) => sum + (Number(pick.quantity) || 0), 0);

// Returns an error text, or '' when the picks are fine.
export function validatePicks(product, picks = []) {
  if (!needsDesignChoice(product)) return '';
  const designs = new Map(getDesigns(product).map((d) => [d.id, d]));
  if (!picks.length) return 'Choose at least one design.';
  for (const pick of picks) {
    if (!designs.has(pick.id)) return 'One of the chosen designs is no longer available. Please choose again.';
    const quantity = Number(pick.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PER_DESIGN) {
      return `Choose 1 to ${MAX_PER_DESIGN} pieces of each design.`;
    }
  }
  return '';
}

// Keeps only picks that still exist on the product (names refreshed).
export function cleanPicks(product, picks = []) {
  const designs = new Map(getDesigns(product).map((d) => [d.id, d]));
  return picks
    .filter((p) => designs.has(p.id) && Number(p.quantity) > 0)
    .map((p) => ({ id: p.id, name: designs.get(p.id).name, quantity: Math.min(MAX_PER_DESIGN, Math.floor(Number(p.quantity))) }));
}

// One cart / order line per design. `variant` is the design name and `designId` / `fileId`
// are the design's image, so carts, orders and the admin all show the right picture.
// Two designs of one product never merge, because the order service keys lines by
// productId + variant + price.
export function picksToLines(product, picks = []) {
  return picks.map((pick) => ({
    productId: product.$id,
    product,
    name: product.name,
    quantity: Number(pick.quantity) || 1,
    variant: pick.name,
    designId: pick.id,
    fileId: pick.id,
  }));
}

// "Rose x2, Navy x1"
export const describePicks = (picks = []) => picks.map((p) => `${p.name} x${p.quantity}`).join(', ');
