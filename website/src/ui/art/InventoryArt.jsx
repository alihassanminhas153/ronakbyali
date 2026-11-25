import ArtFrame from "./ArtFrame";

/* A stocked warehouse shelf with a scanner beam sweeping over it, live stock-level bars, a barcode tag and a low-stock alert. Animated and themed. Its class names share one short prefix so they cannot clash with yours. */
const CSS = `
.iv-pop { animation: iv-pop 3.2s ease-in-out infinite alternate; }
.iv-scan { animation: iv-scan 4.4s ease-in-out infinite; }
.iv-bar { transform-box: fill-box; transform-origin: 50% 100%; animation: iv-bar 3.4s ease-in-out infinite alternate; }
@keyframes iv-pop { 0% { transform: translateY(0); } 100% { transform: translateY(-5px); } }
@keyframes iv-scan { 0% { transform: translateY(0); opacity: 0; } 10%, 90% { opacity: 0.9; } 100% { transform: translateY(226px); opacity: 0; } }
@keyframes iv-bar { 0% { transform: scaleY(0.3); } 100% { transform: scaleY(1); } }
`;

/* Boxes: x, y, width, height, fill class, pop delay (null = stays still) */
const BOXES = [
  [62, 48, 44, 46, "fill-accent-soft", "0s"],
  [116, 58, 36, 36, "fill-surface", null],
  [162, 42, 44, 52, "fill-surface", "-1.2s"],
  [214, 64, 36, 30, "fill-accent-soft", null],
  [62, 134, 50, 40, "fill-surface", null],
  [122, 120, 44, 54, "fill-accent-soft", "-2.2s"],
  [176, 140, 34, 34, "fill-surface", null],
  [218, 130, 32, 44, "fill-accent-soft", "-0.6s"],
  [62, 206, 56, 48, "fill-accent-soft", null],
  [128, 214, 40, 40, "fill-surface", "-1.8s"],
  [178, 218, 70, 36, "fill-surface", null],
];

export default function InventoryArt({ className = "", decorative = false }) {
  return (
    <ArtFrame label="A stocked warehouse shelf with a scanner beam, stock-level bars, a barcode tag and a low-stock alert" css={CSS} className={className} decorative={decorative}>
      <path d="M30 266 H390" className="stroke-text" strokeWidth="4" opacity="0.3"/>

      {/* shelf frame */}
      <path d="M50 30 V266 M262 30 V266" className="stroke-text" strokeWidth="6"/>
      <path d="M44 30 H268" className="stroke-text" strokeWidth="6"/>

      {/* boxes */}
      {BOXES.map(([x, y, w, h, fill, delay], i) => (
        <g key={i} className={delay ? "iv-pop" : undefined} style={delay ? { animationDelay: delay } : undefined}>
          <rect x={x} y={y} width={w} height={h} rx="4" className={`${fill} stroke-text`} strokeWidth="4.5"/>
          <rect x={x + w / 2 - 6} y={y} width="12" height={Math.min(18, h / 2)} className="fill-accent"/>
        </g>
      ))}

      {/* shelf boards (drawn over the box bottoms) */}
      <rect x="44" y="94" width="224" height="10" rx="3" className="fill-surface stroke-text" strokeWidth="4.5"/>
      <rect x="44" y="174" width="224" height="10" rx="3" className="fill-surface stroke-text" strokeWidth="4.5"/>
      <rect x="44" y="254" width="224" height="10" rx="3" className="fill-surface stroke-text" strokeWidth="4.5"/>

      {/* scanner beam */}
      <g className="iv-scan">
        <rect x="46" y="34" width="220" height="4" rx="2" className="fill-accent"/>
        <rect x="46" y="38" width="220" height="14" className="fill-accent" opacity="0.15"/>
      </g>

      {/* stock level card */}
      <rect x="286" y="30" width="108" height="120" rx="10" className="fill-surface stroke-text" strokeWidth="5"/>
      <path d="M300 48 H342" className="stroke-text" strokeWidth="5" opacity="0.25"/>
      <rect x="300" y="62" width="18" height="66" rx="3" className="iv-bar fill-accent-soft stroke-text" strokeWidth="3.5" style={{ animationDelay: "0s", animationDuration: "3.4s" }}/>
      <rect x="326" y="62" width="18" height="66" rx="3" className="iv-bar fill-accent stroke-text" strokeWidth="3.5" style={{ animationDelay: "-1.1s", animationDuration: "2.8s" }}/>
      <rect x="352" y="62" width="18" height="66" rx="3" className="iv-bar fill-accent-soft stroke-text" strokeWidth="3.5" style={{ animationDelay: "-2.1s", animationDuration: "3.9s" }}/>
      <path d="M294 130 H386" className="stroke-text" strokeWidth="4"/>

      {/* barcode tag */}
      <g transform="translate(284 200)">
        <g className="ar-bob">
          <path d="M28 0 V-10" className="stroke-text" strokeWidth="3"/>
          <rect width="56" height="50" rx="6" className="fill-bg stroke-text" strokeWidth="4"/>
          <path d="M10 12 V38 M16 12 V38 M22 12 V38 M30 12 V38 M35 12 V38 M42 12 V38" className="stroke-text" strokeWidth="3"/>
          <path d="M8 44 H48" className="stroke-accent" strokeWidth="3"/>
        </g>
      </g>

      {/* low-stock alert */}
      <g transform="translate(366 206)">
        <g className="ar-pulse ar-box">
          <circle r="24" className="fill-accent stroke-text" strokeWidth="5"/>
          <path d="M0 -10 V3" className="stroke-on-accent" strokeWidth="5"/>
          <circle cy="12" r="3" className="fill-on-accent"/>
        </g>
      </g>

      {/* sparkles */}
      <g transform="translate(20 80)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "0.4s" }}/>
      </g>
      <g transform="translate(280 172) scale(0.8)">
        <path d="M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z" className="ar-twinkle ar-box fill-accent" style={{ animationDelay: "1.3s" }}/>
      </g>
    </ArtFrame>
  );
}