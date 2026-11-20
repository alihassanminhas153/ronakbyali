// import { useId } from "react";

// /* 404 laid on an icy floor IN PERSPECTIVE, with a Chrome-dino style pixel dinosaur
//    (beanie + scarf) fishing in the 0. The 0 is a hole in the ice filled with water; the
//    line runs from the bent rod straight into it, where the bobber floats and a pixel fish
//    nibbles the hook.

//    - Colours: every colour is a CSS variable from index.css (--text, --bg, --accent, --info,
//      --thread, --error, --warning ...), so light and dark themes switch automatically.
//    - Responsive: one design. The SVG has a viewBox and scales to the width of its parent
//      (w-full h-auto), so the same art works on phones and on large screens. Put it in a
//      container with a max-width, e.g. <div className="mx-auto max-w-xl"><FishingDino404 /></div>
//    - Self contained: no ArtFrame, class prefix "fd-" so nothing clashes.

//    To tweak:
//    - CX / YH / C / wAt()      -> the camera: centre x, horizon y, floor steepness, how fast things shrink with distance
//    - DIGIT_W / DIGIT_D / T    -> width, depth and stroke thickness of the digits on the floor
//    - DINO[]                   -> the dinosaur as a pixel bitmap (# = pixel), PX is the pixel size
//    - DINO_X / DINO_Y          -> where the dinosaur stands */

// /* ------------------------------------------------------------------ perspective */
// const CX = 340; // screen x of the vanishing point / centre of the 404
// const YH = 110; // horizon line
// const C = 150; // how far down the screen a point moves as it gets closer
// const wAt = (v) => 1.4 + 0.0042 * v; // scale at floor depth v (negative = far, positive = near)
// const P = (x, v) => {
//   const w = wAt(v);
//   return [CX + x * w, YH + C * w];
// };
// const f = (n) => Math.round(n * 10) / 10;
// const toPath = (arr) => "M" + arr.map(([x, v]) => P(x, v).map(f).join(" ")).join("L") + "Z";
// const ellipse = (cx, rx, rz, n = 56) =>
//   Array.from({ length: n }, (_, i) => {
//     const a = (i / n) * Math.PI * 2;
//     return [cx + Math.cos(a) * rx, Math.sin(a) * rz];
//   });

// /* ------------------------------------------------------------------ the 404 on the floor */
// const DIGIT_W = 64; // floor units
// const DIGIT_D = 60; // half depth
// const GAP = 14;
// const STEP = DIGIT_W + GAP;
// const SLAB = 11; // how tall the ice slabs stand (screen px)

// // a blocky "4" (floor coordinates: x across, v depth, -v = far side)
// const four = (cx) =>
//   [
//     [-32, -DIGIT_D], [-16, -DIGIT_D], [-16, 14], [10, 14], [10, -DIGIT_D], [26, -DIGIT_D],
//     [26, 14], [32, 14], [32, 30], [26, 30], [26, DIGIT_D], [10, DIGIT_D], [10, 30], [-32, 30],
//   ].map(([x, v]) => [x + cx, v]);

// const FOUR_L = toPath(four(-STEP));
// const FOUR_R = toPath(four(STEP));
// const ZERO_OUT = toPath(ellipse(0, DIGIT_W / 2, DIGIT_D));
// const HOLE = toPath(ellipse(0, 20, 48));
// const ZERO_TOP = ZERO_OUT + HOLE; // drawn with fill-rule evenodd -> the hole is punched out
// const HOLE_C = P(0, 0); // centre of the hole on screen
// const WATER_DROP = 9; // water level is a little below the ice top

// /* A raised slab: a stack of copies pushed down gives the thickness, then the lit top face. */
// function Slab({ side, top, evenodd = false }) {
//   return (
//     <g strokeLinejoin="round">
//       <g className="fd-edge">
//         <path d={side} transform={`translate(0 ${SLAB})`} />
//       </g>
//       {Array.from({ length: SLAB - 1 }, (_, i) => (
//         <path key={i} d={side} className="fd-side" transform={`translate(0 ${SLAB - 1 - i})`} />
//       ))}
//       <path d={top} className="fd-top" fillRule={evenodd ? "evenodd" : "nonzero"} />
//     </g>
//   );
// }

