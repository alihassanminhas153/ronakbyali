export const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-accent-tone-1 ${
    err ? 'border-error' : 'border-border hover:border-accent-tone-1/50'
  }`;
