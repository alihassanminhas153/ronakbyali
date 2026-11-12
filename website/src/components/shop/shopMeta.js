// Single place that knows how the shop filters are named and what the drawer offers.
// If productsSlice uses different field names or values, change them here only.
export const FILTER_KEYS = {
  search: 'searchTerm',
  category: 'category',
  group: 'group',
  status: 'status',
  min: 'minPrice',
  max: 'maxPrice',
  sort: 'sort',
};

export const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export const STATUS_OPTIONS = [
  { value: '', label: 'All products' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'out-of-stock', label: 'Out of stock' },
];

// Categories and groups may arrive as plain strings or as objects.
export function toOption(item) {
  if (item !== null && typeof item === 'object') {
    const value = item.value ?? item.name ?? item.$id ?? item.label;
    return { value, label: item.label ?? item.name ?? String(value) };
  }
  return { value: item, label: String(item) };
}

export const isSet = (value) => value !== null && value !== undefined && value !== '';

// How many of the filters that live inside the drawer are switched on.
export function drawerFilterCount(filters) {
  const K = FILTER_KEYS;
  return [filters[K.status], filters[K.sort], filters[K.min], filters[K.max]].filter(isSet).length;
}