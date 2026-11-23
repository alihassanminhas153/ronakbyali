import { useMemo } from 'react';

import SearchSelect from '../../ui/custom/input/SearchSelect';
import { toTitleCase } from '../../lib/textCase';

const normalise = (option) =>
  option !== null && typeof option === 'object' ? option : { value: option, label: String(option) };

export default function AdminSearchSelect({
  label,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select…',
  searchPlaceholder = 'Search options…',
  clearable = false,
  error,
  hint,
  disabled = false,
  required = false,
  size = 'md',
  align = 'auto',
  menuMinWidth = 224,
  visibleRows = 5,
  className = '',
  'aria-label': ariaLabel,
}) {
  const choices = useMemo(() => options.map(normalise), [options]);
  const choiceLabels = useMemo(() => {
    const labels = choices.map((choice) => toTitleCase(String(choice.label ?? choice.value ?? '')));
    const counts = new Map();
    labels.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
    const used = new Set();
    // Distinct option strings let selections map back to their original values even when labels repeat.
    return labels.map((item) => {
      if (counts.get(item) === 1 && !used.has(item)) {
        used.add(item);
        return item;
      }
      let suffix = 2;
      let unique = `${item} (${suffix})`;
      while (used.has(unique) || counts.has(unique)) {
        suffix += 1;
        unique = `${item} (${suffix})`;
      }
      used.add(unique);
      return unique;
    });
  }, [choices]);

  const selectedIndex = choices.findIndex((choice) => choice.value === value);
  const selectedValue = selectedIndex < 0
    ? toTitleCase(String(value ?? ''))
    : choiceLabels[selectedIndex];
  const errorMessage = typeof error === 'string' ? error : '';

  return (
    <div className={className}>
      {label && (
        <span className="mb-2 block text-[0.8rem] font-medium text-muted lg:text-sm">
          {label}
          {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
        </span>
      )}
      <SearchSelect
        aria-label={ariaLabel || label}
        options={choiceLabels}
        value={selectedValue}
        onChange={(next) => {
          const index = choiceLabels.indexOf(next);
          onChange?.(index < 0 ? next : choices[index].value);
        }}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        creatable={false}
        clearable={clearable}
        error={Boolean(error)}
        disabled={disabled}
        size={size}
        align={align}
        menuMinWidth={menuMinWidth}
        visibleRows={visibleRows}
      />
      {(errorMessage || hint) && (
        <p className={`mt-2 text-sm ${errorMessage ? 'text-error' : 'text-muted'}`}>
          {errorMessage || hint}
        </p>
      )}
    </div>
  );
}