// /* ------------------------------------------------------------------ pixel dinosaur (Chrome-dino style) */
// const PX = 5;
// const DINO_X = 36;
// const DINO_Y = 232; // top of the head; the feet end at DINO_Y + 24 * PX
// const DINO = [
//   ".............#########",
//   ".............#########",
//   ".............#########",
//   ".............#########",
//   ".............#########",
//   ".............######...",
//   ".............######...",
//   "............#######...",
//   "#...........#######...",
//   "#..........########...",
//   "##.........########.#.",
//   "##........#########.##",
//   "###.......#########...",
//   "####.....###########..",
//   ".####....###########..",
//   "..####...##########...",
//   "...#####.##########...",
//   ".....#############....",
//   ".......##########.....",
//   ".......#####.####.....",
//   "........####..###.....",
//   "........####..###.....",
//   "........####..###.....",
//   "........#####.#####...",
// ];
// // [col, row, length] runs painted on top of the body (rows may be negative = above the head)
// const BEANIE = [[14, -1, 6], [13, 0, 8]];
// const POM = [[16, -2, 2]];
// const CUFF = [[13, 1, 9]];
// const SCARF = [[12, 7, 7], [13, 8, 2]];
// const EYE = [[16, 3, 1]];

// const runs = (rows) =>
//   rows.flatMap((row, r) => [...row.matchAll(/#+/g)].map((m) => [m.index, r, m[0].length]));
// const runPath = (list, x0, y0, px) =>
//   list.map(([c, r, n]) => `M${x0 + c * px} ${y0 + r * px}h${n * px}v${px}h${-n * px}z`).join("");

// const DINO_BODY = runPath(runs(DINO), DINO_X, DINO_Y, PX);
// const dinoPart = (list) => runPath(list, DINO_X, DINO_Y, PX);

// const FISH = ["#...###..", "##.#####.", "#########", "##.#####.", "#...###.."]; // faces right
// const FISH_PATH = runPath(runs(FISH), 0, 0, 2);

// /* hand position (the tip of the arm) and rod / line geometry */
// const HAND = [DINO_X + 21 * PX + 3, DINO_Y + 11 * PX + 2];
// const TIP = [302, 64];
// const ROD = `M${HAND[0] - 4} ${HAND[1] + 6} Q190 ${HAND[1] - 120} ${TIP[0]} ${TIP[1]}`;
// const LINE = `M${TIP[0]} ${TIP[1]} Q${TIP[0] + 22} 190 ${f(HOLE_C[0])} ${f(HOLE_C[1] + WATER_DROP / 2 - 6)}`;

// const SPARKLE = "M0 -9 Q.7 -.7 9 0 Q.7 .7 0 9 Q-.7 .7 -9 0 Q-.7 -.7 0 -9Z";

// const CSS = `
// .fd-edge path { fill: var(--accent-hover); stroke: var(--text); stroke-width: 3; }
// .fd-side { fill: var(--accent-hover); stroke: var(--accent-hover); stroke-width: 1.5; }
// .fd-top { fill: color-mix(in srgb, var(--accent) 38%, var(--bg)); stroke: var(--text); stroke-width: 3; }
// .fd-ice { fill: var(--accent-soft); stroke: var(--text); stroke-width: 3; }
// .fd-ice-edge { fill: color-mix(in srgb, var(--accent) 30%, var(--surface-alt)); stroke: var(--text); stroke-width: 3; }
// .fd-hill { fill: color-mix(in srgb, var(--accent) 14%, var(--bg)); stroke: var(--border); stroke-width: 2; }
// .fd-line { fill: none; stroke: var(--border); stroke-width: 1.6; opacity: .9; }
// .fd-shine { fill: var(--bg); opacity: .55; }
// .fd-wall { fill: var(--accent-hover); stroke: var(--text); stroke-width: 3; }
// .fd-water { fill: var(--info); }
// .fd-ripple { fill: none; stroke: var(--bg); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: 50% 50%; animation: fd-ripple 2.8s ease-out infinite; }
// .fd-bob { animation: fd-bob 1.8s ease-in-out infinite; }
// .fd-fish { fill: var(--warning); animation: fd-nibble 2.2s ease-in-out infinite; }
// .fd-dino { fill: var(--text); }
// .fd-eye { fill: var(--bg); }
// .fd-beanie { fill: var(--accent); }
// .fd-thread { fill: var(--thread); }
// .fd-rod-o { fill: none; stroke: var(--text); stroke-width: 6; stroke-linecap: round; }
// .fd-rod { fill: none; stroke: var(--thread); stroke-width: 3; stroke-linecap: round; }
// .fd-string { fill: none; stroke: var(--text); stroke-width: 1.6; stroke-linecap: round; }
// .fd-bubble { fill: var(--bg); stroke: var(--text); stroke-width: 3; stroke-linejoin: round; }
// .fd-txt { fill: var(--text); font-family: var(--font-heading); font-weight: 700; font-size: 17px; text-anchor: middle; }
// .fd-txt-err { fill: var(--error); }
// .fd-shadow { fill: var(--text); opacity: .14; }
// .fd-spark { fill: var(--accent); transform-box: fill-box; transform-origin: 50% 50%; animation: fd-twinkle 2.6s ease-in-out infinite; }
// .fd-float { animation: fd-float 3s ease-in-out infinite alternate; }
// .fd-tail { transform-box: fill-box; transform-origin: 0% 50%; }
// @keyframes fd-bob { 0%, 100% { transform: translateY(-1.5px); } 50% { transform: translateY(1.5px); } }
// @keyframes fd-ripple { 0% { transform: scale(.25); opacity: .9; } 100% { transform: scale(1); opacity: 0; } }
// @keyframes fd-nibble { 0%, 100% { transform: translate(0, 0); } 40% { transform: translate(3px, -1px); } 55% { transform: translate(1px, 1px); } 70% { transform: translate(4px, 0); } }
// @keyframes fd-twinkle { 0%, 100% { transform: scale(.35) rotate(0); opacity: .3; } 50% { transform: scale(1) rotate(45deg); opacity: 1; } }
// @keyframes fd-float { 0% { transform: translateY(0); } 100% { transform: translateY(-4px); } }
// @media (prefers-reduced-motion: reduce) {
//   .fd-bob, .fd-ripple, .fd-fish, .fd-spark, .fd-float { animation: none; }
//   .fd-ripple { opacity: .5; transform: scale(.7); }
//   .fd-spark { opacity: 1; transform: scale(.8); }
// }
// `;

