import ArtFrame from "./ArtFrame";

/* A shopping cart with items dropping in. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.ca-drop { animation: ca-drop 4.6s ease-in infinite; }
.ca-spin { animation: ca-spin 1.6s linear infinite; }
.ca-speed { animation: ca-speed 1.4s ease-in-out infinite; }
@keyframes ca-drop { 0% { transform: translateY(-130px); opacity: 0; } 10% { opacity: 1; } 24% { transform: translateY(8px); opacity: 1; } 30% { transform: translateY(0); } 84% { transform: translateY(0); opacity: 1; } 94%, 100% { transform: translateY(0); opacity: 0; } }
@keyframes ca-spin { to { transform: rotate(360deg); } }
@keyframes ca-speed { 0% { transform: translateX(10px); opacity: 0; } 50% { opacity: 0.5; } 100% { transform: translateX(-10px); opacity: 0; } }
`;

export default function CartArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A shopping cart with items dropping in" css={CSS} className={className} decorative={decorative}>
      <ellipse cx="230" cy="262" rx="120" ry="8" className="fill-text" opacity="0.12"/>
      <path d="M18 150 H40" className="ca-speed stroke-text" strokeWidth="4" style={{ animationDelay: "0s" }}/>
      <path d="M10 172 H36" className="ca-speed stroke-text" strokeWidth="4" style={{ animationDelay: "0.35s" }}/>
      <path d="M22 194 H44" className="ca-speed stroke-text" strokeWidth="4" style={{ animationDelay: "0.7s" }}/>
      <g transform="translate(190 84)">
        <g className="ca-drop">
          <g transform="scale(0.22) translate(-400 -245)">
            <path d="M300 90 L344 70 C356 100 444 100 456 70 L500 90 L580 150 L544 204 L500 178 V420 H300 V178 L256 204 L220 150 Z" className="fill-accent stroke-text" strokeWidth="5" vectorEffect="non-scaling-stroke"/>
          </g>
        </g>
      </g>
      <g transform="translate(256 92)">
        <g className="ca-drop" style={{ animationDelay: "0.45s" }}>
          <path d="M-10 -20 C-10 -36 10 -36 10 -20" className="stroke-text" strokeWidth="4"/>
          <rect x="-22" y="-20" width="44" height="48" rx="5" className="fill-accent-soft stroke-text" strokeWidth="4.5"/>
        </g>
      </g>
      <g transform="translate(312 96)">
        <g className="ca-drop" style={{ animationDelay: "0.9s" }}>
          <path d="M0 26 C-34 2 -30 -26 -10 -26 C-2 -26 0 -18 0 -14 C0 -18 2 -26 10 -26 C30 -26 34 2 0 26 Z" transform="scale(0.8)" className="fill-accent stroke-text" strokeWidth="4"/>
        </g>
      </g>
      <path d="M46 64 H88 L104 100" className="stroke-text" strokeWidth="5"/>
      <path d="M134 188 L142 206 H312 L318 188" className="stroke-text" strokeWidth="5"/>
      <path d="M104 100 H344 L318 188 H134 Z" className="fill-surface stroke-text" strokeWidth="5"/>
      <path d="M150 118 L160 176 M190 118 V176 M230 118 V176 M270 118 V176 M310 118 L300 176" className="stroke-text" strokeWidth="3" opacity="0.18"/>
      <path d="M162 206 V218 M296 206 V218" className="stroke-text" strokeWidth="5"/>
      <g transform="translate(162 232)">
        <g className="ca-spin ar-box">
          <circle r="14" className="fill-bg stroke-text" strokeWidth="5"/>
          <path d="M-8 0 H8 M0 -8 V8" className="stroke-accent" strokeWidth="3"/>
        </g>
      </g>
      <g transform="translate(296 232)">
        <g className="ca-spin ar-box">
          <circle r="14" className="fill-bg stroke-text" strokeWidth="5"/>
          <path d="M-8 0 H8 M0 -8 V8" className="stroke-accent" strokeWidth="3"/>
        </g>
      </g>
      <g transform="translate(368 56) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.2s" }}/>
      </g>
      <g transform="translate(60 236) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.3s" }}/>
      </g>
    </ArtFrame>
  );
}
