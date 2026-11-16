import ArtFrame from "./ArtFrame";

/* A speech bubble with five stars lighting up one by one. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.rv-star { animation: rv-star 5s ease-out infinite; }
@keyframes rv-star { 0%, 6% { transform: scale(0); opacity: 0; } 16% { transform: scale(1.3); opacity: 1; } 24%, 86% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(0); opacity: 0; } }
`;

export default function ReviewsArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A speech bubble with five stars lighting up one by one" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <rect x="60" y="50" width="300" height="150" rx="22" className="fill-surface stroke-text" strokeWidth="5"/>
      <path d="M118 200 L100 238 L158 200" className="fill-surface stroke-text" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M121 200 H154" className="stroke-surface" strokeWidth="7" strokeLinecap="butt"/>
      <path d="M110 81 L115.9 95.9 L131.9 96.9 L119.5 107.1 L123.5 122.6 L110 114 L96.5 122.6 L100.5 107.1 L88.1 96.9 L104.1 95.9 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5" strokeLinejoin="round"/>
      <path d="M110 81 L115.9 95.9 L131.9 96.9 L119.5 107.1 L123.5 122.6 L110 114 L96.5 122.6 L100.5 107.1 L88.1 96.9 L104.1 95.9 Z" className="rv-star ar-box fill-accent stroke-text" strokeWidth="3.5" strokeLinejoin="round" style={{ animationDelay: "0.0s" }}/>
      <path d="M160 81 L165.9 95.9 L181.9 96.9 L169.5 107.1 L173.5 122.6 L160 114 L146.5 122.6 L150.5 107.1 L138.1 96.9 L154.1 95.9 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5" strokeLinejoin="round"/>
      <path d="M160 81 L165.9 95.9 L181.9 96.9 L169.5 107.1 L173.5 122.6 L160 114 L146.5 122.6 L150.5 107.1 L138.1 96.9 L154.1 95.9 Z" className="rv-star ar-box fill-accent stroke-text" strokeWidth="3.5" strokeLinejoin="round" style={{ animationDelay: "0.3s" }}/>
      <path d="M210 81 L215.9 95.9 L231.9 96.9 L219.5 107.1 L223.5 122.6 L210 114 L196.5 122.6 L200.5 107.1 L188.1 96.9 L204.1 95.9 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5" strokeLinejoin="round"/>
      <path d="M210 81 L215.9 95.9 L231.9 96.9 L219.5 107.1 L223.5 122.6 L210 114 L196.5 122.6 L200.5 107.1 L188.1 96.9 L204.1 95.9 Z" className="rv-star ar-box fill-accent stroke-text" strokeWidth="3.5" strokeLinejoin="round" style={{ animationDelay: "0.6s" }}/>
      <path d="M260 81 L265.9 95.9 L281.9 96.9 L269.5 107.1 L273.5 122.6 L260 114 L246.5 122.6 L250.5 107.1 L238.1 96.9 L254.1 95.9 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5" strokeLinejoin="round"/>
      <path d="M260 81 L265.9 95.9 L281.9 96.9 L269.5 107.1 L273.5 122.6 L260 114 L246.5 122.6 L250.5 107.1 L238.1 96.9 L254.1 95.9 Z" className="rv-star ar-box fill-accent stroke-text" strokeWidth="3.5" strokeLinejoin="round" style={{ animationDelay: "0.8999999999999999s" }}/>
      <path d="M310 81 L315.9 95.9 L331.9 96.9 L319.5 107.1 L323.5 122.6 L310 114 L296.5 122.6 L300.5 107.1 L288.1 96.9 L304.1 95.9 Z" className="fill-accent-soft stroke-text" strokeWidth="3.5" strokeLinejoin="round"/>
      <path d="M310 81 L315.9 95.9 L331.9 96.9 L319.5 107.1 L323.5 122.6 L310 114 L296.5 122.6 L300.5 107.1 L288.1 96.9 L304.1 95.9 Z" className="rv-star ar-box fill-accent stroke-text" strokeWidth="3.5" strokeLinejoin="round" style={{ animationDelay: "1.2s" }}/>
      <path d="M92 156 H300" className="stroke-text" strokeWidth="6" opacity="0.25"/>
      <path d="M92 178 H238" className="stroke-text" strokeWidth="6" opacity="0.25"/>
      <g transform="translate(382 58)">
        <g className="ar-float">
          <path d="M0 26 C-34 2 -30 -26 -10 -26 C-2 -26 0 -18 0 -14 C0 -18 2 -26 10 -26 C30 -26 34 2 0 26 Z" transform="scale(0.5)" className="fill-accent stroke-text" strokeWidth="7"/>
        </g>
      </g>
      <g transform="translate(36 90) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.3s" }}/>
      </g>
      <g transform="translate(380 220) scale(0.9)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.4s" }}/>
      </g>
    </ArtFrame>
  );
}
