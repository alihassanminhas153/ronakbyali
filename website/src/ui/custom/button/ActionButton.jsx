import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-alt',
  danger: 'bg-error text-white hover:opacity-90',
  ghost: 'text-muted hover:bg-surface-alt hover:text-text',
};
const SIZES = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[0.95rem]' };

// General button for dashboards. variant: primary | secondary | danger | ghost, size: sm | md.
export default function ActionButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
