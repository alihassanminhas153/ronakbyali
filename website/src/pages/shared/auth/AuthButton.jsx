import { Loader2 } from 'lucide-react';

import GlowBorder from './Glowborder';

// Primary full-width submit button with a loading state and a glowing accent border.
export default function AuthButton({ loading = false, disabled = false, children, ...props }) {
  const off = disabled || loading;

  return (
    <GlowBorder active={!off}>
      <button
        type="submit"
        disabled={off}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-accent px-4 text-[0.95rem] font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed lg:h-12 lg:text-base"
        {...props}
      >
        {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    </GlowBorder>
  );
}