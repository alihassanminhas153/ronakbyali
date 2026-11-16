import ArtFrame from "./ArtFrame";

/* Clipboard order form with fields being filled, a tick and a small parcel. Animated and themed. Class prefix: of- */
const CSS = `
.of-line { stroke-dasharray: 100; animation: of-fill 3s ease-in-out infinite alternate; }
.of-tick { stroke-dasharray: 40; animation: of-tick 3s ease-in-out infinite alternate; }
@keyframes of-fill { 0% { stroke-dashoffset: 100; } 100% { stroke-dashoffset: 0; } }
@keyframes of-tick { 0%, 40% { stroke-dashoffset: 40; } 100% { stroke-dashoffset: 0; } }
`;

export default function OrderFormArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A clipboard order form with filled fields and a parcel" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      {/* clipboard */}
      <rect x="96" y="34" width="210" height="226" rx="16" className="fill-surface stroke-text" strokeWidth="5"/>
      <rect x="160" y="22" width="82" height="26" rx="8" className="fill-accent stroke-text" strokeWidth="4"/>
      <circle cx="201" cy="35" r="4" className="fill-bg"/>
      {/* fields */}
      <path d="M120 82 H168" className="stroke-text" strokeWidth="5" opacity="0.35" strokeLinecap="round"/>
      <rect x="120" y="92" width="162" height="24" rx="6" className="fill-bg stroke-text" strokeWidth="3"/>
      <path d="M130 104 H228" pathLength="100" className="of-line stroke-accent" strokeWidth="4" strokeLinecap="round"/>
      <path d="M120 136 H168" className="stroke-text" strokeWidth="5" opacity="0.35" strokeLinecap="round"/>
      <rect x="120" y="146" width="162" height="24" rx="6" className="fill-bg stroke-text" strokeWidth="3"/>
      <path d="M130 158 H200" pathLength="100" className="of-line stroke-accent" strokeWidth="4" strokeLinecap="round" style={{ animationDelay: "0.4s" }}/>
      <path d="M120 190 H168" className="stroke-text" strokeWidth="5" opacity="0.35" strokeLinecap="round"/>
      <rect x="120" y="200" width="76" height="24" rx="6" className="fill-bg stroke-text" strokeWidth="3"/>
      <rect x="206" y="200" width="76" height="24" rx="6" className="fill-bg stroke-text" strokeWidth="3"/>
      {/* submit button */}
      <rect x="120" y="234" width="162" height="18" rx="9" className="fill-accent stroke-text" strokeWidth="3"/>
      {/* checkbox tick */}
      <g transform="translate(262 62)">
        <circle r="16" className="fill-accent stroke-text" strokeWidth="4"/>
        <path d="M-7 1 L-2 6 L8 -5" pathLength="40" className="of-tick stroke-on-accent" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
      {/* parcel */}
      <g className="ar-float">
        <rect x="316" y="170" width="68" height="60" rx="6" className="fill-accent-soft stroke-text" strokeWidth="4"/>
        <path d="M316 190 H384" className="stroke-text" strokeWidth="3" opacity="0.4"/>
        <path d="M350 170 V190" className="stroke-text" strokeWidth="4"/>
        <path d="M326 210 H344" className="stroke-text" strokeWidth="4" opacity="0.3" strokeLinecap="round"/>
      </g>
      <g transform="translate(50 80)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.5s" }}/>
      </g>
      <g transform="translate(386 100) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.4s" }}/>
      </g>
    </ArtFrame>
  );
}