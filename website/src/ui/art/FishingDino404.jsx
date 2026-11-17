import { useId } from "react";

/* 404 laid on an icy floor IN PERSPECTIVE, with a Chrome-dino style pixel dinosaur
   (beanie + scarf) fishing in the 0. The 0 is a hole in the ice filled with water; the
   line runs from the bent rod straight into it, where the bobber floats and a pixel fish
   nibbles the hook.

   - Colours: every colour is a CSS variable from index.css (--text, --bg, --accent, --info,
     --thread, --error, --warning ...), so light and dark themes switch automatically.
   - Responsive: one design. The SVG has a viewBox and scales to the width of its parent
     (w-full h-auto), so the same art works on phones and on large screens. Put it in a
     container with a max-width, e.g. <div className="mx-auto max-w-xl"><FishingDino404 /></div>
   - Self contained: no ArtFrame, class prefix "fd-" so nothing clashes.

   To tweak:
   - CX / YH / C / wAt()      -> the camera: centre x, horizon y, floor steepness, how fast things shrink with distance
   - DIGIT_W / DIGIT_D / T    -> width, depth and stroke thickness of the digits on the floor
   - DINO[]                   -> the dinosaur as a pixel bitmap (# = pixel), PX is the pixel size
   - DINO_X / DINO_Y          -> where the dinosaur stands */

/* ------------------------------------------------------------------ perspective */
const CX = 340; // screen x of the vanishing point / centre of the 404
const YH = 110; // horizon line
const C = 150; // how far down the screen a point moves as it gets closer
const wAt = (v) => 1.4 + 0.0042 * v; // scale at floor depth v (negative = far, positive = near)
const P = (x, v) => {
  const w = wAt(v);
  return [CX + x * w, YH + C * w];
};
const f = (n) => Math.round(n * 10) / 10;
const toPath = (arr) => "M" + arr.map(([x, v]) => P(x, v).map(f).join(" ")).join("L") + "Z";
const ellipse = (cx, rx, rz, n = 56) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, Math.sin(a) * rz];
  });

/* ------------------------------------------------------------------ the 404 on the floor */
const DIGIT_W = 64; // floor units
const DIGIT_D = 60; // half depth
const GAP = 14;
const STEP = DIGIT_W + GAP;
const SLAB = 11; // how tall the ice slabs stand (screen px)

// a blocky "4" (floor coordinates: x across, v depth, -v = far side)
const four = (cx) =>
  [
    [-32, -DIGIT_D], [-16, -DIGIT_D], [-16, 14], [10, 14], [10, -DIGIT_D], [26, -DIGIT_D],
    [26, 14], [32, 14], [32, 30], [26, 30], [26, DIGIT_D], [10, DIGIT_D], [10, 30], [-32, 30],
  ].map(([x, v]) => [x + cx, v]);

const FOUR_L = toPath(four(-STEP));
const FOUR_R = toPath(four(STEP));
const ZERO_OUT = toPath(ellipse(0, DIGIT_W / 2, DIGIT_D));
const HOLE = toPath(ellipse(0, 20, 48));
const ZERO_TOP = ZERO_OUT + HOLE; // drawn with fill-rule evenodd -> the hole is punched out
const HOLE_C = P(0, 0); // centre of the hole on screen
const WATER_DROP = 9; // water level is a little below the ice top

/* A raised slab: a stack of copies pushed down gives the thickness, then the lit top face. */
function Slab({ side, top, evenodd = false }) {
  return (
    <g strokeLinejoin="round">
      <g className="fd-edge">
        <path d={side} transform={`translate(0 ${SLAB})`} />
      </g>
      {Array.from({ length: SLAB - 1 }, (_, i) => (
        <path key={i} d={side} className="fd-side" transform={`translate(0 ${SLAB - 1 - i})`} />
      ))}
      <path d={top} className="fd-top" fillRule={evenodd ? "evenodd" : "nonzero"} />
    </g>
  );
}

