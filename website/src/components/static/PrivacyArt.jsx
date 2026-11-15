/* ==========================================================================
   PRIVACY ART: a shield with a lock. A scan beam sweeps down the shield, the lock opens
   and snaps shut, a tick badge draws itself, and a dotted ring with small dots orbits around.
   Loops every 6 seconds. Colours come from your theme. Class names start with "pv-".
   Reduced motion: no animation, you see the finished picture (locked, ticked).
   ========================================================================== */

const SHIELD = "M210 40 L298 72 V150 C298 205 258 244 210 262 C162 244 122 205 122 150 V72 Z";

const CSS = `
.pv-a { animation-duration: 6s; animation-iteration-count: infinite; animation-fill-mode: both; animation-timing-function: ease-in-out; }
.pv-box { transform-box: fill-box; transform-origin: 50% 50%; }

.pv-orbit  { animation: pv-spin 14s linear infinite; transform-origin: 210px 150px; }
.pv-ring   { animation: pv-flow 1.6s linear infinite; }
.pv-beam   { animation: pv-beam 3s ease-in-out infinite; }
.pv-shield { animation: pv-pulse 3s ease-in-out infinite; }
.pv-lock   { animation-name: pv-lock; }
.pv-tick   { animation-name: pv-tick; }
.pv-badge  { animation-name: pv-badge; }
.pv-key    { animation: pv-key 3s ease-in-out infinite; }

@keyframes pv-spin  { to { transform: rotate(360deg); } }
@keyframes pv-flow  { to { stroke-dashoffset: -28; } }
@keyframes pv-beam  { 0% { transform: translateY(-4px); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(232px); opacity: 0; } }
@keyframes pv-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
@keyframes pv-lock  { 0%, 18% { transform: translateY(-13px); } 34%, 100% { transform: translateY(0); } }
@keyframes pv-badge { 0%, 36% { transform: scale(0); } 46% { transform: scale(1.2); } 52%, 100% { transform: scale(1); } }
@keyframes pv-tick  { 0%, 44% { stroke-dashoffset: 1; } 62%, 100% { stroke-dashoffset: 0; } }
@keyframes pv-key   { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

@media (prefers-reduced-motion: reduce) {
  .pv-root * { animation: none !important; }
  .pv-beam { opacity: 0; }
}
`;

export default function PrivacyArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 420 300"
      role="img"
      aria-label="A shield with a lock, protecting your details"
      className={`pv-root ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{CSS}</style>

      <defs>
        <clipPath id="pv-shield-clip">
          <path d={SHIELD} />
        </clipPath>
      </defs>

      {/* orbiting ring and dots */}
      <g className="pv-orbit">
        <circle
          cx="210"
          cy="150"
          r="132"
          className="pv-ring stroke-text"
          strokeWidth="3"
          strokeDasharray="2 12"
          opacity="0.5"
        />
        <circle cx="210" cy="18" r="9" className="fill-accent stroke-text" strokeWidth="3" />
        <circle cx="342" cy="150" r="6" className="fill-text" />
        <circle cx="78" cy="150" r="7" className="fill-accent-soft stroke-text" strokeWidth="3" />
        <circle cx="210" cy="282" r="5" className="fill-text" />
      </g>

      {/* the shield, gently pulsing */}
      <g className="pv-shield pv-box">
        <path d={SHIELD} className="fill-surface stroke-text" strokeWidth="6" />
        <path
          d="M210 62 L280 86 V150 C280 192 250 224 210 240 C170 224 140 192 140 150 V86 Z"
          className="stroke-text"
          strokeWidth="3"
          strokeDasharray="4 8"
          opacity="0.45"
        />

        {/* scan beam, clipped to the shield */}
        <g clipPath="url(#pv-shield-clip)">
          <g className="pv-beam">
            <rect x="110" y="40" width="200" height="22" className="fill-accent" opacity="0.22" />
            <path d="M110 62 H310" className="stroke-accent" strokeWidth="4" />
          </g>
        </g>
      </g>

      {/* the lock */}
      <g>
        <g className="pv-a pv-lock">
          <path d="M193 144 V126 a17 17 0 0 1 34 0 V144" className="stroke-text" strokeWidth="6" />
        </g>
        <rect x="180" y="142" width="60" height="50" rx="9" className="fill-accent stroke-text" strokeWidth="5" />
        <g className="pv-key">
          <circle cx="210" cy="162" r="6" className="fill-on-accent" />
          <path d="M210 164 V176" className="stroke-on-accent" strokeWidth="5" />
        </g>
      </g>

      {/* tick badge */}
      <g transform="translate(296 82)">
        <g className="pv-a pv-badge pv-box">
          <circle r="24" className="fill-bg stroke-text" strokeWidth="5" />
          <path
            d="M-10 1 L-3 9 L11 -8"
            pathLength="1"
            strokeDasharray="1"
            className="pv-a pv-tick stroke-accent"
            strokeWidth="6"
          />
        </g>
      </g>
    </svg>
  );
}