// export default function FishingDino404({ className = "", decorative = false }) {
//   const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
//   const holeClip = `fd-hole-${uid}`;
//   const floorGrad = `fd-floor-${uid}`;
//   const floorClip = `fd-sheet-${uid}`;
//   const [hx, hy] = HOLE_C;
//   const wy = hy + WATER_DROP / 2; // visible water centre

//   // converging lines drawn on the floor toward the vanishing point
//   const rays = [-420, -250, -110, 40, 180, 340, 500, 640, 780, 920];

//   return (
//     <svg
//       viewBox="0 0 640 410"
//       className={`block h-auto w-full ${className}`}
//       role={decorative ? undefined : "img"}
//       aria-label={decorative ? undefined : "A big 404 laid on an icy floor. The zero is a hole in the ice, and a pixel dinosaur in a beanie is fishing in it."}
//       aria-hidden={decorative ? true : undefined}
//       preserveAspectRatio="xMidYMid meet"
//     >
//       <style>{CSS}</style>
//       <defs>
//         <linearGradient id={floorGrad} x1="0" y1="0" x2="0" y2="1">
//           <stop offset="0" style={{ stopColor: "var(--surface-alt)" }} />
//           <stop offset="1" style={{ stopColor: "var(--accent-soft)" }} />
//         </linearGradient>
//         <clipPath id={floorClip}>
//           <path d="M72 110 H568 L640 396 H0Z" />
//         </clipPath>
//         <clipPath id={holeClip}>
//           <path d={HOLE} />
//         </clipPath>
//       </defs>

//       {/* ---------- far ice hills ---------- */}
//       <path className="fd-hill" d="M40 112 L110 62 L150 92 L205 44 L262 100 L300 80 L350 112Z" />
//       <path className="fd-hill" d="M420 112 L478 70 L520 96 L574 52 L612 112Z" />

//       {/* ---------- the icy floor, drawn in perspective ---------- */}
//       <path d="M64 396 L0 408 H640 L576 396Z" className="fd-ice-edge" />
//       <path d="M72 110 H568 L640 396 H0Z" fill={`url(#${floorGrad})`} stroke="var(--text)" strokeWidth="3" strokeLinejoin="round" />
//       <g clipPath={`url(#${floorClip})`}>
//         {rays.map((x) => (
//           <path key={x} className="fd-line" d={`M${CX} ${YH} L${x} 396`} />
//         ))}
//       </g>
//       {[0.08, 0.2, 0.36, 0.56, 0.8].map((t) => {
//         const y = YH + (396 - YH) * t;
//         return <path key={t} className="fd-line" d={`M${f(72 - 72 * t)} ${f(y)} H${f(568 + 72 * t)}`} clipPath={`url(#${floorClip})`} />;
//       })}
//       {/* shiny streaks */}
//       <path className="fd-shine" d="M120 150 L150 150 L128 176 L96 176Z" />
//       <path className="fd-shine" d="M470 140 L520 140 L538 168 L488 168Z" />
//       <path className="fd-shine" d="M520 330 L560 330 L566 350 L518 350Z" />

