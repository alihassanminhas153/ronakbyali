// Shared pieces for the drawer forms.
export const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-graph-1 ${
    err ? 'border-error' : 'border-border hover:border-graph-1/50'
  }`;

// as="div" when the child is a dropdown / date picker (a <label> would re-click its first button).
export function Field({ label, hint, error, optional, children, className = '', as: Tag = 'label' }) {
  return (
    <Tag className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-text">
        <span>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</span>
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
      <span className={`grid transition-all duration-200 ${error ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <span className="overflow-hidden text-xs text-error">{error}</span>
      </span>
    </Tag>
  );
}