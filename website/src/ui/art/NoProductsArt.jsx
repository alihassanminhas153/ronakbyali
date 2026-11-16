import ArtFrame from "./ArtFrame";

/* Empty open box with a searching magnifier and a question mark: "no product found". Animated and themed. Class prefix: np- */
const CSS = `
.np-lens { animation: np-search 3.4s ease-in-out infinite alternate; transform-origin: 300px 150px; }
.np-q { animation: np-bob 2.2s ease-in-out infinite alternate; }
@keyframes np-search { 0% { transform: translate(-26px, 8px) rotate(-6deg); } 100% { transform: translate(14px, -6px) rotate(6deg); } }
@keyframes np-bob { 0% { transform: translateY(0); } 100% { transform: translateY(-6px); } }
`;

export default function NoProductsArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="An empty open box with a magnifying glass, no product found" css={CSS} className={className} decorative={decorative}>
      <path d="M40 266 H380" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      {/* box back flaps */}
      <path d="M96 118 L74 84 H170 L184 118Z" className="fill-accent-soft stroke-text" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M264 118 L280 84 H346 L330 118Z" className="fill-accent-soft stroke-text" strokeWidth="4" strokeLinejoin="round"/>
      {/* box body */}
      <rect x="86" y="118" width="256" height="136" rx="10" className="fill-surface stroke-text" strokeWidth="5"/>
      <path d="M86 150 H342" className="stroke-text" strokeWidth="3" opacity="0.2"/>
      <rect x="168" y="168" width="92" height="14" rx="7" className="fill-accent-soft stroke-text" strokeWidth="3"/>
      <path d="M110 226 H190" className="stroke-text" strokeWidth="6" opacity="0.2"/>
      <path d="M110 240 H156" className="stroke-text" strokeWidth="6" opacity="0.2"/>
      {/* question marks */}
      <g className="np-q ar-box">
        <path d="M200 70 q0 -16 14 -16 q14 0 14 12 q0 8 -10 12 q-4 2 -4 8" className="stroke-accent" strokeWidth="6" strokeLinecap="round" fill="none"/>
        <circle cx="214" cy="100" r="3.5" className="fill-accent"/>
      </g>
      {/* magnifier */}
      <g className="np-lens">
        <circle cx="300" cy="150" r="34" className="fill-bg stroke-text" strokeWidth="6" fillOpacity="0.55"/>
        <circle cx="300" cy="150" r="22" className="stroke-accent" strokeWidth="3" opacity="0.6" fill="none"/>
        <path d="M324 176 L352 208" className="stroke-text" strokeWidth="10" strokeLinecap="round"/>
        <path d="M288 140 q6 -8 16 -6" className="stroke-text" strokeWidth="3" strokeLinecap="round" opacity="0.5" fill="none"/>
      </g>
      <g transform="translate(56 150)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0s" }}/>
      </g>
      <g transform="translate(374 100) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.1s" }}/>
      </g>
    </ArtFrame>
  );
}