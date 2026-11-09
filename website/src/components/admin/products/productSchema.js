// Single source of truth for the product FORM <-> ronakbyali_products table.
//
// Editable columns : name, slug, description, category, group, tags, featured, order,
//                    originalPrice, discountPercentage, discountName, price, costPrice,
//                    priceAdvance, priceCOD, deliveryCharges, deliveryTime, deliveryFrom,
//                    totalAvailable, sold, imageIds
// Calculated       : priceFormat, remaining, status   (productService.prepareProductData)
// Managed elsewhere: reviewIds, reviewCount, ratingAverage (reviews), never edited here.

const str = (v) => (v == null ? '' : String(v));
const numOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const textOrNull = (v) => {
  const t = str(v).trim();
  return t ? t : null;
};

export const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Row (or nothing) -> form state. Numbers are kept as strings so inputs can be empty.
export function toForm(p) {
  return {
    name: str(p?.name),
    slug: str(p?.slug),
    description: str(p?.description),
    category: str(p?.category),
    group: str(p?.group),
    tags: Array.isArray(p?.tags) ? [...p.tags] : [],
    featured: Boolean(p?.featured),
    order: str(p?.order ?? 0),

    originalPrice: str(p?.originalPrice),
    discountPercentage: str(p?.discountPercentage ?? 0),
    discountName: str(p?.discountName),
    price: str(p?.price),
    costPrice: str(p?.costPrice),
    priceAdvance: str(p?.priceAdvance),
    priceCOD: str(p?.priceCOD),

    deliveryCharges: str(p?.deliveryCharges ?? 0),
    deliveryTime: str(p?.deliveryTime),
    deliveryFrom: str(p?.deliveryFrom),

    totalAvailable: str(p?.totalAvailable ?? 0),
    sold: str(p?.sold ?? 0),
  };
}

// What the price will be if the admin leaves "Final price" empty.
export function autoPrice(f) {
  const original = Number(f.originalPrice) || 0;
  const pct = Number(f.discountPercentage) || 0;
  return pct > 0 ? Math.round(original * (1 - pct / 100)) : original;
}

export function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Name is required.';
  if (f.name.length > 255) e.name = 'Max 255 characters.';
  if (f.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) e.slug = 'Use lowercase letters, numbers and dashes only.';
  if (!f.category.trim()) e.category = 'Category is required.';
  if (f.originalPrice === '' || Number(f.originalPrice) < 0) e.originalPrice = 'Enter the original price.';
  const pct = Number(f.discountPercentage);
  if (f.discountPercentage !== '' && (pct < 0 || pct > 100)) e.discountPercentage = 'Between 0 and 100.';
  ['price', 'costPrice', 'priceAdvance', 'priceCOD', 'deliveryCharges'].forEach((k) => {
    if (f[k] !== '' && Number(f[k]) < 0) e[k] = 'Cannot be negative.';
  });
  ['totalAvailable', 'sold', 'order'].forEach((k) => {
    if (f[k] !== '' && (!Number.isInteger(Number(f[k])) || Number(f[k]) < 0)) e[k] = 'Whole number, 0 or more.';
  });
  if (Number(f.sold) > Number(f.totalAvailable)) e.sold = 'Sold cannot be more than the total.';
  return e;
}

// Form state -> the `data` object for productService (imageIds are added by the caller).
export function toPayload(f) {
  return {
    name: f.name.trim(),
    slug: f.slug.trim(),
    description: textOrNull(f.description),
    category: f.category.trim(),
    group: textOrNull(f.group),
    tags: f.tags,
    featured: f.featured,
    order: numOrNull(f.order) ?? 0,

    originalPrice: Number(f.originalPrice) || 0,
    discountPercentage: numOrNull(f.discountPercentage) ?? 0,
    discountName: textOrNull(f.discountName),
    price: numOrNull(f.price) ?? autoPrice(f),
    costPrice: numOrNull(f.costPrice),
    priceAdvance: numOrNull(f.priceAdvance),
    priceCOD: numOrNull(f.priceCOD),

    deliveryCharges: numOrNull(f.deliveryCharges) ?? 0,
    deliveryTime: textOrNull(f.deliveryTime),
    deliveryFrom: textOrNull(f.deliveryFrom),

    totalAvailable: numOrNull(f.totalAvailable) ?? 0,
    sold: numOrNull(f.sold) ?? 0,
  };
}