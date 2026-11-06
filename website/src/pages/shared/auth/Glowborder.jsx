// A light that travels around the border of whatever it wraps.
//
// HOW TO CUSTOMISE (no other file needs to change)
//   1. Edit GLOW_DEFAULTS below. Every button that uses <GlowBorder /> follows it.
//   2. Or pass the same names as props to a single use, e.g.
//        <GlowBorder color="#22d3ee" direction="counterclockwise" duration={2}>
//
//   color      'accent'            -> the theme accent colour (follows dark/light theme)
//              '#22d3ee' / 'hsl(...)' / 'var(--anything)' -> any CSS colour
//              ['#f43f5e', '#f59e0b', '#22d3ee'] -> a multi-colour light
//   direction  'clockwise' | 'counterclockwise'
//   duration   seconds for one full lap. Smaller = faster (1.5 fast, 3 normal, 8 slow)
//   arc        length of the light in degrees (30 = short spark, 120 = long tail)
//   thickness  border thickness in px
//   halo       soft glow outside the border: 0 = off, 1 = strong (brightens on hover)
//   haloBlur   how far the halo spreads, in px
//   track      strength (0-100) of the faint ring that stays visible under the light

export const GLOW_DEFAULTS = {
  color: 'accent',
  direction: 'clockwise',
  duration: 3.2,
  arc: 85,
  thickness: 2,
  halo: 0.6,
  haloBlur: 7,
  track: 28,
};

// Own keyframes and rules, so nothing depends on Tailwind's `spin` being generated.
const CSS = `
@keyframes glow-orbit { to { transform: rotate(360deg); } }
.glow-halo { opacity: var(--glow-halo); transition: opacity .25s; }
.glow-wrap:hover .glow-halo { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .glow-sweep { animation: none !important; } }
`;

// Builds the rotating gradient. The light fades in over `arc` degrees and ends with a
// sharp tail at the top, so it reads as a comet moving around the border.
function buildGradient(colors, arc) {
  const peak = 335;
  const start = Math.max(0, peak - Math.min(Math.max(arc, 10), 320));
  const list = colors.map((c) => (c === 'accent' ? 'currentColor' : c));

  let stops;
  if (list.length === 1) {
    stops = `${list[0]} ${peak}deg`;
  } else {
    const from = start + (peak - start) * 0.2;
    stops = list
      .map((c, i) => `${c} ${(from + ((peak - from) * i) / (list.length - 1)).toFixed(1)}deg`)
      .join(', ');
  }

  return `conic-gradient(from 0deg, transparent 0deg, transparent ${start}deg, ${stops}, transparent 360deg)`;
}

function Sweep({ gradient, duration, direction }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span
        className="glow-sweep aspect-square w-[220%] shrink-0"
        style={{
          background: gradient,
          animation: `glow-orbit ${duration}s linear infinite ${direction === 'counterclockwise' ? 'reverse' : 'normal'}`,
        }}
      />
    </span>
  );
}

export default function GlowBorder({ active = true, className = '', children, ...options }) {
  const { color, direction, duration, arc, thickness, halo, haloBlur, track } = {
    ...GLOW_DEFAULTS,
    ...options,
  };

  const colors = Array.isArray(color) ? color : [color];
  const gradient = buildGradient(colors, arc);
  const first = colors[0] === 'accent' ? 'currentColor' : colors[0];
  const sweepProps = { gradient, duration, direction };

  return (
    <div
      className={`glow-wrap relative rounded-md text-accent transition-opacity ${active ? '' : 'opacity-60'} ${className}`}
      style={{ '--glow-halo': halo }}
    >
      <style>{CSS}</style>

      {/* soft halo that bleeds outside the button */}
      {active && halo > 0 && (
        <span
          className="glow-halo pointer-events-none absolute -inset-px overflow-hidden rounded-md"
          style={{ filter: `blur(${haloBlur}px)` }}
        >
          <Sweep {...sweepProps} />
        </span>
      )}

      {/* faint track + the bright moving light */}
      <span
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
        style={{ background: `color-mix(in srgb, ${first} ${track}%, transparent)` }}
      >
        {active && <Sweep {...sweepProps} />}
      </span>

      {/* the padding is the visible border */}
      <div className="relative" style={{ padding: thickness }}>
        {children}
      </div>
    </div>
  );
}