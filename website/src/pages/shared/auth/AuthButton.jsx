import { Loader2 } from 'lucide-react';

import GlowBorder from './GlowBorder';

// Glow for the main submit button. Edit these values and save: only this button changes.
// Anything you leave out falls back to GLOW_DEFAULTS in GlowBorder.jsx.
const GLOW = {
  color: 'accent',        // 'accent' | '#22d3ee' | ['#f43f5e', '#f59e0b', '#22d3ee']
  direction: 'clockwise', // 'clockwise' | 'counterclockwise'
  duration: 3.2,          // seconds per lap, smaller = faster
  // arc: 85, thickness: 2, halo: 0.6, haloBlur: 7, track: 28,
};

// Primary full-width submit button with a loading state and a glowing border.
// A one-off override is also possible: <AuthButton glow={{ color: 'red', duration: 1.5 }}>
export default function AuthButton({ loading = false, disabled = false, glow, children, ...props }) {
  const off = disabled || loading;

  return (
    <GlowBorder active={!off} {...GLOW} {...glow}>
      <button
        type="submit"
        disabled={off}
        className="flex cursor-pointer h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-accent px-4 text-[0.95rem] font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed lg:h-12 lg:text-base"
        {...props}
      >
        {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    </GlowBorder>
  );
}