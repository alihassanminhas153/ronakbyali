// 
// A light that travels around the border of whatever it wraps, in the theme accent colour.
//
// `text-accent` makes `currentColor` equal the accent variable from your theme, so no CSS
// variable name is hard-coded here and it follows any theme change (dark/light included).
// Needs no extra CSS: the spin comes from Tailwind's built-in `spin` keyframes, and it
// stops for people who have "reduce motion" turned on.

const SWEEP =
  'conic-gradient(from 0deg, transparent 0deg, transparent 250deg, currentColor 335deg, transparent 360deg)';

function Sweep() {
  return (
    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span
        className="aspect-square w-[220%] shrink-0 motion-safe:animate-[spin_3.2s_linear_infinite]"
        style={{ background: SWEEP }}
      />
    </span>
  );
}

export default function GlowBorder({ active = true, className = '', children }) {
  return (
    <div className={`group relative rounded-md text-accent transition-opacity ${active ? '' : 'opacity-60'} ${className}`}>
      {/* soft halo that bleeds outside the button */}
      {active && (
        <span className="pointer-events-none absolute -inset-px overflow-hidden rounded-md opacity-60 blur-[7px] transition-opacity group-hover:opacity-100">
          <Sweep />
        </span>
      )}

      {/* faint track + the bright moving light */}
      <span
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
        style={{ background: 'color-mix(in srgb, currentColor 28%, transparent)' }}
      >
        {active && <Sweep />}
      </span>

      {/* the 2px of padding is the visible border */}
      <div className="relative p-[2px]">{children}</div>
    </div>
  );
}