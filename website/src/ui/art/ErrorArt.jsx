import ArtFrame from "./ArtFrame";

/* "Something went wrong": a browser window that has cracked and is shaking apart, with sparks, falling shards and a spinning loose gear. Animated and themed. Its class names share one short prefix (er-) so they cannot clash with yours. */
const CSS = `
.er-shake { animation: er-shake 4s ease-in-out infinite; transform-origin: 50% 100%; }
.er-crack { animation: er-glow 1.8s ease-in-out infinite alternate; }
.er-spark { animation: er-spark 1.6s ease-in-out infinite; }
.er-shard { animation: er-fall 2.8s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
.er-gear { animation: er-spin 9s linear infinite; transform-box: fill-box; transform-origin: center; }
@keyframes er-shake {
  0%, 68%, 100% { transform: translate(0, 0) rotate(0deg); }
  72% { transform: translate(-3px, 0) rotate(-1.2deg); }
  76% { transform: translate(3px, 0) rotate(1.2deg); }
  80% { transform: translate(-2px, 0) rotate(-0.8deg); }
  84% { transform: translate(2px, 0) rotate(0.8deg); }
  88% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes er-glow { 0% { opacity: 1; } 100% { opacity: 0.55; } }
@keyframes er-spark { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
@keyframes er-fall { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(4px, 14px) rotate(24deg); } }
@keyframes er-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .er-shake, .er-crack, .er-spark, .er-shard, .er-gear { animation: none; }
  .er-spark { opacity: 1; }
}
`;

export default function ErrorArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A browser window that has cracked and is shaking apart, with sparks and falling pieces" css={CSS} className={className} decorative={decorative}>
      {/* ground */}
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>

      {/* the broken window */}
      <g className="er-shake ar-box">
        <rect x="100" y="50" width="220" height="190" rx="14" className="fill-bg stroke-text" strokeWidth="8" fillOpacity="0.6"/>
        <path d="M100 84 H320" className="stroke-text" strokeWidth="6" opacity="0.5"/>
        <circle cx="122" cy="67" r="5" className="fill-accent"/>
        <circle cx="140" cy="67" r="5" className="stroke-text" strokeWidth="3" fill="none" opacity="0.5"/>
        <circle cx="158" cy="67" r="5" className="stroke-text" strokeWidth="3" fill="none" opacity="0.5"/>

        {/* warning mark on the left half */}
        <path d="M160 120 V172" className="stroke-text" strokeWidth="16" strokeLinecap="round"/>
        <path d="M160 204 V204" className="stroke-text" strokeWidth="18" strokeLinecap="round"/>

        {/* broken content lines on the right half */}
        <path d="M262 120 H300 M262 146 H292 M270 172 H304" className="stroke-text" strokeWidth="8" strokeLinecap="round" opacity="0.3"/>

        {/* the crack */}
        <path d="M230 84 L212 120 L242 142 L208 174 L236 202 L222 240" className="er-crack stroke-accent" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>

      {/* sparks at the top of the crack */}
      <g className="stroke-accent" strokeWidth="5" strokeLinecap="round">
        <path className="er-spark" d="M244 70 L258 56"/>
        <path className="er-spark" d="M252 84 L270 80" style={{ animationDelay: "-0.5s" }}/>
        <path className="er-spark" d="M214 66 L206 50" style={{ animationDelay: "-1.1s" }}/>
      </g>

      {/* falling pieces */}
      <path className="er-shard fill-accent" d="M326 214 L350 226 L330 242 Z"/>
      <path className="er-shard fill-accent" d="M84 222 L102 214 L98 238 Z" style={{ animationDelay: "-1.4s" }} opacity="0.7"/>

      {/* loose gear, top left */}
      <g transform="translate(52 66)">
        <g className="ar-bob">
          <g className="er-gear">
            <circle r="16" className="stroke-accent" strokeWidth="7" strokeDasharray="7 7.2" fill="none"/>
            <circle r="9" className="stroke-accent" strokeWidth="6" fill="none"/>
          </g>
        </g>
      </g>

      {/* error cross, top right */}
      <g transform="translate(346 48)">
        <g className="ar-float" style={{ animationDelay: "-1.2s" }}>
          <path d="M0 0 L22 22 M22 0 L0 22" className="stroke-accent" strokeWidth="6" strokeLinecap="round"/>
        </g>
      </g>
    </ArtFrame>
  );
}