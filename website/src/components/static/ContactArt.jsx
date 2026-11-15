/* ==========================================================================
   CONTACT ART: an envelope that opens and lets a letter slide out, a paper plane flying
   over it, and two chat bubbles that pop up (the first one "typing", the second one a reply).
   Loops every 7 seconds. Colours come from your theme. Class names start with "ct-".
   Reduced motion: no animation, you see the finished picture.
   ========================================================================== */

const CSS = `
.ct-a { animation-duration: 7s; animation-iteration-count: infinite; animation-fill-mode: both; animation-timing-function: ease-in-out; }
.ct-box { transform-box: fill-box; transform-origin: 50% 50%; }

.ct-flapFront { animation-name: ct-flapFront; transform-origin: 0 0; }
.ct-flapBack  { animation-name: ct-flapBack;  transform-origin: 0 0; }
.ct-letter    { animation-name: ct-letter; }
.ct-plane     { animation-name: ct-plane; }
.ct-b1        { animation-name: ct-b1; }
.ct-b2        { animation-name: ct-b2; }
.ct-trail     { animation: ct-flow 1.2s linear infinite; }
.ct-dot       { animation: ct-dot 1s ease-in-out infinite; }
.ct-heart     { animation: ct-heart 1.4s ease-in-out infinite; }

@keyframes ct-flapFront { 0%, 10% { transform: scaleY(1); opacity: 1; } 16% { transform: scaleY(0); opacity: 1; } 16.1%, 90% { transform: scaleY(0); opacity: 0; } 90.1% { transform: scaleY(0); opacity: 1; } 96%, 100% { transform: scaleY(1); opacity: 1; } }
@keyframes ct-flapBack  { 0%, 16% { transform: scaleY(0); opacity: 0; } 16.1% { transform: scaleY(0); opacity: 1; } 24%, 82% { transform: scaleY(-1); opacity: 1; } 89.9% { transform: scaleY(0); opacity: 1; } 90%, 100% { transform: scaleY(0); opacity: 0; } }
@keyframes ct-letter    { 0%, 22% { transform: translateY(0); } 40%, 72% { transform: translateY(-82px); } 86%, 100% { transform: translateY(0); } }
@keyframes ct-plane     { 0%, 4% { transform: translate(6px, 150px) rotate(-6deg); opacity: 0; } 10% { opacity: 1; } 45% { transform: translate(120px, 56px) rotate(-30deg); opacity: 1; } 78% { transform: translate(262px, 6px) rotate(-14deg); opacity: 1; } 84%, 100% { transform: translate(300px, -10px) rotate(-10deg); opacity: 0; } }
@keyframes ct-b1        { 0%, 38% { transform: scale(0); opacity: 0; } 46% { transform: scale(1.12); opacity: 1; } 50%, 90% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(0); opacity: 0; } }
@keyframes ct-b2        { 0%, 56% { transform: scale(0); opacity: 0; } 64% { transform: scale(1.12); opacity: 1; } 68%, 90% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(0); opacity: 0; } }
@keyframes ct-flow      { to { stroke-dashoffset: -20; } }
@keyframes ct-dot       { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ct-heart     { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }

@media (prefers-reduced-motion: reduce) {
  .ct-root * { animation: none !important; }
  .ct-flapFront { opacity: 0; }
  .ct-plane { opacity: 0; }
  .ct-letter { transform: translateY(-82px); }
  .ct-flapBack { transform: scaleY(-1); }
}
`;

export default function ContactArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 420 300"
      role="img"
      aria-label="An envelope opening, a paper plane and chat bubbles"
      className={`ct-root ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{CSS}</style>

      {/* ground shadow */}
      <ellipse cx="190" cy="284" rx="104" ry="8" className="fill-text" opacity="0.12" />

      {/* dotted flight trail for the plane */}
      <path
        d="M20 150 C 90 150 130 70 250 40"
        className="ct-trail stroke-text"
        strokeWidth="3"
        strokeDasharray="2 10"
        opacity="0.45"
      />

      {/* inside of the envelope */}
      <rect x="90" y="140" width="200" height="130" rx="10" className="fill-accent-soft stroke-text" strokeWidth="5" />

      {/* flap, open position (behind the letter) */}
      <g transform="translate(190 140)">
        <path d="M-100 0 L0 66 L100 0 Z" className="ct-a ct-flapBack fill-accent stroke-text" strokeWidth="5" />
      </g>

      {/* the letter that slides out */}
      <g className="ct-a ct-letter">
        <rect x="112" y="158" width="156" height="100" rx="8" className="fill-bg stroke-text" strokeWidth="4" />
        <path d="M130 184 H250 M130 204 H250 M130 224 H210" className="stroke-text" strokeWidth="4" opacity="0.4" />
        <path
          d="M236 236 C226 227 230 218 236 223 C242 218 246 227 236 236Z"
          className="ct-heart ct-box fill-accent stroke-accent"
          strokeWidth="2"
        />
      </g>

      {/* front pocket */}
      <path d="M90 140 L190 206 L290 140 V260 a10 10 0 0 1 -10 10 H100 a10 10 0 0 1 -10 -10 Z" className="fill-surface stroke-text" strokeWidth="5" />
      <path d="M96 266 L168 214 M284 266 L212 214" className="stroke-text" strokeWidth="4" opacity="0.4" />

      {/* flap, closed position (in front of everything) */}
      <g transform="translate(190 140)">
        <path d="M-100 0 L0 66 L100 0 Z" className="ct-a ct-flapFront fill-accent stroke-text" strokeWidth="5" />
      </g>

      {/* paper plane */}
      <g className="ct-a ct-plane">
        <path d="M0 0 L46 -16 L14 8 Z" className="fill-bg stroke-text" strokeWidth="4" />
        <path d="M14 8 L18 22 L28 6" className="fill-accent stroke-text" strokeWidth="4" />
      </g>

      {/* bubble 1: someone typing */}
      <g transform="translate(305 60)">
        <g className="ct-a ct-b1" style={{ transformOrigin: "20px 52px" }}>
          <rect width="100" height="52" rx="16" className="fill-surface stroke-text" strokeWidth="4" />
          <path d="M22 52 L14 70 L40 52" className="fill-surface stroke-text" strokeWidth="4" />
          <path d="M25 52 H36" className="stroke-surface" strokeWidth="6" strokeLinecap="butt" />
          {[28, 50, 72].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy="26"
              r="5.5"
              className="ct-dot ct-box fill-text"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </g>
      </g>

      {/* bubble 2: the reply */}
      <g transform="translate(322 150)">
        <g className="ct-a ct-b2" style={{ transformOrigin: "74px 44px" }}>
          <rect width="84" height="44" rx="14" className="fill-accent stroke-text" strokeWidth="4" />
          <path d="M62 44 L70 60 L48 44" className="fill-accent stroke-text" strokeWidth="4" />
          <path d="M51 44 H59" className="stroke-accent" strokeWidth="6" strokeLinecap="butt" />
          <path d="M26 23 L38 33 L58 13" className="stroke-on-accent" strokeWidth="5" />
        </g>
      </g>
    </svg>
  );
}