//       {/* ---------- dinosaur shadow ---------- */}
//       <ellipse className="fd-shadow" cx={DINO_X + 58} cy={DINO_Y + 24 * PX + 3} rx="68" ry="8" />

//       {/* ---------- 404 standing on the ice ---------- */}
//       <Slab side={FOUR_L} top={FOUR_L} />
//       <Slab side={FOUR_R} top={FOUR_R} />
//       <Slab side={ZERO_OUT} top={ZERO_TOP} evenodd />

//       {/* ---------- inside the hole ---------- */}
//       <path className="fd-wall" d={HOLE} />
//       <g clipPath={`url(#${holeClip})`}>
//         <path className="fd-water" d={HOLE} transform={`translate(0 ${WATER_DROP})`} />
//         <path d={HOLE} transform={`translate(0 ${WATER_DROP})`} fill="none" stroke="var(--bg)" strokeWidth="2" opacity="0.5" />
//         {[0, -0.9, -1.8].map((delay) => (
//           <ellipse key={delay} className="fd-ripple" cx={hx} cy={wy} rx="22" ry="7" style={{ animationDelay: `${delay}s` }} />
//         ))}
//         {/* line + hook under the water */}
//         <path className="fd-string" d={`M${f(hx)} ${f(wy)} V${f(wy + 13)} a4.5 4.5 0 0 1 -9 0 l1.5 -3.5`} strokeLinejoin="round" />
//         {/* the fish */}
//         <g transform={`translate(${f(hx - 20)} ${f(wy + 4)})`}>
//           <g className="fd-fish">
//             <path d={FISH_PATH} />
//           </g>
//         </g>
//       </g>
//       <path d={HOLE} fill="none" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round" />

//       {/* ---------- the dinosaur ---------- */}
//       <g>
//         <path className="fd-dino" d={DINO_BODY} />
//         <path className="fd-beanie" d={dinoPart(BEANIE)} />
//         <path className="fd-thread" d={dinoPart(CUFF)} />
//         <path className="fd-thread" d={dinoPart(POM)} />
//         <path className="fd-thread" d={dinoPart(SCARF)} />
//         <path className="fd-eye" d={dinoPart(EYE)} />
//       </g>

//       {/* ---------- rod, line, bobber ---------- */}
//       <path className="fd-rod-o" d={ROD} />
//       <path className="fd-rod" d={ROD} />
//       <circle cx={TIP[0]} cy={TIP[1]} r="3" fill="var(--text)" />
//       <path className="fd-string" d={LINE} />
//       <g transform={`translate(${f(hx)} ${f(wy - 1)})`}>
//         <g className="fd-bob">
//           <path d="M-5.5 0 a5.5 5.5 0 0 1 11 0Z" fill="var(--error)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
//           <path d="M-5.5 0 a5.5 5.5 0 0 0 11 0Z" fill="var(--bg)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
//         </g>
//       </g>

//       {/* ---------- speech bubble ---------- */}
//       <g transform="translate(12 104)">
//         <g className="fd-float">
//           <path className="fd-bubble" d="M12 0 H138 Q150 0 150 12 V46 Q150 58 138 58 H112 L106 76 L92 58 H12 Q0 58 0 46 V12 Q0 0 12 0Z" />
//           <text className="fd-txt fd-txt-err" x="75" y="24">Error 404</text>
//           <text className="fd-txt" x="75" y="46">no fish found</text>
//         </g>
//       </g>

//       {/* ---------- sparkles ---------- */}
//       {[
//         { x: 70, y: 40, d: "0s" },
//         { x: 250, y: 28, d: "1.1s" },
//         { x: 560, y: 36, d: "0.6s" },
//         { x: 430, y: 60, d: "1.7s" },
//       ].map((s) => (
//         <g key={s.x} transform={`translate(${s.x} ${s.y})`}>
//           <path d={SPARKLE} className="fd-spark" style={{ animationDelay: s.d }} />
//         </g>
//       ))}
//     </svg>
//   );
// }








import { useEffect, useState } from "react";

/* ==========================================================================
   FishingDino404
   "404" is written on an icy floor as three raised slabs seen in perspective.
   The middle 0 is a hole in the ice (a pond). A dinosaur (a T-rex-style
   theropod in a beanie) stands in front and fishes: the rod arcs over the
   floor and the line drops into the middle of the 0.

   - Flat, outlined art like the other art files. Colours come only from your
     theme variables / Tailwind theme classes, so light and dark both work.
   - Perspective: one tiny camera function, proj(X, Y, Z), turns a floor point
     (X sideways, Y height, Z distance away) into screen x/y. The letters, pond,
     ripples and floor lines all use it, so the hook lands in the middle of the
     0 at any size. Change the CAMERA / LAYOUT numbers to move things.
   - Responsive: the svg fills the width and keeps its shape. Phones get a
     tighter crop of the same drawing and a bigger speech bubble so the text
     stays readable.
   - Reduced motion: no animation, you see the finished scene.
   - Class names start with "fd-" so they cannot clash with yours.
   ========================================================================== */

