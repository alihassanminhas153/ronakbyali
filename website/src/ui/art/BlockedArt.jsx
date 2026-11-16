import ArtFrame from "./ArtFrame";

/* A no-entry sign shaking over caution tape with a padlock hanging from it. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.bk-shake { animation: bk-shake 4s ease-in-out infinite; transform-origin: 210px 112px; }
.bk-tape { animation: bk-tape 5s ease-in-out infinite alternate; transform-origin: 210px 176px; }
.bk-lock { animation: bk-lock 2.8s ease-in-out infinite alternate; }
@keyframes bk-shake { 0%, 66%, 100% { transform: rotate(0deg); } 70% { transform: rotate(-7deg); } 74% { transform: rotate(7deg); } 78% { transform: rotate(-5deg); } 82% { transform: rotate(3deg); } 86% { transform: rotate(0deg); } }
@keyframes bk-tape { 0% { transform: rotate(-1.5deg); } 100% { transform: rotate(1.5deg); } }
@keyframes bk-lock { 0% { transform: rotate(-7deg); } 100% { transform: rotate(7deg); } }
`;

export default function BlockedArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A no-entry sign shaking over caution tape with a padlock hanging from it" css={CSS} className={className} decorative={decorative}>
      <ellipse cx="210" cy="260" rx="130" ry="7" className="fill-text" opacity="0.12"/>
      <g className="bk-tape">
        <g transform="rotate(-8 210 176)">
          <defs>
            <clipPath id="bk-clip">
              <rect x="-40" y="156" width="500" height="40"/>
            </clipPath>
          </defs>
          <rect x="-40" y="156" width="500" height="40" className="fill-accent-soft"/>
          <g clipPath="url(#bk-clip)" className="stroke-accent" strokeWidth="12" strokeLinecap="butt">
            <path d="M-10 156 L-32 196"/>
            <path d="M26 156 L4 196"/>
            <path d="M62 156 L40 196"/>
            <path d="M98 156 L76 196"/>
            <path d="M134 156 L112 196"/>
            <path d="M170 156 L148 196"/>
            <path d="M206 156 L184 196"/>
            <path d="M242 156 L220 196"/>
            <path d="M278 156 L256 196"/>
            <path d="M314 156 L292 196"/>
            <path d="M350 156 L328 196"/>
            <path d="M386 156 L364 196"/>
            <path d="M422 156 L400 196"/>
            <path d="M458 156 L436 196"/>
          </g>
          <path d="M-40 156 H460 M-40 196 H460" className="stroke-text" strokeWidth="4"/>
        </g>
      </g>
      <circle cx="210" cy="112" r="60" className="ar-ping ar-box stroke-accent" strokeWidth="3"/>
      <g className="bk-shake">
        <circle cx="210" cy="112" r="58" className="fill-bg stroke-accent" strokeWidth="14"/>
        <path d="M169 71 L251 153" className="stroke-accent" strokeWidth="14"/>
      </g>
      <g transform="translate(330 186)">
        <g className="bk-lock">
          <circle r="5" className="fill-text"/>
          <path d="M0 5 V12" className="stroke-text" strokeWidth="4"/>
          <path d="M-17 36 V28 a17 17 0 0 1 34 0 V36" transform="translate(0 4)" className="stroke-text" strokeWidth="6"/>
          <rect x="-28" y="38" width="56" height="42" rx="9" className="fill-accent stroke-text" strokeWidth="5"/>
          <circle cy="55" r="6" className="fill-on-accent"/>
          <path d="M0 57 V68" className="stroke-on-accent" strokeWidth="5"/>
        </g>
      </g>
      <g transform="translate(48 70) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.2s" }}/>
      </g>
      <g transform="translate(380 60) scale(0.9)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.1s" }}/>
      </g>
      <g transform="translate(70 226) scale(0.7)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.8s" }}/>
      </g>
    </ArtFrame>
  );
}
