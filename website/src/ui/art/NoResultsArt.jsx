import ArtFrame from "./ArtFrame";

/* An empty open box with a magnifying glass searching and nothing found. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.nr-scan { animation: nr-scan 4.4s ease-in-out infinite alternate; }
.nr-ghost { animation: nr-ghost 3.6s ease-out infinite; }
@keyframes nr-scan { 0% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-70px, 20px) rotate(-8deg); } 100% { transform: translate(-130px, 4px) rotate(0deg); } }
@keyframes nr-ghost { 0% { transform: translateY(8px); opacity: 0; } 20% { opacity: 0.8; } 100% { transform: translateY(-46px); opacity: 0; } }
`;

export default function NoResultsArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="An empty open box with a magnifying glass searching and nothing found" css={CSS} className={className} decorative={decorative}>
      <ellipse cx="190" cy="258" rx="108" ry="8" className="fill-text" opacity="0.12"/>
      <g transform="translate(190 118)">
        <g className="nr-ghost">
          <g transform="scale(0.15) translate(-400 -245)">
            <path d="M300 90 L344 70 C356 100 444 100 456 70 L500 90 L580 150 L544 204 L500 178 V420 H300 V178 L256 204 L220 150 Z" className="stroke-text" strokeWidth="3.5" strokeDasharray="6 6" vectorEffect="non-scaling-stroke"/>
          </g>
        </g>
      </g>
      <g transform="translate(190 118)">
        <g className="nr-ghost" style={{ animationDelay: "1.8s" }}>
          <g transform="scale(0.15) translate(-400 -245)">
            <path d="M300 90 L344 70 C356 100 444 100 456 70 L500 90 L580 150 L544 204 L500 178 V420 H300 V178 L256 204 L220 150 Z" className="stroke-text" strokeWidth="3.5" strokeDasharray="6 6" vectorEffect="non-scaling-stroke"/>
          </g>
        </g>
      </g>
      <path d="M112 150 L84 134 L108 106 L136 118 Z" className="fill-surface stroke-text" strokeWidth="4.5" strokeLinejoin="round"/>
      <path d="M268 150 L296 134 L272 106 L244 118 Z" className="fill-surface stroke-text" strokeWidth="4.5" strokeLinejoin="round"/>
      <path d="M112 150 L136 118 H244 L268 150 Z" className="fill-surface-alt stroke-text" strokeWidth="5" strokeLinejoin="round"/>
      <rect x="112" y="150" width="156" height="96" rx="4" className="fill-surface stroke-text" strokeWidth="5"/>
      <rect x="176" y="150" width="28" height="38" className="fill-accent-soft stroke-text" strokeWidth="3"/>
      <rect x="132" y="204" width="52" height="24" rx="3" className="fill-bg stroke-text" strokeWidth="3"/>
      <path d="M140 213 H176 M140 221 H164" className="stroke-text" strokeWidth="3" opacity="0.4"/>
      <g transform="translate(300 132)">
        <g className="nr-scan">
          <circle r="33" className="fill-bg stroke-text" strokeWidth="7" fillOpacity="0.65"/>
          <path d="M-9 -7 q0 -11 10 -11 q10 0 10 9 q0 7 -10 10 v6" className="stroke-accent" strokeWidth="5" fill="none"/>
          <circle cx="1" cy="16" r="3.2" className="fill-accent"/>
          <path d="M24 24 L54 54" className="stroke-text" strokeWidth="11"/>
        </g>
      </g>
      <g transform="translate(60 80) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.2s" }}/>
      </g>
      <g transform="translate(372 232) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.2s" }}/>
      </g>
      <g transform="translate(50 200) scale(0.7)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "2s" }}/>
      </g>
    </ArtFrame>
  );
}
