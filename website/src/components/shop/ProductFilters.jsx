import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import ActionButton from '../../ui/custom/button/ActionButton';
import SearchInput from '../../ui/custom/input/SearchInput';
import SelectInput from '../../ui/custom/input/SelectInput';
import { AVAILABILITY_OPTIONS, SORT_OPTIONS, toNum, toOptions } from './shopFilters';

// TextInput is a fixed tall field, so the two price boxes use the same classes as
// SearchInput (size sm) to line up with the selects.
const FIELD =
  'h-10 w-32 rounded-md border border-border bg-bg px-3 text-sm text-text outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15';

function PriceField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD}
      />
    </label>
  );
}

// Applies the price range 500 ms after the last keystroke. The parent changes
// `key` to reset it when the filters are cleared.
function PriceFilter({ minPrice, maxPrice, onChange }) {
  const [min, setMin] = useState(minPrice ?? '');
  const [max, setMax] = useState(maxPrice ?? '');
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const id = setTimeout(() => onChange({ minPrice: toNum(min), maxPrice: toNum(max) }), 500);
    return () => clearTimeout(id);
    // onChange is intentionally left out: only typing should restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);

  return (
    <>
      <PriceField label="Min price" value={min} onChange={setMin} />
      <PriceField label="Max price" value={max} onChange={setMax} />
    </>
  );
}

// filters / categories / groups / priceRange come straight from productsSlice.
//   onChange(patch)    -> setProductFilters + fetchProducts (page owns it)
//   onCategory(name)   -> also clears the group and reloads the group list
//   onClear()          -> reset everything
export default function ProductFilters({
  filters,
  categories,
  groups,
  priceRange,
  active,
  searching = false,
  resetKey = 0,
  onChange,
  onCategory,
  onClear,
}) {
  const categoryOptions = useMemo(() => toOptions(categories), [categories]);
  const groupOptions = useMemo(() => toOptions(groups), [groups]);
  const hasRange = Number(priceRange?.max) > 0;

  return (
    <div className="space-y-3">
      <SearchInput
        size="sm"
        delay={300}
        value={filters.searchTerm}
        onSearch={(searchTerm) => onChange({ searchTerm })}
        loading={searching}
        placeholder="Search name, category, tags"
        label="Search products"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectInput
          size="sm"
          aria-label="Filter by category"
          placeholder="All categories"
          options={categoryOptions}
          value={filters.category || ''}
          onChange={(category) => onCategory(category || null)}
          searchable
          clearable
        />
        <SelectInput
          size="sm"
          aria-label="Filter by group"
          placeholder="All groups"
          options={groupOptions}
          value={filters.group || ''}
          onChange={(group) => onChange({ group: group || null })}
          searchable
          clearable
        />
        <SelectInput
          size="sm"
          aria-label="Filter by availability"
          placeholder="Any availability"
          options={AVAILABILITY_OPTIONS}
          value={filters.status || ''}
          onChange={(status) => onChange({ status: status || null })}
          clearable
        />
        <SelectInput
          size="sm"
          aria-label="Sort products"
          options={SORT_OPTIONS}
          value={filters.sortBy}
          onChange={(sortBy) => onChange({ sortBy: sortBy || 'newest' })}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <PriceFilter
          key={resetKey}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onChange={onChange}
        />
        {hasRange && (
          <p className="pb-2.5 text-xs text-muted">
            Prices run from {productService.formatPrice(priceRange.min)} to{' '}
            {productService.formatPrice(priceRange.max)}
          </p>
        )}
        {active && (
          <ActionButton variant="ghost" size="sm" icon={RotateCcw} onClick={onClear} className="ml-auto">
            Clear filters
          </ActionButton>
        )}
      </div>
    </div>
  );
}