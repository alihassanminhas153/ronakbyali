import ArtFrame from "./ArtFrame";

/* A big pulsing heart on a saved-items card with small hearts floating up. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.wl-rise { animation: wl-rise 3.6s ease-out infinite; }
@keyframes wl-rise { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-110px) scale(1); opacity: 0; } }
`;

export default function WishlistArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A big pulsing heart on a saved-items card with small hearts floating up" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>
      <g transform="rotate(-4 210 150)">
        <rect x="96" y="44" width="228" height="206" rx="18" className="fill-surface stroke-text" strokeWidth="5"/>
        <path d="M126 220 H250" className="stroke-text" strokeWidth="6" opacity="0.2"/>
        <path d="M126 238 H200" className="stroke-text" strokeWidth="6" opacity="0.2"/>
        <path d="M284 44 V98 L302 82 L320 98 V44 Z" className="fill-accent stroke-text" strokeWidth="4"/>
      </g>
      <circle cx="210" cy="130" r="70" className="ar-ping ar-box stroke-accent" strokeWidth="3"/>
      <g transform="translate(210 130)">
        <g className="ar-pulse ar-box">
          <path d="M0 26 C-34 2 -30 -26 -10 -26 C-2 -26 0 -18 0 -14 C0 -18 2 -26 10 -26 C30 -26 34 2 0 26 Z" transform="scale(2.1)" className="fill-accent stroke-text" strokeWidth="2.4"/>
          <path d="M-40 -12 C-42 -26 -30 -36 -18 -36" className="stroke-on-accent" strokeWidth="6" opacity="0.55"/>
        </g>
      </g>
      <g transform="translate(128 238)">
        <g className="wl-rise" style={{ animationDelay: "0s" }}>
          <path d="M0 26 C-34 2 -30 -26 -10 -26 C-2 -26 0 -18 0 -14 C0 -18 2 -26 10 -26 C30 -26 34 2 0 26 Z" transform="scale(0.45)" className="fill-accent stroke-text" strokeWidth="5"/>
        </g>
      </g>
      <g transform="translate(300 242)">
        <g className="wl-rise" style={{ animationDelay: "1.2s" }}>
          <path d="M0 26 C-34 2 -30 -26 -10 -26 C-2 -26 0 -18 0 -14 C0 -18 2 -26 10 -26 C30 -26 34 2 0 26 Z" transform="scale(0.45)" className="fill-accent stroke-text" strokeWidth="5"/>
        </g>
      </g>
      <g transform="translate(236 250)">
        <g className="wl-rise" style={{ animationDelay: "2.4s" }}>
          <path d="M0 26 C-34 2 -30 -26 -10 -26 C-2 -26 0 -18 0 -14 C0 -18 2 -26 10 -26 C30 -26 34 2 0 26 Z" transform="scale(0.45)" className="fill-accent stroke-text" strokeWidth="5"/>
        </g>
      </g>
      <g transform="translate(60 90) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0s" }}/>
      </g>
      <g transform="translate(364 150) scale(0.9)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1s" }}/>
      </g>
      <g transform="translate(84 214) scale(0.7)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.8s" }}/>
      </g>
    </ArtFrame>
  );
}
