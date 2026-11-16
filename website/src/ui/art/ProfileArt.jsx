import ArtFrame from "./ArtFrame";

/* A profile card with an avatar, a pencil writing and a verified badge. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.pf-write { animation: pf-write 3.2s ease-in-out infinite alternate; }
.pf-pen { animation: pf-pen 3.2s ease-in-out infinite alternate; }
@keyframes pf-write { 0% { stroke-dashoffset: 1; opacity: 0; } 4% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }
@keyframes pf-pen { 0% { transform: translateX(0); } 100% { transform: translateX(116px); } }
`;

export default function ProfileArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A profile card with an avatar, a pencil writing and a verified badge" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <defs>
        <clipPath id="pf-clip">
          <circle cx="140" cy="126" r="37"/>
        </clipPath>
      </defs>
      <rect x="70" y="54" width="280" height="180" rx="18" className="fill-surface stroke-text" strokeWidth="5"/>
      <circle cx="140" cy="126" r="40" className="fill-accent-soft stroke-text" strokeWidth="5"/>
      <g clipPath="url(#pf-clip)">
        <path d="M98 176 C98 140 182 140 182 176 Z" className="fill-accent stroke-text" strokeWidth="4"/>
      </g>
      <g className="ar-bob">
        <circle cx="140" cy="112" r="15" className="fill-bg stroke-text" strokeWidth="4"/>
      </g>
      <path d="M196 100 H316" className="stroke-text" strokeWidth="10" opacity="0.85"/>
      <path d="M196 124 H296" className="stroke-text" strokeWidth="6" opacity="0.25"/>
      <path d="M196 148 H312" className="stroke-text" strokeWidth="6" opacity="0.2"/>
      <path d="M196 148 H312" pathLength="1" strokeDasharray="1" className="pf-write stroke-accent" strokeWidth="6"/>
      <rect x="92" y="196" width="74" height="24" rx="12" className="fill-accent-soft stroke-text" strokeWidth="3"/>
      <rect x="176" y="196" width="104" height="24" rx="12" className="fill-surface stroke-text" strokeWidth="3"/>
      <g transform="translate(196 148)">
        <g className="pf-pen">
          <g transform="rotate(-40)">
            <rect x="14" y="-7" width="58" height="14" className="fill-accent stroke-text" strokeWidth="3.5"/>
            <path d="M0 0 L14 -7 V7 Z" className="fill-bg stroke-text" strokeWidth="3.5" strokeLinejoin="round"/>
            <rect x="72" y="-7" width="10" height="14" rx="2" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
          </g>
        </g>
      </g>
      <g transform="translate(344 60)">
        <g className="ar-pulse ar-box">
          <circle r="19" className="fill-accent stroke-text" strokeWidth="4"/>
          <path d="M-8 1 l6 6 l11 -13" className="stroke-on-accent" strokeWidth="4.5"/>
        </g>
      </g>
      <g transform="translate(40 90) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.2s" }}/>
      </g>
      <g transform="translate(392 214) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.2s" }}/>
      </g>
    </ArtFrame>
  );
}
