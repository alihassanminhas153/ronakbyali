/* ==========================================================================
   FAQ ART: a sleeping cat on a folded cloth, drawn as an inline SVG.
   - The belly breathes, the Zs float up and fade, the orange arrow bobs, the tail sways.
   - Colours come from your theme (text, bg, accent), so light and dark both work.
   - Reduced motion: your global rule in index.css already stops the animations.
   Class names start with "fq-" so they cannot clash with anything else.
   ========================================================================== */

const CSS = `
.fq-breathe { transform-box: fill-box; transform-origin: 50% 100%; animation: fq-breathe 3.6s ease-in-out infinite; }
.fq-tail { transform-box: fill-box; transform-origin: 0% 100%; animation: fq-tail 4.8s ease-in-out infinite; }
.fq-arrow { animation: fq-bob 1.8s ease-in-out infinite; }
.fq-z { transform-box: fill-box; transform-origin: 50% 50%; opacity: 0; animation: fq-z 3.6s ease-in infinite; }
.fq-z2 { animation-delay: 1.2s; }
.fq-z3 { animation-delay: 2.4s; }
@keyframes fq-breathe { 0%,100% { transform: scale(1, 1); } 50% { transform: scale(1.015, 1.045); } }
@keyframes fq-tail { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(7deg); } }
@keyframes fq-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(9px); } }
@keyframes fq-z {
  0% { opacity: 0; transform: translate(0, 10px) scale(0.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(14px, -34px) scale(1.15); }
}
`;

export default function FaqArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 420 270"
      role="img"
      aria-label="A cat sleeping on a folded cloth"
      className={className}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{CSS}</style>

      {/* ground line */}
      <path d="M14 248 H406" className="stroke-text" strokeWidth="5" />
      <path d="M40 262 H120 M170 262 H300" className="stroke-text" strokeWidth="4" opacity="0.5" />

      {/* folded cloth under the cat */}
      <path d="M46 244 L58 216 H372 L388 244 Z" className="fill-accent-soft stroke-text" strokeWidth="5" />
      <path d="M58 216 L72 232 H360 L372 216" className="stroke-text" strokeWidth="4" opacity="0.6" />

      {/* tail */}
      <g className="fq-tail">
        <path d="M352 206 C398 206 410 168 386 146" className="stroke-text" strokeWidth="16" />
        <path d="M352 206 C398 206 410 168 386 146" className="stroke-bg" strokeWidth="6" />
      </g>

      {/* body, breathing */}
      <g className="fq-breathe">
        <path
          d="M64 206 C54 158 112 122 206 122 C300 122 362 156 356 206 C352 218 330 218 206 218 C100 218 70 218 64 206 Z"
          className="fill-bg stroke-text"
          strokeWidth="5"
        />
        {/* a patch on the back */}
        <path d="M236 128 C270 124 312 134 330 156 C300 160 262 156 236 128 Z" className="fill-text" />
      </g>

      {/* head */}
      <path d="M58 140 L56 98 L88 120 Z" className="fill-bg stroke-text" strokeWidth="5" />
      <path d="M118 120 L148 98 L146 142 Z" className="fill-bg stroke-text" strokeWidth="5" />
      <ellipse cx="102" cy="160" rx="50" ry="42" className="fill-bg stroke-text" strokeWidth="5" />
      <path d="M62 124 L58 100 L80 116 Z" className="fill-text" />
      {/* closed eyes, nose, mouth */}
      <path d="M78 160 q10 9 20 0" className="stroke-text" strokeWidth="4.5" />
      <path d="M108 160 q10 9 20 0" className="stroke-text" strokeWidth="4.5" />
      <path d="M97 174 h12 l-6 7 Z" className="fill-accent stroke-accent" strokeWidth="2" />
      <path d="M103 181 v5 M103 186 q-7 5 -13 0 M103 186 q7 5 13 0" className="stroke-text" strokeWidth="3.5" />
      {/* paw tucked under the chin */}
      <path d="M104 206 q18 -10 36 0" className="fill-bg stroke-text" strokeWidth="5" />

      {/* floating Zs */}
      <g className="stroke-text" strokeWidth="5">
        <path className="fq-z" d="M122 84 h18 l-18 20 h18" />
        <path className="fq-z fq-z2" d="M152 62 h22 l-22 24 h22" />
        <path className="fq-z fq-z3" d="M186 36 h26 l-26 28 h26" />
      </g>

      {/* orange arrow pointing at the cat's belly, with a hard shadow like a sticker */}
      <g className="fq-arrow">
        <g transform="translate(246 58)">
          <path d="M-16 -36 H16 V-2 H34 L0 40 L-34 -2 H-16 Z" transform="translate(5 6)" className="fill-text" />
          <path
            d="M-16 -36 H16 V-2 H34 L0 40 L-34 -2 H-16 Z"
            className="fill-accent stroke-text"
            strokeWidth="4"
          />
        </g>
      </g>
    </svg>
  );
}