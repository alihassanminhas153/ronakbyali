/* ==========================================================================
   DISCLAIMER ART: a screen and a fabric swatch with a wobbling "about equal" sign between them
   (colours and sizes can differ a little from what you see online), and a warning triangle on top
   that shakes now and then while its exclamation mark blinks.
   Loops every 5 seconds. Colours come from your theme. Class names start with "dc-".
   Reduced motion: no animation, you see the still picture.
   ========================================================================== */

const CSS = `
.dc-warn   { animation: dc-warn 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
.dc-bang   { animation: dc-bang 1.25s ease-in-out infinite; }
.dc-glow   { animation: dc-glow 5s ease-in-out infinite; }
.dc-swatch { animation: dc-sway 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
.dc-wave1  { animation: dc-wave 1.8s ease-in-out infinite; }
.dc-wave2  { animation: dc-wave 1.8s ease-in-out infinite reverse; }
.dc-ping   { animation: dc-ping 2.5s ease-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.dc-stitch { animation: dc-flow 1.2s linear infinite; }

@keyframes dc-warn  { 0%, 55%, 100% { transform: rotate(0deg) scale(1); } 60% { transform: rotate(-7deg) scale(1.06); } 65% { transform: rotate(6deg) scale(1.06); } 70% { transform: rotate(-4deg) scale(1.03); } 75% { transform: rotate(2deg); } 80% { transform: rotate(0deg); } }
@keyframes dc-bang  { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
@keyframes dc-glow  { 0%, 100% { opacity: 0; } 50% { opacity: 0.3; } }
@keyframes dc-sway  { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2.5deg); } }
@keyframes dc-wave  { 0%, 100% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
@keyframes dc-ping  { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(1.7); opacity: 0; } }
@keyframes dc-flow  { to { stroke-dashoffset: -16; } }

@media (prefers-reduced-motion: reduce) {
  .dc-root * { animation: none !important; }
  .dc-glow, .dc-ping { opacity: 0; }
}
`;

export default function DisclaimerArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 420 300"
      role="img"
      aria-label="A screen and a fabric swatch that look slightly different, with a warning sign above"
      className={`dc-root ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{CSS}</style>

      {/* ground line */}
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3" />

      {/* ---------- the screen ---------- */}
      <rect x="40" y="132" width="132" height="116" rx="12" className="fill-surface stroke-text" strokeWidth="5" />
      <rect x="52" y="144" width="108" height="78" rx="6" className="fill-accent" />
      <rect x="52" y="144" width="108" height="78" rx="6" className="dc-glow fill-bg" />
      <circle cx="106" cy="235" r="4" className="fill-text" />

      {/* ---------- the fabric swatch ---------- */}
      <g transform="translate(252 126)">
        <g className="dc-swatch">
          <rect width="126" height="118" rx="6" className="fill-accent stroke-text" strokeWidth="5" opacity="0.8" />
          <rect x="9" y="9" width="108" height="100" rx="3" className="dc-stitch stroke-bg" strokeWidth="3" strokeDasharray="8 8" />
          <path d="M0 0 V-14" className="stroke-text" strokeWidth="4" />
          <circle cx="0" cy="-18" r="4" className="fill-bg stroke-text" strokeWidth="3" />
        </g>
      </g>

      {/* ---------- "about equal" between them ---------- */}
      <g className="stroke-text" strokeWidth="5">
        <path className="dc-wave1" d="M186 176 q7 -9 14 0 t14 0 t14 0" />
        <path className="dc-wave2" d="M186 198 q7 -9 14 0 t14 0 t14 0" />
      </g>

      {/* ---------- warning triangle ---------- */}
      <g transform="translate(210 24)">
        <g className="dc-warn">
          <circle cx="0" cy="48" r="40" className="dc-ping fill-none stroke-accent" strokeWidth="3" />
          <path d="M0 0 L44 76 H-44 Z" className="fill-accent-soft stroke-text" strokeWidth="5" />
          <g className="dc-bang">
            <path d="M0 24 V49" className="stroke-text" strokeWidth="7" />
            <circle cx="0" cy="62" r="4.2" className="fill-text" />
          </g>
        </g>
      </g>
    </svg>
  );
}