const VIEW_WIDE = "0 0 800 540";
const VIEW_NARROW = "0 40 800 500";

/* ---------- CAMERA ---------- */
const CX = 500; // screen x of the vanishing point
const HZ = 110; // screen y of the horizon
const F = 240; // focal length (bigger = flatter)
const CAM = 100; // camera height above the floor

const proj = (X, Y, Z) => [CX + (F * X) / Z, HZ + (F * (CAM - Y)) / Z];
const n1 = (n) => n.toFixed(1);
const ring2path = (pts) => `M${pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join("L")}Z`;

/* ---------- LETTERS ---------- */
const Z0 = 100; // near edge of the letters
const SLAB = 14; // letter thickness

// u = sideways, v = depth (v = 150 is the TOP of the letter, far from the camera)
const FOUR = [
  [[54, 150], [54, 52], [60, 52], [60, 36], [54, 36], [54, 0], [38, 0], [38, 36], [0, 36], [0, 52], [36, 150]],
  [[16, 52], [38, 52], [38, 112]],
];
const ellipse = (cu, cv, ru, rv, n = 56) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return [cu + ru * Math.cos(t), cv + rv * Math.sin(t)];
  });
const ZERO = [ellipse(30, 75, 30, 75), ellipse(30, 75, 14, 59)]; // rim, pond hole

const LETTERS = [
  { ox: -114, rings: FOUR },
  { ox: -30, rings: ZERO, zero: true },
  { ox: 54, rings: FOUR },
];

const world = (ring, ox) => ring.map(([u, v]) => [ox + u, Z0 + v]);

const GEOM = LETTERS.map(({ ox, rings, zero }) => {
  const wr = rings.map((r) => world(r, ox));
  const sides = [];
  wr.forEach((r) => {
    r.forEach((a, i) => {
      const b = r[(i + 1) % r.length];
      sides.push({
        z: (a[1] + b[1]) / 2,
        d: ring2path([proj(a[0], 0, a[1]), proj(b[0], 0, b[1]), proj(b[0], SLAB, b[1]), proj(a[0], SLAB, a[1])]),
      });
    });
  });
  sides.sort((p, q) => q.z - p.z); // far first
  const top = wr.map((r) => ring2path(r.map(([X, Z]) => proj(X, SLAB, Z)))).join("");
  return { zero, sides, top };
});

/* ---------- POND (inside the 0) AND HOOK ---------- */
const POND = world(ZERO[1], -30);
const POND_PATH = ring2path(POND.map(([X, Z]) => proj(X, 0, Z)));
const HOOK_Z = Z0 + 75;
const [HX, HY] = proj(0, 0, HOOK_Z);
const RIPPLES = [4, 8, 12].map((r) =>
  ring2path(ellipse(0, HOOK_Z, r, r, 36).map(([X, Z]) => proj(X, 0, Z)))
);

/* ---------- FLOOR LINES ---------- */
const BOARD_X = Array.from({ length: 31 }, (_, i) => -900 + i * 60);
const SEAM_Z = [90, 110, 135, 165, 200, 245, 300, 370, 460, 580, 740, 950, 1250, 1700, 2400];

/* ---------- DINOSAUR (drawn around its feet at 0,0, facing right) ---------- */
const DX = 180;
const DY = 522;
const DS = 0.62;
const HAND = [DX + 102 * DS, DY - 110 * DS];
const TIP = [490, 80];
const ROD = `M${n1(HAND[0])} ${n1(HAND[1] - 2)} Q400 420 ${TIP[0]} ${TIP[1]}`;
const LINE = `M${TIP[0]} ${TIP[1]} Q504 120 ${n1(HX)} ${n1(HY - 10)}`;

// One outline: snout, skull, neck, back, tail, thigh, foot, shin, belly, chest, throat, jaw.
const DINO =
  "M216 -196 C206 -214 176 -226 146 -222 C118 -218 104 -196 92 -172 C82 -152 66 -142 40 -142 " +
  "C10 -142 -20 -150 -50 -146 C-100 -140 -170 -112 -250 -64 L-254 -56 C-170 -80 -110 -78 -78 -66 " +
  "C-84 -50 -66 -30 -52 -2 L-52 0 H8 C16 0 16 -9 8 -10 L-20 -12 C-14 -34 -2 -48 8 -62 " +
  "C14 -72 14 -80 20 -88 C34 -84 52 -90 66 -102 C82 -112 92 -128 100 -150 C108 -168 124 -178 150 -180 " +
  "L204 -176 C212 -178 218 -188 216 -196Z";

