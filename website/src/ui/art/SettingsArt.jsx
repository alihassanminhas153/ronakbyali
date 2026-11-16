import ArtFrame from "./ArtFrame";

/* Two meshing gears and three sliders adjusting. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.st-spin { animation: st-spin 18s linear infinite; }
.st-spin-r { animation: st-spin 12s linear infinite reverse; }
.st-fill { animation: st-fill 2.8s ease-in-out infinite alternate; transform-origin: 0% 50%; }
.st-knob { animation: st-knob 2.8s ease-in-out infinite alternate; }
@keyframes st-spin { to { transform: rotate(360deg); } }
@keyframes st-fill { 0% { transform: scaleX(0.25); } 100% { transform: scaleX(0.9); } }
@keyframes st-knob { 0% { transform: translateX(0); } 100% { transform: translateX(78px); } }
`;

export default function SettingsArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="Two meshing gears and three sliders adjusting" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <g className="st-spin ar-box">
        <path d="M198.1 145.1 L213.3 150 L213.3 170 L198.1 174.9 L197.8 176.1 L208.5 188 L198.5 205.4 L182.9 202 L182 202.9 L185.4 218.5 L168 228.5 L156.1 217.8 L154.9 218.1 L150 233.3 L130 233.3 L125.1 218.1 L123.9 217.8 L112 228.5 L94.6 218.5 L98 202.9 L97.1 202 L81.5 205.4 L71.5 188 L82.2 176.1 L81.9 174.9 L66.7 170 L66.7 150 L81.9 145.1 L82.2 143.9 L71.5 132 L81.5 114.6 L97.1 118 L98 117.1 L94.6 101.5 L112 91.5 L123.9 102.2 L125.1 101.9 L130 86.7 L150 86.7 L154.9 101.9 L156.1 102.2 L168 91.5 L185.4 101.5 L182 117.1 L182.9 118 L198.5 114.6 L208.5 132 L197.8 143.9 Z" className="fill-accent-soft stroke-text" strokeWidth="5" strokeLinejoin="round"/>
        <circle cx="140" cy="160" r="40" className="stroke-text" strokeWidth="3" opacity="0.25"/>
        <circle cx="140" cy="160" r="22" className="fill-bg stroke-text" strokeWidth="5"/>
      </g>
      <g className="st-spin-r ar-box">
        <path d="M260.5 75.1 L273 78.7 L273 97.3 L260.5 100.9 L260.1 101.9 L266.4 113.3 L253.3 126.4 L241.9 120.1 L240.9 120.5 L237.3 133 L218.7 133 L215.1 120.5 L214.1 120.1 L202.7 126.4 L189.6 113.3 L195.9 101.9 L195.5 100.9 L183 97.3 L183 78.7 L195.5 75.1 L195.9 74.1 L189.6 62.7 L202.7 49.6 L214.1 55.9 L215.1 55.5 L218.7 43 L237.3 43 L240.9 55.5 L241.9 55.9 L253.3 49.6 L266.4 62.7 L260.1 74.1 Z" className="fill-accent stroke-text" strokeWidth="5" strokeLinejoin="round"/>
        <circle cx="228" cy="88" r="13" className="fill-bg stroke-text" strokeWidth="4"/>
      </g>
      <rect x="262" y="181" width="128" height="18" rx="9" className="fill-surface stroke-text" strokeWidth="4"/>
      <rect x="267" y="186" width="118" height="8" rx="4" className="st-fill ar-box fill-accent" style={{ animationDelay: "0s" }}/>
      <circle cx="296" cy="190" r="12" className="st-knob fill-bg stroke-text" strokeWidth="4" style={{ animationDelay: "0s" }}/>
      <rect x="262" y="209" width="128" height="18" rx="9" className="fill-surface stroke-text" strokeWidth="4"/>
      <rect x="267" y="214" width="118" height="8" rx="4" className="st-fill ar-box fill-accent" style={{ animationDelay: "-0.9s" }}/>
      <circle cx="296" cy="218" r="12" className="st-knob fill-bg stroke-text" strokeWidth="4" style={{ animationDelay: "-0.9s" }}/>
      <rect x="262" y="237" width="128" height="18" rx="9" className="fill-surface stroke-text" strokeWidth="4"/>
      <rect x="267" y="242" width="118" height="8" rx="4" className="st-fill ar-box fill-accent" style={{ animationDelay: "-1.8s" }}/>
      <circle cx="296" cy="246" r="12" className="st-knob fill-bg stroke-text" strokeWidth="4" style={{ animationDelay: "-1.8s" }}/>
      <g transform="translate(52 60) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0s" }}/>
      </g>
      <g transform="translate(364 70) scale(0.9)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.2s" }}/>
      </g>
    </ArtFrame>
  );
}
