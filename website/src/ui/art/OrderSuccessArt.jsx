import ArtFrame from "./ArtFrame";

/* Sealed parcel with a big tick and a delivery van: order placed. Animated and themed. Class prefix: os- */
const CSS = `
.os-van { animation: os-drive 3.6s ease-in-out infinite alternate; }
.os-pop { animation: os-pop 2.4s ease-in-out infinite alternate; transform-origin: 210px 120px; }
@keyframes os-drive { 0% { transform: translateX(-14px); } 100% { transform: translateX(14px); } }
@keyframes os-pop { 0% { transform: scale(0.92); } 100% { transform: scale(1.06); } }
`;

export default function OrderSuccessArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A sealed parcel with a tick and a delivery van, order placed" css={CSS} className={className} decorative={decorative}>
      <path d="M20 266 H400" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      {/* parcel */}
      <g className="os-pop ar-box">
        <rect x="150" y="60" width="120" height="120" rx="10" className="fill-accent-soft stroke-text" strokeWidth="5"/>
        <path d="M150 96 H270" className="stroke-text" strokeWidth="3" opacity="0.35"/>
        <path d="M210 60 V96" className="stroke-text" strokeWidth="5"/>
        <circle cx="210" cy="140" r="24" className="fill-accent stroke-text" strokeWidth="4"/>
        <path d="M198 140 L207 149 L224 131" className="stroke-on-accent" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
      {/* van */}
      <g className="os-van">
        <rect x="104" y="196" width="130" height="52" rx="8" className="fill-surface stroke-text" strokeWidth="4"/>
        <path d="M234 214 H268 L290 232 V248 H234Z" className="fill-accent stroke-text" strokeWidth="4" strokeLinejoin="round"/>
        <path d="M246 220 H264 L276 232 H246Z" className="fill-bg" opacity="0.8"/>
        <path d="M118 214 H200" className="stroke-text" strokeWidth="5" opacity="0.2" strokeLinecap="round"/>
        <circle cx="146" cy="252" r="12" className="fill-text"/>
        <circle cx="146" cy="252" r="4" className="fill-bg"/>
        <circle cx="262" cy="252" r="12" className="fill-text"/>
        <circle cx="262" cy="252" r="4" className="fill-bg"/>
      </g>
      {/* speed lines */}
      <path d="M40 220 H84" className="stroke-text" strokeWidth="4" opacity="0.25" strokeLinecap="round"/>
      <path d="M56 238 H96" className="stroke-text" strokeWidth="4" opacity="0.25" strokeLinecap="round"/>
      <g transform="translate(92 70)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0s" }}/>
      </g>
      <g transform="translate(330 90) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.8s" }}/>
      </g>
      <g transform="translate(350 160) scale(0.6)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.5s" }}/>
      </g>
    </ArtFrame>
  );
}