/* ------------------------------------------------------------------ pixel dinosaur (Chrome-dino style) */
const PX = 5;
const DINO_X = 36;
const DINO_Y = 232; // top of the head; the feet end at DINO_Y + 24 * PX
const DINO = [
  ".............#########",
  ".............#########",
  ".............#########",
  ".............#########",
  ".............#########",
  ".............######...",
  ".............######...",
  "............#######...",
  "#...........#######...",
  "#..........########...",
  "##.........########.#.",
  "##........#########.##",
  "###.......#########...",
  "####.....###########..",
  ".####....###########..",
  "..####...##########...",
  "...#####.##########...",
  ".....#############....",
  ".......##########.....",
  ".......#####.####.....",
  "........####..###.....",
  "........####..###.....",
  "........####..###.....",
  "........#####.#####...",
];
// [col, row, length] runs painted on top of the body (rows may be negative = above the head)
const BEANIE = [[14, -1, 6], [13, 0, 8]];
const POM = [[16, -2, 2]];
const CUFF = [[13, 1, 9]];
const SCARF = [[12, 7, 7], [13, 8, 2]];
const EYE = [[16, 3, 1]];

const runs = (rows) =>
  rows.flatMap((row, r) => [...row.matchAll(/#+/g)].map((m) => [m.index, r, m[0].length]));
const runPath = (list, x0, y0, px) =>
  list.map(([c, r, n]) => `M${x0 + c * px} ${y0 + r * px}h${n * px}v${px}h${-n * px}z`).join("");

const DINO_BODY = runPath(runs(DINO), DINO_X, DINO_Y, PX);
const dinoPart = (list) => runPath(list, DINO_X, DINO_Y, PX);

const FISH = ["#...###..", "##.#####.", "#########", "##.#####.", "#...###.."]; // faces right
const FISH_PATH = runPath(runs(FISH), 0, 0, 2);

/* hand position (the tip of the arm) and rod / line geometry */
const HAND = [DINO_X + 21 * PX + 3, DINO_Y + 11 * PX + 2];
const TIP = [302, 64];
const ROD = `M${HAND[0] - 4} ${HAND[1] + 6} Q190 ${HAND[1] - 120} ${TIP[0]} ${TIP[1]}`;
const LINE = `M${TIP[0]} ${TIP[1]} Q${TIP[0] + 22} 190 ${f(HOLE_C[0])} ${f(HOLE_C[1] + WATER_DROP / 2 - 6)}`;

const SPARKLE = "M0 -9 Q.7 -.7 9 0 Q.7 .7 0 9 Q-.7 .7 -9 0 Q-.7 -.7 0 -9Z";

const CSS = `
.fd-edge path { fill: var(--accent-hover); stroke: var(--text); stroke-width: 3; }
.fd-side { fill: var(--accent-hover); stroke: var(--accent-hover); stroke-width: 1.5; }
.fd-top { fill: color-mix(in srgb, var(--accent) 38%, var(--bg)); stroke: var(--text); stroke-width: 3; }
.fd-ice { fill: var(--accent-soft); stroke: var(--text); stroke-width: 3; }
.fd-ice-edge { fill: color-mix(in srgb, var(--accent) 30%, var(--surface-alt)); stroke: var(--text); stroke-width: 3; }
.fd-hill { fill: color-mix(in srgb, var(--accent) 14%, var(--bg)); stroke: var(--border); stroke-width: 2; }
.fd-line { fill: none; stroke: var(--border); stroke-width: 1.6; opacity: .9; }
.fd-shine { fill: var(--bg); opacity: .55; }
.fd-wall { fill: var(--accent-hover); stroke: var(--text); stroke-width: 3; }
.fd-water { fill: var(--info); }
.fd-ripple { fill: none; stroke: var(--bg); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: 50% 50%; animation: fd-ripple 2.8s ease-out infinite; }
.fd-bob { animation: fd-bob 1.8s ease-in-out infinite; }
.fd-fish { fill: var(--warning); animation: fd-nibble 2.2s ease-in-out infinite; }
.fd-dino { fill: var(--text); }
.fd-eye { fill: var(--bg); }
.fd-beanie { fill: var(--accent); }
.fd-thread { fill: var(--thread); }
.fd-rod-o { fill: none; stroke: var(--text); stroke-width: 6; stroke-linecap: round; }
.fd-rod { fill: none; stroke: var(--thread); stroke-width: 3; stroke-linecap: round; }
.fd-string { fill: none; stroke: var(--text); stroke-width: 1.6; stroke-linecap: round; }
.fd-bubble { fill: var(--bg); stroke: var(--text); stroke-width: 3; stroke-linejoin: round; }
.fd-txt { fill: var(--text); font-family: var(--font-heading); font-weight: 700; font-size: 17px; text-anchor: middle; }
.fd-txt-err { fill: var(--error); }
.fd-shadow { fill: var(--text); opacity: .14; }
.fd-spark { fill: var(--accent); transform-box: fill-box; transform-origin: 50% 50%; animation: fd-twinkle 2.6s ease-in-out infinite; }
.fd-float { animation: fd-float 3s ease-in-out infinite alternate; }
.fd-tail { transform-box: fill-box; transform-origin: 0% 50%; }
@keyframes fd-bob { 0%, 100% { transform: translateY(-1.5px); } 50% { transform: translateY(1.5px); } }
@keyframes fd-ripple { 0% { transform: scale(.25); opacity: .9; } 100% { transform: scale(1); opacity: 0; } }
@keyframes fd-nibble { 0%, 100% { transform: translate(0, 0); } 40% { transform: translate(3px, -1px); } 55% { transform: translate(1px, 1px); } 70% { transform: translate(4px, 0); } }
@keyframes fd-twinkle { 0%, 100% { transform: scale(.35) rotate(0); opacity: .3; } 50% { transform: scale(1) rotate(45deg); opacity: 1; } }
@keyframes fd-float { 0% { transform: translateY(0); } 100% { transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) {
  .fd-bob, .fd-ripple, .fd-fish, .fd-spark, .fd-float { animation: none; }
  .fd-ripple { opacity: .5; transform: scale(.7); }
  .fd-spark { opacity: 1; transform: scale(.8); }
}
`;

export default function FishingDino404({ className = "", decorative = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const holeClip = `fd-hole-${uid}`;
  const floorGrad = `fd-floor-${uid}`;
  const floorClip = `fd-sheet-${uid}`;
  const [hx, hy] = HOLE_C;
  const wy = hy + WATER_DROP / 2; // visible water centre

  // converging lines drawn on the floor toward the vanishing point
  const rays = [-420, -250, -110, 40, 180, 340, 500, 640, 780, 920];

  return (
    <svg
      viewBox="0 0 640 410"
      className={`block h-auto w-full ${className}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "A big 404 laid on an icy floor. The zero is a hole in the ice, and a pixel dinosaur in a beanie is fishing in it."}
      aria-hidden={decorative ? true : undefined}
      preserveAspectRatio="xMidYMid meet"
    >
      <style>{CSS}</style>
      <defs>
        <linearGradient id={floorGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--surface-alt)" }} />
          <stop offset="1" style={{ stopColor: "var(--accent-soft)" }} />
        </linearGradient>
        <clipPath id={floorClip}>
          <path d="M72 110 H568 L640 396 H0Z" />
        </clipPath>
        <clipPath id={holeClip}>
          <path d={HOLE} />
        </clipPath>
      </defs>

      {/* ---------- far ice hills ---------- */}
      <path className="fd-hill" d="M40 112 L110 62 L150 92 L205 44 L262 100 L300 80 L350 112Z" />
      <path className="fd-hill" d="M420 112 L478 70 L520 96 L574 52 L612 112Z" />

      {/* ---------- the icy floor, drawn in perspective ---------- */}
      <path d="M64 396 L0 408 H640 L576 396Z" className="fd-ice-edge" />
      <path d="M72 110 H568 L640 396 H0Z" fill={`url(#${floorGrad})`} stroke="var(--text)" strokeWidth="3" strokeLinejoin="round" />
      <g clipPath={`url(#${floorClip})`}>
        {rays.map((x) => (
          <path key={x} className="fd-line" d={`M${CX} ${YH} L${x} 396`} />
        ))}
      </g>
      {[0.08, 0.2, 0.36, 0.56, 0.8].map((t) => {
        const y = YH + (396 - YH) * t;
        return <path key={t} className="fd-line" d={`M${f(72 - 72 * t)} ${f(y)} H${f(568 + 72 * t)}`} clipPath={`url(#${floorClip})`} />;
      })}
      {/* shiny streaks */}
      <path className="fd-shine" d="M120 150 L150 150 L128 176 L96 176Z" />
      <path className="fd-shine" d="M470 140 L520 140 L538 168 L488 168Z" />
      <path className="fd-shine" d="M520 330 L560 330 L566 350 L518 350Z" />

      {/* ---------- dinosaur shadow ---------- */}
      <ellipse className="fd-shadow" cx={DINO_X + 58} cy={DINO_Y + 24 * PX + 3} rx="68" ry="8" />

      {/* ---------- 404 standing on the ice ---------- */}
      <Slab side={FOUR_L} top={FOUR_L} />
      <Slab side={FOUR_R} top={FOUR_R} />
      <Slab side={ZERO_OUT} top={ZERO_TOP} evenodd />

      {/* ---------- inside the hole ---------- */}
      <path className="fd-wall" d={HOLE} />
      <g clipPath={`url(#${holeClip})`}>
        <path className="fd-water" d={HOLE} transform={`translate(0 ${WATER_DROP})`} />
        <path d={HOLE} transform={`translate(0 ${WATER_DROP})`} fill="none" stroke="var(--bg)" strokeWidth="2" opacity="0.5" />
        {[0, -0.9, -1.8].map((delay) => (
          <ellipse key={delay} className="fd-ripple" cx={hx} cy={wy} rx="22" ry="7" style={{ animationDelay: `${delay}s` }} />
        ))}
        {/* line + hook under the water */}
        <path className="fd-string" d={`M${f(hx)} ${f(wy)} V${f(wy + 13)} a4.5 4.5 0 0 1 -9 0 l1.5 -3.5`} strokeLinejoin="round" />
        {/* the fish */}
        <g transform={`translate(${f(hx - 20)} ${f(wy + 4)})`}>
          <g className="fd-fish">
            <path d={FISH_PATH} />
          </g>
        </g>
      </g>
      <path d={HOLE} fill="none" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round" />

      {/* ---------- the dinosaur ---------- */}
      <g>
        <path className="fd-dino" d={DINO_BODY} />
        <path className="fd-beanie" d={dinoPart(BEANIE)} />
        <path className="fd-thread" d={dinoPart(CUFF)} />
        <path className="fd-thread" d={dinoPart(POM)} />
        <path className="fd-thread" d={dinoPart(SCARF)} />
        <path className="fd-eye" d={dinoPart(EYE)} />
      </g>

      {/* ---------- rod, line, bobber ---------- */}
      <path className="fd-rod-o" d={ROD} />
      <path className="fd-rod" d={ROD} />
      <circle cx={TIP[0]} cy={TIP[1]} r="3" fill="var(--text)" />
      <path className="fd-string" d={LINE} />
      <g transform={`translate(${f(hx)} ${f(wy - 1)})`}>
        <g className="fd-bob">
          <path d="M-5.5 0 a5.5 5.5 0 0 1 11 0Z" fill="var(--error)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M-5.5 0 a5.5 5.5 0 0 0 11 0Z" fill="var(--bg)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
        </g>
      </g>

      {/* ---------- speech bubble ---------- */}
      <g transform="translate(12 104)">
        <g className="fd-float">
          <path className="fd-bubble" d="M12 0 H138 Q150 0 150 12 V46 Q150 58 138 58 H112 L106 76 L92 58 H12 Q0 58 0 46 V12 Q0 0 12 0Z" />
          <text className="fd-txt fd-txt-err" x="75" y="24">Error 404</text>
          <text className="fd-txt" x="75" y="46">no fish found</text>
        </g>
      </g>

      {/* ---------- sparkles ---------- */}
      {[
        { x: 70, y: 40, d: "0s" },
        { x: 250, y: 28, d: "1.1s" },
        { x: 560, y: 36, d: "0.6s" },
        { x: 430, y: 60, d: "1.7s" },
      ].map((s) => (
        <g key={s.x} transform={`translate(${s.x} ${s.y})`}>
          <path d={SPARKLE} className="fd-spark" style={{ animationDelay: s.d }} />
        </g>
      ))}
    </svg>
  );
}