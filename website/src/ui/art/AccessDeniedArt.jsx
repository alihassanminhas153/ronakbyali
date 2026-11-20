/* ==========================================================================
   ACCESS DENIED ART: a locked door with a padlock, a no-entry sign and a rejected ID card.
   - The padlock rattles every few seconds, the sign swings on its post, the ID card floats,
     little sparkles twinkle.
   - Colours come from your theme (text, bg, surface, accent), so light and dark both work.
   - Reduced motion: no animation, you see the still drawing.
   Class names start with "ad-" so they cannot clash with anything else.
   ========================================================================== */

const SPARKLE = "M0 -12 Q1 -1 12 0 Q1 1 0 12 Q-1 1 -12 0 Q-1 -1 0 -12Z";

const CSS = `
.ad-lock { transform-box: fill-box; transform-origin: 50% 100%; animation: ad-rattle 4.5s ease-in-out infinite; }
.ad-sign { transform-box: fill-box; transform-origin: 50% 0%; animation: ad-sway 5s ease-in-out infinite; }
.ad-card { transform-box: fill-box; transform-origin: 50% 50%; animation: ad-float 3.2s ease-in-out infinite; }
.ad-spark { transform-box: fill-box; transform-origin: 50% 50%; animation: ad-twinkle 2.6s ease-in-out infinite; }
@keyframes ad-rattle {
  0%, 52%, 100% { transform: rotate(0deg); }
  56% { transform: rotate(-9deg); }
  60% { transform: rotate(8deg); }
  64% { transform: rotate(-6deg); }
  68% { transform: rotate(4deg); }
  72% { transform: rotate(0deg); }
}
@keyframes ad-sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@keyframes ad-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
@keyframes ad-twinkle { 0%, 100% { transform: scale(0.35) rotate(0deg); opacity: 0.2; } 50% { transform: scale(1) rotate(45deg); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .ad-lock, .ad-sign, .ad-card, .ad-spark { animation: none !important; }
  .ad-spark { opacity: 0.8; transform: scale(0.7); }
}
`;

export default function AccessDeniedArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 420 270"
      role="img"
      aria-label="A locked door with a padlock and a no-entry sign"
      className={className}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{CSS}</style>

      {/* ground line */}
      <path d="M14 248 H406" className="stroke-text" strokeWidth="5" />
      <path d="M40 262 H120 M170 262 H300" className="stroke-text" strokeWidth="4" opacity="0.5" />

      {/* door frame + door */}
      <path d="M126 248 V92 Q126 42 176 42 H244 Q294 42 294 92 V248" className="stroke-text" strokeWidth="5" />
      <path d="M142 248 V96 Q142 58 180 58 H240 Q278 58 278 96 V248 Z" className="fill-accent-soft stroke-text" strokeWidth="5" />

      {/* door panels */}
      <g className="stroke-text" strokeWidth="3" opacity="0.45">
        <rect x="162" y="80" width="42" height="50" rx="6" />
        <rect x="216" y="80" width="42" height="50" rx="6" />
        <rect x="162" y="208" width="42" height="28" rx="6" />
        <rect x="216" y="208" width="42" height="28" rx="6" />
      </g>
      {/* hinges */}
      <rect x="136" y="92" width="9" height="20" rx="3" className="fill-text" />
      <rect x="136" y="188" width="9" height="20" rx="3" className="fill-text" />

      {/* padlock that rattles */}
      <g className="ad-lock">
        <path d="M192 164 V150 a18 18 0 0 1 36 0 V164" className="stroke-text" strokeWidth="7" />
        <rect x="184" y="162" width="52" height="46" rx="9" className="fill-accent stroke-text" strokeWidth="5" />
        <circle cx="210" cy="181" r="6" className="fill-text" />
        <path d="M210 184 V195" className="stroke-text" strokeWidth="5" />
      </g>

      {/* no-entry sign on a post */}
      <path d="M68 250 V160" className="stroke-text" strokeWidth="6" />
      <g transform="translate(68 126)">
        <g className="ad-sign">
          <circle r="36" className="fill-accent stroke-text" strokeWidth="5" />
          <rect x="-23" y="-8" width="46" height="16" rx="5" className="fill-bg" />
        </g>
      </g>

      {/* trail from the ID card to the door */}
      <path d="M318 126 C298 124 300 148 284 158" className="stroke-text" strokeWidth="3" strokeDasharray="6 9" opacity="0.5" />

      {/* rejected ID card */}
      <g transform="translate(350 104) rotate(10)">
        <g className="ad-card">
          <rect x="-36" y="-26" width="72" height="52" rx="8" className="fill-bg stroke-text" strokeWidth="4" />
          <circle cx="-17" cy="-5" r="8" className="fill-accent-soft stroke-text" strokeWidth="3" />
          <path d="M-8 22 Q-17 10 -26 22" className="stroke-text" strokeWidth="3" opacity="0.5" />
          <path d="M2 -10 H24 M2 2 H20" className="stroke-text" strokeWidth="3" opacity="0.55" />
          <circle cx="28" cy="20" r="14" className="fill-accent stroke-text" strokeWidth="3" />
          <path d="M23 15 L33 25 M33 15 L23 25" className="stroke-bg" strokeWidth="4" />
        </g>
      </g>

      {/* sparkles */}
      {[
        { x: 104, y: 52, d: "0s" },
        { x: 332, y: 46, d: "0.9s" },
        { x: 392, y: 190, d: "1.7s" },
        { x: 30, y: 196, d: "0.4s" },
      ].map((s) => (
        <g key={s.x} transform={`translate(${s.x} ${s.y})`}>
          <path d={SPARKLE} className="ad-spark fill-accent" style={{ animationDelay: s.d }} />
        </g>
      ))}
    </svg>
  );
}
