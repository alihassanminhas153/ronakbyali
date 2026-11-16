import ArtFrame from "./ArtFrame";

/* Coin stacks growing beside a rising profit line with a spinning coin. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.fi-coin { animation: fi-coin 5s ease-in-out infinite; }
.fi-flip { animation: fi-flip 2.2s ease-in-out infinite alternate; }
.fi-draw { animation: fi-draw 5s ease-in-out infinite; }
.fi-arrow { animation: fi-arrow 5s ease-in-out infinite; }
@keyframes fi-coin { 0% { transform: translateY(-26px); opacity: 0; } 10% { opacity: 1; } 18% { transform: translateY(3px); } 24%, 80% { transform: translateY(0); opacity: 1; } 92%, 100% { transform: translateY(0); opacity: 0; } }
@keyframes fi-flip { 0% { transform: scaleX(1); } 100% { transform: scaleX(-1); } }
@keyframes fi-draw { 0%, 10% { stroke-dashoffset: 1; opacity: 0; } 12% { opacity: 1; } 50%, 88% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes fi-arrow { 0%, 46% { opacity: 0; } 54%, 88% { opacity: 1; } 100% { opacity: 0; } }
`;

export default function FinanceArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="Coin stacks growing beside a rising profit line with a spinning coin" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <g className="fi-coin" style={{ animationDelay: "0.0s" }}>
        <path d="M38 240 V252 a34 10 0 0 0 68 0 V240 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="72" cy="240" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "0.25s" }}>
        <path d="M38 228 V240 a34 10 0 0 0 68 0 V228 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="72" cy="228" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "0.5s" }}>
        <path d="M38 216 V228 a34 10 0 0 0 68 0 V216 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="72" cy="216" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "0.5s" }}>
        <path d="M112 240 V252 a34 10 0 0 0 68 0 V240 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="146" cy="240" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "0.75s" }}>
        <path d="M112 228 V240 a34 10 0 0 0 68 0 V228 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="146" cy="228" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "1.0s" }}>
        <path d="M112 216 V228 a34 10 0 0 0 68 0 V216 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="146" cy="216" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "1.25s" }}>
        <path d="M112 204 V216 a34 10 0 0 0 68 0 V204 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="146" cy="204" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "1.5s" }}>
        <path d="M112 192 V204 a34 10 0 0 0 68 0 V192 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="146" cy="192" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "1.0s" }}>
        <path d="M186 240 V252 a34 10 0 0 0 68 0 V240 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="220" cy="240" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "1.25s" }}>
        <path d="M186 228 V240 a34 10 0 0 0 68 0 V228 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="220" cy="228" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "1.5s" }}>
        <path d="M186 216 V228 a34 10 0 0 0 68 0 V216 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="220" cy="216" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g className="fi-coin" style={{ animationDelay: "1.75s" }}>
        <path d="M186 204 V216 a34 10 0 0 0 68 0 V204 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5"/>
        <ellipse cx="220" cy="204" rx="34" ry="10" className="fill-accent stroke-text" strokeWidth="3.5"/>
      </g>
      <g transform="translate(146 120)">
        <g className="ar-float">
          <g className="fi-flip ar-box">
            <circle r="23" className="fill-accent stroke-text" strokeWidth="4"/>
            <circle r="14" className="stroke-on-accent" strokeWidth="3"/>
            <path d="M0 -7 V7" className="stroke-on-accent" strokeWidth="4"/>
          </g>
        </g>
      </g>
      <path d="M282 246 V110 M282 246 H394" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <path d="M292 222 L318 198 L342 210 L376 140" pathLength="1" strokeDasharray="1" className="fi-draw stroke-accent" strokeWidth="6" strokeLinejoin="round"/>
      <g className="fi-arrow">
        <g transform="translate(376 140) rotate(-64)">
          <path d="M4 0 L-14 -10 L-14 10 Z" className="fill-accent stroke-accent" strokeWidth="3" strokeLinejoin="round"/>
        </g>
        <circle cx="318" cy="198" r="5" className="fill-bg stroke-accent" strokeWidth="3"/>
        <circle cx="342" cy="210" r="5" className="fill-bg stroke-accent" strokeWidth="3"/>
      </g>
      <g transform="translate(40 130) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.3s" }}/>
      </g>
      <g transform="translate(396 90) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.5s" }}/>
      </g>
    </ArtFrame>
  );
}
