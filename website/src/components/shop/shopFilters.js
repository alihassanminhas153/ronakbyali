// Helpers for the public products page. The filter keys match productsSlice:
// category, group, status, minPrice, maxPrice, sortBy, searchTerm.

export const PAGE_SIZE = 12; // productsSlice loads 12 per page

// The storefront has no "order" sort; that one is for the admin panel.
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
];

export const AVAILABILITY_OPTIONS = [
  { value: 'inStock', label: 'In stock' },
  { value: 'outOfStock', label: 'Out of stock' },
];

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);
const STATUS_VALUES = AVAILABILITY_OPTIONS.map((option) => option.value);

// '' / null / junk -> null, otherwise a non-negative number.
export function toNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

// { name: count } from fetchCategories / fetchGroups -> select options.
export const toOptions = (items) =>
  Object.entries(items || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ value: name, label: `${name} (${count})` }));

// URL -> filters. Lets a shared link, a reload and the Back button from a product
// page restore the same list.
export function fromParams(params) {
  const status = params.get('status');
  const sort = params.get('sort');
  return {
    searchTerm: params.get('q') || '',
    category: params.get('category') || null,
    group: params.get('group') || null,
    status: STATUS_VALUES.includes(status) ? status : null,
    minPrice: toNum(params.get('min')),
    maxPrice: toNum(params.get('max')),
    sortBy: SORT_VALUES.includes(sort) ? sort : 'newest',
  };
}

// filters -> URL (defaults are left out to keep links short).
export function toParams(filters) {
  const params = new URLSearchParams();
  const term = (filters.searchTerm || '').trim();
  if (term) params.set('q', term);
  if (filters.category) params.set('category', filters.category);
  if (filters.group) params.set('group', filters.group);
  if (filters.status) params.set('status', filters.status);
  if (filters.minPrice != null) params.set('min', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('max', String(filters.maxPrice));
  if (filters.sortBy && filters.sortBy !== 'newest') params.set('sort', filters.sortBy);
  return params;
}

// Anything that narrows the list (sorting does not).
export const isNarrowed = (f) =>
  Boolean(
    (f.searchTerm || '').trim() ||
      f.category ||
      f.group ||
      f.status ||
      f.minPrice != null ||
      f.maxPrice != null
  );

// Narrowing filters or a non-default sort: when the Clear button is useful.
export const hasActiveFilters = (f) => isNarrowed(f) || (f.sortBy && f.sortBy !== 'newest');