import ArtFrame from "./ArtFrame";

/* Dashboard cards with growing bars and a ring chart. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.ov-bar { animation: ov-grow 2.6s ease-in-out infinite alternate; transform-origin: 50% 100%; }
.ov-ring { animation: ov-ring 3.2s ease-in-out infinite alternate; }
@keyframes ov-grow { 0% { transform: scaleY(0.25); } 100% { transform: scaleY(1); } }
@keyframes ov-ring { 0% { stroke-dasharray: 14 100; } 100% { stroke-dasharray: 74 100; } }
`;

export default function OverviewArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="Dashboard cards with growing bars and a ring chart" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <rect x="50" y="40" width="320" height="214" rx="16" className="fill-surface stroke-text" strokeWidth="5"/>
      <path d="M50 80 H370" className="stroke-text" strokeWidth="3" opacity="0.2"/>
      <circle cx="74" cy="60" r="5" className="fill-accent"/>
      <circle cx="92" cy="60" r="5" className="fill-text"/>
      <circle cx="110" cy="60" r="5" className="fill-accent-soft stroke-text" strokeWidth="2"/>
      <path d="M70 226 H222" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <rect x="78" y="186" width="22" height="40" rx="4" className="ov-bar ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "0.0s" }}/>
      <rect x="106" y="156" width="22" height="70" rx="4" className="ov-bar ar-box fill-accent stroke-text" strokeWidth="3" style={{ animationDelay: "0.18s" }}/>
      <rect x="134" y="174" width="22" height="52" rx="4" className="ov-bar ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "0.36s" }}/>
      <rect x="162" y="126" width="22" height="100" rx="4" className="ov-bar ar-box fill-accent stroke-text" strokeWidth="3" style={{ animationDelay: "0.54s" }}/>
      <rect x="190" y="142" width="22" height="84" rx="4" className="ov-bar ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "0.72s" }}/>
      <circle cx="298" cy="150" r="40" className="stroke-border" strokeWidth="18"/>
      <circle cx="298" cy="150" r="40" pathLength="100" className="ov-ring stroke-accent" strokeWidth="18" strokeLinecap="round" strokeDasharray="68 100" transform="rotate(-90 298 150)"/>
      <circle cx="298" cy="150" r="21" className="fill-bg stroke-text" strokeWidth="3"/>
      <g className="ar-float">
        <path d="M298 160 V142 M290 150 L298 142 L306 150" className="stroke-accent" strokeWidth="4"/>
      </g>
      <path d="M252 216 H344" className="stroke-text" strokeWidth="6" opacity="0.2"/>
      <path d="M252 234 H316" className="stroke-text" strokeWidth="6" opacity="0.2"/>
      <g transform="translate(366 46)">
        <g className="ar-float">
          <circle r="22" className="fill-accent stroke-text" strokeWidth="4"/>
          <path d="M-8 5 L0 -6 L8 5" className="stroke-on-accent" strokeWidth="5"/>
        </g>
      </g>
      <g transform="translate(30 90) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0s" }}/>
      </g>
      <g transform="translate(396 206) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.1s" }}/>
      </g>
    </ArtFrame>
  );
}
