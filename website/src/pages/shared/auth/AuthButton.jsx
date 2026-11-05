import { Loader2 } from 'lucide-react';

// Primary full-width submit button with a loading state.
export default function AuthButton({ loading = false, disabled = false, children, ...props }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 text-[0.95rem] font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}