// Spine plates: [x, y on the back line, height]
const PLATES = [
  [70, -148, 16], [44, -143, 16], [18, -145, 16], [-8, -148, 15], [-34, -148, 15],
  [-62, -143, 14], [-92, -135, 12], [-125, -124, 10], [-160, -110, 8],
];

const SPARKLE = "M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z";

const CSS = `
.fd-float { animation: fd-float 3.4s ease-in-out infinite; }
.fd-bob { animation: fd-bob 1.8s ease-in-out infinite; }
.fd-ripple { transform-box: fill-box; transform-origin: 50% 50%; opacity: 0; animation: fd-ripple 2.8s ease-out infinite; }
.fd-fish { animation: fd-nibble 2.2s ease-in-out infinite; }
.fd-twinkle { transform-box: fill-box; transform-origin: 50% 50%; animation: fd-twinkle 2.6s ease-in-out infinite; }

.fd-l-top { fill: var(--brown); stroke: color-mix(in srgb, var(--brown) 65%, white); stroke-width: 1.4; stroke-linejoin: round; }
.fd-l-side { fill: color-mix(in srgb, var(--brown) 55%, black); stroke: color-mix(in srgb, var(--brown) 55%, black); stroke-width: .6; }
.fd-z-top { fill: var(--thread); stroke: color-mix(in srgb, var(--thread) 60%, white); stroke-width: 1.4; stroke-linejoin: round; }
.fd-z-side { fill: color-mix(in srgb, var(--thread) 55%, black); stroke: color-mix(in srgb, var(--thread) 55%, black); stroke-width: .6; }
.fd-water { fill: color-mix(in srgb, var(--info) 45%, var(--bg)); }
.fd-rip { fill: none; stroke: color-mix(in srgb, var(--accent) 55%, white); stroke-width: 1.8; }
.fd-floor-line { stroke: var(--border); stroke-width: 1.3; fill: none; opacity: .85; }

@keyframes fd-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes fd-bob { 0%, 100% { transform: translateY(-1.5px); } 50% { transform: translateY(2.5px); } }
@keyframes fd-ripple { 0% { transform: scale(0.3); opacity: 0.9; } 100% { transform: scale(1); opacity: 0; } }
@keyframes fd-nibble { 0%, 100% { transform: translate(0, 0); } 40% { transform: translate(-3px, -1px); } 55% { transform: translate(-1px, 1px); } 70% { transform: translate(-4px, 0); } }
@keyframes fd-twinkle { 0%, 100% { transform: scale(0.35) rotate(0deg); opacity: 0.25; } 50% { transform: scale(1) rotate(45deg); opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .fd-root * { animation: none !important; }
  .fd-ripple { opacity: .5; transform: scale(.7); }
  .fd-twinkle { opacity: 1; transform: scale(.8); }
}
`;

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

// A "tube" is a thick outline with a thinner coloured stroke on top.
function Tube({ d, outer, inner, stroke }) {
  return (
    <>
      <path d={d} className="stroke-text" strokeWidth={outer} fill="none" strokeLinecap="round" />
      <path d={d} className={stroke} strokeWidth={inner} fill="none" strokeLinecap="round" />
    </>
  );
}

