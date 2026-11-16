import ArtFrame from "./ArtFrame";

/* A clothes rail with garments swaying on hangers and a shopping bag. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.pr-sway { animation: pr-sway 3.8s ease-in-out infinite alternate; }
.pr-tag { animation: pr-tag 2.6s ease-in-out infinite alternate; }
@keyframes pr-sway { 0% { transform: rotate(-5deg); } 100% { transform: rotate(5deg); } }
@keyframes pr-tag { 0% { transform: rotate(-14deg); } 100% { transform: rotate(14deg); } }
`;

export default function ProductsArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A clothes rail with garments swaying on hangers and a shopping bag" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <path d="M40 56 H380" className="stroke-text" strokeWidth="7"/>
      <path d="M62 56 V26 M358 56 V26" className="stroke-text" strokeWidth="5"/>
      <g transform="translate(110 56)">
        <g className="pr-sway" style={{ animationDelay: "0s" }}>
          <g transform="translate(0 30) scale(0.28) translate(-400 -80)">
            <path d="M300 90 L344 70 C356 100 444 100 456 70 L500 90 L580 150 L544 204 L500 178 V420 H300 V178 L256 204 L220 150 Z" className="fill-accent stroke-text" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
          </g>
          <path d="M0 0 V12" className="stroke-text" strokeWidth="4"/>
          <path d="M0 12 L-30 34 H30 Z" className="stroke-text" strokeWidth="4"/>
        </g>
      </g>
      <g transform="translate(210 56)">
        <g className="pr-sway" style={{ animationDelay: "-1.4s" }}>
          <g transform="translate(0 30) scale(0.26) translate(-400 -80)">
            <path d="M300 90 L344 70 C356 100 444 100 456 70 L500 90 L572 140 L540 192 L500 168 V470 H300 V168 L260 192 L228 140 Z" className="fill-accent-soft stroke-text" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
          </g>
          <path d="M0 0 V12" className="stroke-text" strokeWidth="4"/>
          <path d="M0 12 L-30 34 H30 Z" className="stroke-text" strokeWidth="4"/>
        </g>
      </g>
      <g transform="translate(310 56)">
        <g className="pr-sway" style={{ animationDelay: "-2.6s" }}>
          <g transform="translate(0 30) scale(0.28) translate(-400 -80)">
            <path d="M300 90 L344 70 C356 100 444 100 456 70 L500 90 L580 150 L544 204 L500 178 V420 H300 V178 L256 204 L220 150 Z" className="fill-text stroke-text" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
          </g>
          <path d="M0 0 V12" className="stroke-text" strokeWidth="4"/>
          <path d="M0 12 L-30 34 H30 Z" className="stroke-text" strokeWidth="4"/>
        </g>
      </g>
      <g transform="translate(296 104)">
        <g className="pr-tag">
          <path d="M0 0 V14" className="stroke-text" strokeWidth="3"/>
          <rect x="-14" y="14" width="28" height="38" rx="6" className="fill-bg stroke-text" strokeWidth="3.5"/>
          <circle cy="23" r="3" className="fill-text"/>
          <path d="M-7 40 H7" className="stroke-accent" strokeWidth="4"/>
        </g>
      </g>
      <g transform="translate(338 214)">
        <g className="ar-bob">
          <path d="M14 0 C14 -20 42 -20 42 0" className="stroke-text" strokeWidth="4"/>
          <rect width="56" height="52" rx="6" className="fill-accent-soft stroke-text" strokeWidth="4.5"/>
          <circle cx="28" cy="30" r="8" className="fill-accent"/>
        </g>
      </g>
      <g transform="translate(40 130) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.3s" }}/>
      </g>
      <g transform="translate(392 110) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.4s" }}/>
      </g>
    </ArtFrame>
  );
}
