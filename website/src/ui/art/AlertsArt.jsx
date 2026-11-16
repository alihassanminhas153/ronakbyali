import ArtFrame from "./ArtFrame";

/* A bell ringing with sound waves and a notification badge. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.al-ring { animation: al-ring 5s ease-in-out infinite; transform-origin: 210px 54px; }
.al-clap { animation: al-clap 5s ease-in-out infinite; transform-origin: 210px 196px; }
.al-wave { animation: al-wave 5s ease-out infinite; }
.al-pop { animation: al-pop 5s ease-out infinite; }
@keyframes al-ring { 0%, 48% { transform: rotate(0deg); } 52% { transform: rotate(-14deg); } 58% { transform: rotate(12deg); } 64% { transform: rotate(-9deg); } 70% { transform: rotate(6deg); } 76% { transform: rotate(-3deg); } 82%, 100% { transform: rotate(0deg); } }
@keyframes al-clap { 0%, 48% { transform: rotate(0deg); } 54% { transform: rotate(18deg); } 60% { transform: rotate(-16deg); } 66% { transform: rotate(12deg); } 72% { transform: rotate(-8deg); } 80%, 100% { transform: rotate(0deg); } }
@keyframes al-wave { 0%, 48% { opacity: 0; } 56% { opacity: 1; } 88%, 100% { opacity: 0; } }
@keyframes al-pop { 0%, 48% { transform: scale(0); } 56% { transform: scale(1.25); } 62%, 92% { transform: scale(1); } 100% { transform: scale(0); } }
`;

export default function AlertsArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A bell ringing with sound waves and a notification badge" css={CSS} className={className} decorative={decorative}>
      <ellipse cx="210" cy="252" rx="78" ry="7" className="fill-text" opacity="0.12"/>
      <path d="M122 112 q-14 20 0 40 M98 96 q-24 36 0 72" className="al-wave stroke-text" strokeWidth="5" fill="none"/>
      <path d="M298 112 q14 20 0 40 M322 96 q24 36 0 72" className="al-wave stroke-text" strokeWidth="5" fill="none" style={{ animationDelay: "0.1s" }}/>
      <g className="al-ring">
        <g className="al-clap">
          <circle cx="210" cy="216" r="15" className="fill-accent stroke-text" strokeWidth="4"/>
        </g>
        <circle cx="210" cy="54" r="9" className="fill-text"/>
        <path d="M210 62 C172 62 156 94 156 128 V170 L134 196 H286 L264 170 V128 C264 94 248 62 210 62 Z" className="fill-accent-soft stroke-text" strokeWidth="5" strokeLinejoin="round"/>
        <path d="M178 108 C175 124 175 140 178 154" className="stroke-bg" strokeWidth="6" opacity="0.8"/>
        <path d="M156 170 H264" className="stroke-text" strokeWidth="3" opacity="0.25"/>
      </g>
      <g transform="translate(272 72)">
        <g className="al-pop ar-box">
          <circle r="21" className="fill-accent stroke-text" strokeWidth="4"/>
          <path d="M0 -9 V3" className="stroke-on-accent" strokeWidth="5"/>
          <circle cy="11" r="3" className="fill-on-accent"/>
        </g>
      </g>
      <g transform="translate(60 60) scale(1)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0s" }}/>
      </g>
      <g transform="translate(372 232) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.1s" }}/>
      </g>
      <g transform="translate(56 220) scale(0.7)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.9s" }}/>
      </g>
    </ArtFrame>
  );
}
