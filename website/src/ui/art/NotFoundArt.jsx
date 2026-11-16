import ArtFrame from "./ArtFrame";

/* A big 404 where the zero is an unravelling ring and a magnifying glass searches for the page. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.nf-ring { animation: nf-flow 2.4s linear infinite; }
.nf-digit { animation: nf-wob 3s ease-in-out infinite alternate; transform-origin: 50% 100%; }
.nf-scan { animation: nf-scan 5.5s ease-in-out infinite alternate; }
@keyframes nf-flow { to { stroke-dashoffset: -102; } }
@keyframes nf-wob { 0% { transform: rotate(-1.6deg); } 100% { transform: rotate(1.6deg); } }
@keyframes nf-scan { 0% { transform: translate(-125px, 6px) rotate(-8deg); } 50% { transform: translate(0, -16px) rotate(6deg); } 100% { transform: translate(125px, 6px) rotate(-8deg); } }
`;

export default function NotFoundArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A big 404 where the zero is an unravelling ring and a magnifying glass searches for the page" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <g className="stroke-text" strokeWidth="22" strokeLinejoin="round">
        <g className="nf-digit ar-box">
          <path d="M112 56 L46 170 H140 M112 56 V240"/>
        </g>
        <g className="nf-digit ar-box" style={{ animationDelay: "-1.5s" }}>
          <path d="M338 56 L272 170 H366 M338 56 V240"/>
        </g>
      </g>
      <ellipse cx="210" cy="148" rx="40" ry="90" className="nf-ring stroke-accent" strokeWidth="22" strokeDasharray="56 46" strokeLinecap="round"/>
      <g transform="translate(210 160)">
        <g className="nf-scan">
          <circle r="30" className="fill-bg stroke-text" strokeWidth="7" fillOpacity="0.6"/>
          <path d="M22 22 L52 52" className="stroke-text" strokeWidth="11"/>
          <path d="M-17 -14 q8 -10 18 -9" className="stroke-text" strokeWidth="4" opacity="0.4"/>
        </g>
      </g>
      <g transform="translate(50 42)">
        <g className="ar-bob">
          <path d="M0 0 q0 -16 16 -16 q16 0 16 13 q0 10 -16 15 v9" className="stroke-accent" strokeWidth="6" fill="none"/>
          <circle cx="16" cy="29" r="3.5" className="fill-accent"/>
        </g>
      </g>
      <g transform="translate(340 34)">
        <g className="ar-float" style={{ animationDelay: "-1.2s" }}>
          <path d="M0 0 q0 -16 16 -16 q16 0 16 13 q0 10 -16 15 v9" className="stroke-accent" strokeWidth="6" fill="none"/>
          <circle cx="16" cy="29" r="3.5" className="fill-accent"/>
        </g>
      </g>
    </ArtFrame>
  );
}
