import ArtFrame from "./ArtFrame";

/* A card swiping into a payment terminal while a receipt prints. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.ck-card { animation: ck-card 4.4s ease-in-out infinite; }
.ck-key { animation: ck-key 3s ease-in-out infinite; }
.ck-receipt { animation: ck-receipt 4.4s ease-in-out infinite; }
.ck-check { animation: ck-check 4.4s ease-in-out infinite; }
@keyframes ck-card { 0%, 8% { transform: translateY(0); } 38%, 58% { transform: translateY(46px); } 88%, 100% { transform: translateY(0); } }
@keyframes ck-key { 0%, 20%, 100% { transform: scale(1); } 10% { transform: scale(1.3); } }
@keyframes ck-receipt { 0%, 10% { transform: translateY(-130px); } 45%, 86% { transform: translateY(0); } 100% { transform: translateY(-130px); } }
@keyframes ck-check { 0%, 35% { stroke-dashoffset: 1; opacity: 0; } 36% { opacity: 1; } 55%, 90% { stroke-dashoffset: 0; opacity: 1; } 96%, 100% { stroke-dashoffset: 0; opacity: 0; } }
`;

export default function CheckoutArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A card swiping into a payment terminal while a receipt prints" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <defs>
        <clipPath id="ck-clip">
          <rect x="256" y="112" width="140" height="160"/>
        </clipPath>
      </defs>
      <g className="ck-card">
        <rect x="134" y="14" width="74" height="46" rx="7" className="fill-accent stroke-text" strokeWidth="4"/>
        <rect x="134" y="26" width="74" height="10" className="fill-text"/>
      </g>
      <rect x="96" y="70" width="150" height="190" rx="18" className="fill-surface stroke-text" strokeWidth="5"/>
      <path d="M118 70 H224" className="stroke-text" strokeWidth="8"/>
      <rect x="112" y="90" width="118" height="52" rx="8" className="fill-bg stroke-text" strokeWidth="4"/>
      <circle cx="171" cy="116" r="18" className="fill-accent"/>
      <path d="M162 116 l7 7 l13 -15" pathLength="1" strokeDasharray="1" className="ck-check stroke-on-accent" strokeWidth="5"/>
      <circle cx="134" cy="166" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "0.0s" }}/>
      <circle cx="171" cy="166" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "0.3s" }}/>
      <circle cx="208" cy="166" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "0.6s" }}/>
      <circle cx="134" cy="196" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "0.8999999999999999s" }}/>
      <circle cx="171" cy="196" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "1.2s" }}/>
      <circle cx="208" cy="196" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "1.5s" }}/>
      <circle cx="134" cy="226" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "1.7999999999999998s" }}/>
      <circle cx="171" cy="226" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "2.1s" }}/>
      <circle cx="208" cy="226" r="8" className="ck-key ar-box fill-accent-soft stroke-text" strokeWidth="3" style={{ animationDelay: "2.4s" }}/>
      <g clipPath="url(#ck-clip)">
        <g className="ck-receipt">
          <path d="M282 118 H354 V236 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 Z" className="fill-bg stroke-text" strokeWidth="4"/>
          <path d="M294 138 H342 M294 154 H330 M294 170 H342" className="stroke-text" strokeWidth="5" opacity="0.3"/>
          <path d="M294 196 H342" className="stroke-accent" strokeWidth="6"/>
        </g>
      </g>
      <path d="M268 112 H368" className="stroke-text" strokeWidth="8"/>
      <g transform="translate(40 100) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.2s" }}/>
      </g>
      <g transform="translate(386 60) scale(0.9)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.2s" }}/>
      </g>
    </ArtFrame>
  );
}
