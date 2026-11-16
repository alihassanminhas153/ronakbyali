import ArtFrame from "./ArtFrame";

/* Parcels riding a conveyor belt next to a ticked checklist. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.or-move { animation: or-move 7s linear infinite; }
.or-check { animation: or-check 3.6s ease-in-out infinite; }
@keyframes or-move { 0% { transform: translateX(-150px); } 100% { transform: translateX(480px); } }
@keyframes or-check { 0%, 8% { stroke-dashoffset: 1; opacity: 0; } 9% { opacity: 1; } 25%, 88% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 1; opacity: 0; } }
`;

export default function OrdersArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="Parcels riding a conveyor belt next to a ticked checklist" css={CSS} className={className} decorative={decorative}>
      <path d="M70 240 V262 M350 240 V262" className="stroke-text" strokeWidth="5"/>
      <rect x="30" y="206" width="360" height="34" rx="17" className="fill-surface stroke-text" strokeWidth="5"/>
      <g className="or-move" style={{ animationDelay: "0s" }}>
        <rect y="152" width="70" height="54" rx="4" className="fill-accent-soft stroke-text" strokeWidth="5"/>
        <rect x="28" y="152" width="14" height="22" className="fill-accent"/>
        <rect x="12" y="184" width="26" height="10" rx="2" className="fill-bg stroke-text" strokeWidth="2"/>
      </g>
      <g className="or-move" style={{ animationDelay: "-2.4s" }}>
        <rect y="152" width="70" height="54" rx="4" className="fill-surface stroke-text" strokeWidth="5"/>
        <rect x="28" y="152" width="14" height="22" className="fill-accent"/>
        <rect x="12" y="184" width="26" height="10" rx="2" className="fill-bg stroke-text" strokeWidth="2"/>
      </g>
      <g className="or-move" style={{ animationDelay: "-4.8s" }}>
        <rect y="152" width="70" height="54" rx="4" className="fill-accent-soft stroke-text" strokeWidth="5"/>
        <rect x="28" y="152" width="14" height="22" className="fill-accent"/>
        <rect x="12" y="184" width="26" height="10" rx="2" className="fill-bg stroke-text" strokeWidth="2"/>
      </g>
      <rect x="30" y="206" width="360" height="34" rx="17" className="fill-none stroke-text" strokeWidth="5"/>
      <path d="M52 223 H368" className="ar-flow stroke-text" strokeWidth="4" strokeDasharray="12 14" opacity="0.5"/>
      <rect x="60" y="30" width="112" height="112" rx="10" className="fill-surface stroke-text" strokeWidth="5"/>
      <rect x="92" y="22" width="48" height="16" rx="6" className="fill-accent stroke-text" strokeWidth="4"/>
      <rect x="76" y="62" width="16" height="16" rx="3" className="fill-bg stroke-text" strokeWidth="3"/>
      <path d="M79 70 l5 5 l9 -11" pathLength="1" strokeDasharray="1" className="or-check stroke-accent" strokeWidth="4" style={{ animationDelay: "0.0s" }}/>
      <path d="M104 70 H152" className="stroke-text" strokeWidth="5" opacity="0.25"/>
      <rect x="76" y="88" width="16" height="16" rx="3" className="fill-bg stroke-text" strokeWidth="3"/>
      <path d="M79 96 l5 5 l9 -11" pathLength="1" strokeDasharray="1" className="or-check stroke-accent" strokeWidth="4" style={{ animationDelay: "0.6s" }}/>
      <path d="M104 96 H152" className="stroke-text" strokeWidth="5" opacity="0.25"/>
      <rect x="76" y="114" width="16" height="16" rx="3" className="fill-bg stroke-text" strokeWidth="3"/>
      <path d="M79 122 l5 5 l9 -11" pathLength="1" strokeDasharray="1" className="or-check stroke-accent" strokeWidth="4" style={{ animationDelay: "1.2s" }}/>
      <path d="M104 122 H152" className="stroke-text" strokeWidth="5" opacity="0.25"/>
      <g transform="translate(320 88)">
        <g className="ar-pulse ar-box">
          <circle r="36" className="fill-accent stroke-text" strokeWidth="5"/>
          <path d="M-14 1 l10 11 l19 -23" pathLength="1" strokeDasharray="1" className="or-check stroke-on-accent" strokeWidth="7" style={{ animationDelay: "1.8s" }}/>
        </g>
      </g>
      <g transform="translate(230 70) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.5s" }}/>
      </g>
      <g transform="translate(394 170) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.5s" }}/>
      </g>
    </ArtFrame>
  );
}
