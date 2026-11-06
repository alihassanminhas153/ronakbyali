import productService from '../../../lib/appwrite/product';

// The ONE place that knows which fields the admin product form sends to the
// PRODUCTS table. If your Appwrite column names differ, change them here only.

export const STATUS_OPTIONS = [
  { value: 'inStock', label: 'In stock' },
  { value: 'outOfStock', label: 'Out of stock' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'order', label: 'Custom order' },
];

export const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const emptyForm = {
  name: '',
  slug: '',
  description: '',
  category: '',
  group: '',
  tags: [],
  originalPrice: '',
  discountPercentage: '',
  costPrice: '',
  totalAvailable: '',
  featured: false,
};

// product row -> form state (numbers become strings for the inputs)
export const productToForm = (p) => ({
  name: p.name || '',
  slug: p.slug || '',
  description: p.description || '',
  category: p.category || '',
  group: p.group || '',
  tags: Array.isArray(p.tags) ? p.tags : [],
  originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
  discountPercentage: p.discountPercentage ? String(p.discountPercentage) : '',
  costPrice: p.costPrice ? String(p.costPrice) : '',
  totalAvailable: p.totalAvailable != null ? String(p.totalAvailable) : '',
  featured: Boolean(p.featured),
});

// price after discount, rounded to a whole rupee
export const finalPrice = (originalPrice, discountPercentage) => {
  const original = Number(originalPrice) || 0;
  const pct = Number(discountPercentage) || 0;
  return pct > 0 ? Math.round(original * (1 - pct / 100)) : original;
};

export function validateForm(form, imageCount) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Enter the product name.';
  if (!form.category.trim()) errors.category = 'Choose or add a category.';
  if (!form.group.trim()) errors.group = 'Choose or add a group.';

  const original = Number(form.originalPrice);
  if (form.originalPrice === '' || !(original > 0)) errors.originalPrice = 'Enter a price above 0.';

  const pct = Number(form.discountPercentage || 0);
  if (pct < 0 || pct > 100) errors.discountPercentage = 'Use a value from 0 to 100.';

  if (form.costPrice !== '' && Number(form.costPrice) < 0) errors.costPrice = 'Cost cannot be negative.';

  const stock = Number(form.totalAvailable);
  if (form.totalAvailable === '' || !Number.isInteger(stock) || stock < 0) {
    errors.totalAvailable = 'Enter a whole number, 0 or more.';
  }
  if (imageCount < 1) errors.images = 'Add at least one image.';
  return errors;
}

// form state -> row data. prepareProductData (in product.js) then fills
// priceFormat, remaining and status.
export function buildPayload(form, { slug, imageIds, sold = 0 }) {
  const originalPrice = Number(form.originalPrice);
  const discountPercentage = Number(form.discountPercentage) || 0;
  const data = {
    name: form.name.trim(),
    slug,
    description: form.description.trim(),
    category: form.category.trim(),
    group: form.group.trim(),
    tags: form.tags,
    originalPrice,
    discountPercentage,
    price: finalPrice(originalPrice, discountPercentage),
    totalAvailable: Number(form.totalAvailable),
    sold,
    featured: form.featured,
    imageIds,
  };
  if (form.costPrice !== '') data.costPrice = Number(form.costPrice);
  return productService.prepareProductData(data);
}