export default function FishingDino404({ className = "w-full h-auto", decorative = false }) {
  const narrow = useNarrow();
  const a11y = decorative
    ? { "aria-hidden": true }
    : {
        role: "img",
        "aria-label": "404 written on an icy floor. The zero is a hole in the ice, and a dinosaur in a beanie is fishing in it.",
      };

  return (
    <svg
      className={`fd-root block ${className}`}
      viewBox={narrow ? VIEW_NARROW : VIEW_WIDE}
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y}
    >
      <style>{CSS}</style>
      <defs>
        <clipPath id="fd-pond">
          <path d={POND_PATH} />
        </clipPath>
        <clipPath id="fd-floor">
          <rect x="0" y={HZ} width="800" height={540 - HZ} />
        </clipPath>
        <clipPath id="fd-dino">
          <path d={DINO} />
        </clipPath>
        <clipPath id="fd-far-leg">
          <rect x="-30" y="-92" width="220" height="110" />
        </clipPath>
        <filter id="fd-soft" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* ---------- wall ---------- */}
      <rect width="800" height={HZ} className="fill-surface" />
      <rect y={HZ - 16} width="800" height="16" className="fill-surface-alt" />
      <line x1="0" y1={HZ} x2="800" y2={HZ} className="stroke-text" strokeWidth="3" />
      <g transform="translate(610 14)">
        <rect width="130" height="78" rx="6" className="fill-bg stroke-text" strokeWidth="4" />
        <rect x="5" y="5" width="120" height="68" className="fill-accent-soft" />
        <line x1="65" y1="5" x2="65" y2="73" className="stroke-text" strokeWidth="3" />
        <line x1="5" y1="39" x2="125" y2="39" className="stroke-text" strokeWidth="3" />
        <circle cx="96" cy="22" r="9" className="fill-thread" opacity="0.8" />
      </g>

      {/* ---------- icy floor ---------- */}
      <rect y={HZ} width="800" height={540 - HZ} className="fill-accent-soft" />
      <g clipPath="url(#fd-floor)">
        {BOARD_X.map((X) => {
          const [x1, y1] = proj(X, 0, 85);
          const [x2, y2] = proj(X, 0, 4000);
          return <line key={X} x1={n1(x1)} y1={n1(y1)} x2={n1(x2)} y2={n1(y2)} className="fd-floor-line" />;
        })}
        {SEAM_Z.map((Z) => {
          const [x1, y1] = proj(-1500, 0, Z);
          const [x2, y2] = proj(1500, 0, Z);
          return <line key={Z} x1={n1(x1)} y1={n1(y1)} x2={n1(x2)} y2={n1(y2)} className="fd-floor-line" />;
        })}
        {/* cracks in the ice */}
        <g className="stroke-text" strokeWidth="2.5" opacity="0.28">
          <path d="M640 478 l24 -14 l-8 -12 l22 -12" />
          <path d="M96 392 l-18 12 l10 10" />
          <path d="M700 330 l16 10 l-6 12" />
        </g>
      </g>

      {/* ---------- pond water inside the 0, with what lives in it ---------- */}
      <path d={POND_PATH} className="fd-water" />
      <g clipPath="url(#fd-pond)">
        {RIPPLES.map((d, i) => (
          <path key={i} d={d} className="fd-ripple fd-rip" style={{ animationDelay: `${-i * 0.9}s` }} />
        ))}
        {/* little fish nibbling the hook */}
        <g transform={`translate(${n1(HX + 4)} ${n1(HY + 40)}) scale(.6)`}>
          <g className="fd-fish">
            <ellipse rx="14" ry="7" className="fill-warning stroke-text" strokeWidth="3" />
            <path d="M12 0 L23 -7 L23 7Z" className="fill-warning stroke-text" strokeWidth="3" />
            <circle cx="-7" cy="-1.5" r="1.8" className="fill-text" />
          </g>
        </g>
        {/* line and hook under the surface */}
        <path
          d={`M${n1(HX)} ${n1(HY + 4)} V${n1(HY + 30)} a6 6 0 0 1 -12 0 l3 -4`}
          className="stroke-text"
          strokeWidth="2"
          fill="none"
          opacity="0.9"
        />
      </g>

      {/* ---------- the letters lying on the floor ---------- */}
      <g filter="url(#fd-soft)">
        {GEOM.map((g, i) => (
          <g key={i}>
            {g.sides.map((s, j) => (
              <path key={j} d={s.d} className={g.zero ? "fd-z-side" : "fd-l-side"} />
            ))}
            <path d={g.top} fillRule="evenodd" className={g.zero ? "fd-z-top" : "fd-l-top"} />
          </g>
        ))}
      </g>

      {/* ---------- the dinosaur ---------- */}
      <ellipse cx={DX - 24} cy={DY + 3} rx="105" ry="8" className="fill-text" opacity="0.13" />
      <g transform={`translate(${DX} ${DY}) scale(${DS})`}>
        {/* far leg, only the part that shows below the belly */}
        <g clipPath="url(#fd-far-leg)">
          <path d={DINO} transform="translate(34 0)" className="fill-accent-hover stroke-text" strokeWidth="5" />
        </g>

        {/* spine plates (behind the body) */}
        {PLATES.map(([x, y, h]) => (
          <path
            key={x}
            d={`M${x - 8} ${y + 4} L${x - 3} ${y - h} L${x + 8} ${y + 4}Z`}
            className="fill-thread stroke-text"
            strokeWidth="3.5"
          />
        ))}

        {/* body */}
        <path d={DINO} className="fill-accent stroke-text" strokeWidth="5" />

        {/* lighter underside + skin spots, kept inside the outline */}
        <g clipPath="url(#fd-dino)">
          <path
            d="M104 -156 C90 -126 66 -100 30 -92 C-10 -90 -50 -84 -90 -80"
            className="stroke-accent-soft"
            strokeWidth="24"
            fill="none"
          />
          <g className="fill-accent-hover" opacity="0.5">
            <ellipse cx="30" cy="-124" rx="6" ry="4" />
            <ellipse cx="-6" cy="-128" rx="5" ry="3.5" />
            <ellipse cx="-44" cy="-120" rx="6" ry="4" />
            <ellipse cx="-86" cy="-106" rx="5" ry="3" />
            <ellipse cx="-128" cy="-92" rx="4" ry="2.5" />
          </g>
        </g>
        <path d={DINO} className="stroke-text" strokeWidth="5" fill="none" />

        {/* toes */}
        <path d="M-6 0 V-8 M-24 -10 L-26 0" className="stroke-text" strokeWidth="3" fill="none" />

        {/* scarf */}
        <Tube d="M76 -160 Q100 -140 92 -116" outer={22} inner={14} stroke="stroke-thread" />
        <Tube d="M80 -128 Q70 -108 76 -88" outer={16} inner={9} stroke="stroke-thread" />

        {/* face */}
        <circle cx="156" cy="-203" r="5.5" className="fill-bg stroke-text" strokeWidth="2.5" />
        <circle cx="158" cy="-203" r="2.5" className="fill-text" />
        <path d="M146 -212 Q158 -217 169 -210" className="stroke-text" strokeWidth="3.5" fill="none" />
        <circle cx="205" cy="-196" r="2.2" className="fill-text" />
        <path d="M214 -187 C192 -180 168 -182 150 -190 l-4 -6" className="stroke-text" strokeWidth="3" fill="none" />
        <path d="M198 -184 l3 6 l4 -7Z M180 -183 l3 6 l4 -7Z" className="fill-bg stroke-text" strokeWidth="1.5" />

        {/* beanie */}
        <path d="M112 -214 C106 -252 168 -260 172 -218Z" className="fill-brown stroke-text" strokeWidth="4.5" />
        <rect x="108" y="-228" width="68" height="15" rx="7" className="fill-bg stroke-text" strokeWidth="4" />
        <circle cx="142" cy="-262" r="9" className="fill-thread stroke-text" strokeWidth="3.5" />

        {/* tiny arm + hand holding the rod */}
        <Tube d="M64 -122 Q84 -104 102 -110" outer={16} inner={9} stroke="stroke-accent" />
        <circle cx="102" cy="-110" r="6.5" className="fill-accent stroke-text" strokeWidth="3.5" />
      </g>

      {/* ---------- rod, line and bobber ---------- */}
      <path d={ROD} className="stroke-bg" strokeWidth="10" opacity="0.9" />
      <path d={ROD} className="stroke-thread" strokeWidth="5" />
      <circle cx={HAND[0]} cy={HAND[1]} r="4.5" className="fill-brown stroke-text" strokeWidth="2" />
      <circle cx={TIP[0]} cy={TIP[1]} r="3.5" className="fill-text" />
      <path d={LINE} className="stroke-text" strokeWidth="2" opacity="0.85" />
      <g transform={`translate(${n1(HX)} ${n1(HY - 4)})`}>
        <g className="fd-bob">
          <path d="M-7 0 a7 7 0 0 1 14 0Z" className="fill-error stroke-text" strokeWidth="2.5" />
          <path d="M-7 0 a7 7 0 0 0 14 0Z" className="fill-bg stroke-text" strokeWidth="2.5" />
        </g>
      </g>

      {/* ---------- speech bubble (bigger on phones) ---------- */}
      <g transform={narrow ? "translate(10 262) scale(1.2)" : "translate(40 296)"}>
        <g className="fd-float">
          <path
            d="M14 0 H186 Q200 0 200 14 V38 Q200 52 186 52 H160 L190 100 L128 52 H14 Q0 52 0 38 V14 Q0 0 14 0Z"
            className="fill-bg stroke-text"
            strokeWidth="3.5"
            filter="url(#fd-soft)"
          />
          <text x="100" y="33" textAnchor="middle" className="font-heading fill-text" fontSize="18" fontWeight="700">
            404 fish not found
          </text>
        </g>
      </g>

      {/* ---------- sparkles ---------- */}
      {[
        { x: 560, y: 52, s: 0.8, d: "0s" },
        { x: 380, y: 38, s: 0.6, d: "0.9s" },
        { x: 740, y: 150, s: 0.7, d: "1.7s" },
        { x: 52, y: 250, s: 0.7, d: "0.4s" },
      ].map((s) => (
        <g key={s.x} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
          <path d={SPARKLE} className="fd-twinkle fill-accent" style={{ animationDelay: s.d }} />
        </g>
      ))}
    </svg>
  );
}