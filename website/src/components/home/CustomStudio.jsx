import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";

import { CUSTOM_STUDIO_PATH } from "../../lib/siteInfo";

/* ==========================================================================
   CUSTOM STUDIO: one viewport tall, only a short title and one animated drawing.
   The drawing loops every 12 seconds and tells the custom-order story without words:
     a plain tee is sketched, a colour is picked and floods in, a print pops onto the chest,
     a needle stitches the hem, scissors snip, a tag swings in, then it all resets.
   - The loop only runs while the section is on screen (it pauses when you scroll away).
   - Phones get a tighter crop of the same drawing so it stays big enough to read.
   - Colours come only from your theme variables. Class names start with "cs-".
   - Reduced motion: no animation, you see the finished tee.
   - learnMore (default true) shows a "Learn more" link to the custom studio page.
     The custom studio page itself passes learnMore={false}, so it does not link to itself.
   ========================================================================== */

const TITLE = "Custom made";
const SECTION_HEIGHT = "h-[calc(100dvh-var(--header-h,4.5rem))] min-h-[30rem]";
const VIEW_WIDE = "0 0 800 540";
const VIEW_NARROW = "70 40 660 480"; // a tighter crop for phones

// Shapes (all in the 800 x 540 drawing space)
const SHIRT =
  "M300 90 L344 70 C356 100 444 100 456 70 L500 90 L580 150 L544 204 L500 178 V420 H300 V178 L256 204 L220 150 Z";
const SPARKLE = "M0 -14 Q1 -1 14 0 Q1 1 0 14 Q-1 1 -14 0 Q-1 -1 0 -14Z";

const CSS = `
.cs-root:not(.cs-on) * { animation-play-state: paused !important; }
.cs-a { animation-duration: 12s; animation-iteration-count: infinite; animation-fill-mode: both; animation-timing-function: ease-in-out; }
.cs-box { transform-box: fill-box; transform-origin: 50% 50%; }

.cs-scene   { animation-name: cs-scene; }
.cs-outline { animation-name: cs-outline; }
.cs-wipe1   { animation-name: cs-wipe1; }
.cs-wipe2   { animation-name: cs-wipe2; }
.cs-print   { animation-name: cs-print; }
.cs-needle  { animation-name: cs-needle; }
.cs-snipA   { animation-name: cs-snipA; }
.cs-snipB   { animation-name: cs-snipB; }
.cs-pop     { animation-name: cs-pop; }
.cs-ring1   { animation-name: cs-ring1; }
.cs-ring2   { animation-name: cs-ring2; }
.cs-tape    { animation-name: cs-tape; transform-origin: 0% 50%; }
.cs-swing   { animation-name: cs-swing; }

.cs-stitch  { animation: cs-stitch 12s ease-in-out infinite both, cs-flow 1s linear infinite; }
.cs-bob     { animation: cs-bob 0.5s ease-in-out infinite; }
.cs-rays    { animation: cs-spin 14s linear infinite; }
.cs-spark   { animation: cs-spark 2.6s ease-in-out infinite; }

@keyframes cs-scene   { 0% { opacity: 1; } 93% { opacity: 1; } 99%, 100% { opacity: 0; } }
@keyframes cs-outline { 0% { stroke-dashoffset: 1; } 15%, 100% { stroke-dashoffset: 0; } }
@keyframes cs-wipe1   { 0%, 14% { transform: translateX(-380px); } 26%, 100% { transform: translateX(0); } }
@keyframes cs-wipe2   { 0%, 62% { transform: translateX(-380px); } 73%, 100% { transform: translateX(0); } }
@keyframes cs-print   { 0%, 27% { transform: scale(0) rotate(-40deg); } 33% { transform: scale(1.18) rotate(8deg); } 37%, 100% { transform: scale(1) rotate(0deg); } }
@keyframes cs-stitch  { 0%, 35% { opacity: 0; } 38%, 100% { opacity: 1; } }
@keyframes cs-flow    { to { stroke-dashoffset: -16; } }
@keyframes cs-needle  { 0%, 36% { opacity: 0; transform: translateX(0); } 38% { opacity: 1; transform: translateX(0); } 52% { opacity: 1; transform: translateX(176px); } 54%, 100% { opacity: 0; transform: translateX(176px); } }
@keyframes cs-bob     { 0%, 100% { transform: translateY(-6px); } 50% { transform: translateY(8px); } }
@keyframes cs-snipA   { 0%, 50%, 100% { transform: rotate(-4deg); } 53%, 57%, 61% { transform: rotate(-24deg); } 55%, 59%, 63% { transform: rotate(0deg); } }
@keyframes cs-snipB   { 0%, 50%, 100% { transform: rotate(4deg); } 53%, 57%, 61% { transform: rotate(24deg); } 55%, 59%, 63% { transform: rotate(0deg); } }
@keyframes cs-pop     { 0%, 6% { transform: scale(0); } 10% { transform: scale(1.2); } 12%, 100% { transform: scale(1); } }
@keyframes cs-ring1   { 0%, 14% { opacity: 0; } 16%, 60% { opacity: 1; } 62%, 100% { opacity: 0; } }
@keyframes cs-ring2   { 0%, 62% { opacity: 0; } 64%, 100% { opacity: 1; } }
@keyframes cs-tape    { 0%, 3% { transform: scaleX(0); } 16%, 100% { transform: scaleX(1); } }
@keyframes cs-swing   { 0%, 72% { opacity: 0; transform: rotate(0deg); } 73% { opacity: 1; transform: rotate(40deg); } 78% { transform: rotate(-28deg); } 83% { transform: rotate(18deg); } 87% { transform: rotate(-9deg); } 91% { transform: rotate(4deg); } 100% { opacity: 1; transform: rotate(0deg); } }
@keyframes cs-spark   { 0%, 100% { transform: scale(0.35) rotate(0deg); opacity: 0.2; } 50% { transform: scale(1) rotate(45deg); opacity: 1; } }
@keyframes cs-spin    { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .cs-root * { animation: none !important; }
  .cs-needle, .cs-ring1 { opacity: 0; }
}
`;

function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

// Plays only while the section is on screen
function useOnScreen(ref) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setOn(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

export default function CustomStudio({ learnMore = true }) {
  const sectionRef = useRef(null);
  const on = useOnScreen(sectionRef);
  const narrow = useNarrow();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="custom-studio-title"
      className={`cs-root flex flex-col overflow-hidden px-4 py-6 sm:px-6 sm:py-8 ${on ? "cs-on" : ""} ${SECTION_HEIGHT}`}
    >
      <style>{CSS}</style>

      <div className="flex items-end justify-between gap-4">
        <h2
          id="custom-studio-title"
          className="font-display text-4xl leading-[0.9] font-bold tracking-[0.01em] text-text uppercase sm:text-6xl lg:text-7xl"
        >
          {TITLE}
        </h2>

        {learnMore && (
          <Link
            to={CUSTOM_STUDIO_PATH}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 font-heading text-sm font-semibold text-text transition hover:border-accent hover:text-accent focus-visible:ring-4 focus-visible:ring-accent/20 sm:text-base"
          >
            Learn more
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="relative mt-2 min-h-0 flex-1">
        <svg
          role="img"
          aria-label="A plain tee is sketched, coloured, printed and stitched into a custom design"
          viewBox={narrow ? VIEW_NARROW : VIEW_WIDE}
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <clipPath id="cs-shirt-clip">
              <path d={SHIRT} />
            </clipPath>
          </defs>

          <g className="cs-a cs-scene">
            {/* ---------- colour swatches on the left ---------- */}
            {[
              { y: 190, fill: "fill-accent", delay: "0s" },
              { y: 260, fill: "fill-text", delay: "0.25s" },
              { y: 330, fill: "fill-accent-soft", delay: "0.5s" },
            ].map((s) => (
              <g key={s.y} transform={`translate(110 ${s.y})`}>
                <g className="cs-a cs-pop cs-box" style={{ animationDelay: s.delay }}>
                  <circle r="26" className={`${s.fill} stroke-text`} strokeWidth="3" />
                </g>
              </g>
            ))}
            {/* ring that jumps from the first swatch to the second */}
            <circle cx="110" cy="190" r="39" className="cs-a cs-ring1 stroke-text" strokeWidth="3" strokeDasharray="7 7" />
            <circle cx="110" cy="260" r="39" className="cs-a cs-ring2 stroke-text" strokeWidth="3" strokeDasharray="7 7" />

            {/* ---------- measuring tape under the tee ---------- */}
            <g className="cs-a cs-tape cs-box">
              <rect x="220" y="458" width="360" height="26" rx="5" className="fill-accent-soft stroke-text" strokeWidth="3" />
              <path d="M232 466 H568" className="stroke-text" strokeWidth="10" strokeLinecap="butt" strokeDasharray="2.5 15.5" />
            </g>

            {/* ---------- scissors on the right ---------- */}
            <g transform="translate(612 340)">
              <g className="cs-a cs-snipA">
                <path d="M0 0 L74 -7" className="stroke-text" strokeWidth="7" />
                <path d="M0 0 L-22 -16" className="stroke-text" strokeWidth="6" />
                <circle cx="-34" cy="-24" r="13" className="stroke-text" strokeWidth="5" />
              </g>
              <g className="cs-a cs-snipB">
                <path d="M0 0 L74 7" className="stroke-text" strokeWidth="7" />
                <path d="M0 0 L-22 16" className="stroke-text" strokeWidth="6" />
                <circle cx="-34" cy="24" r="13" className="stroke-text" strokeWidth="5" />
              </g>
              <circle r="5.5" className="fill-accent stroke-text" strokeWidth="2" />
            </g>

            {/* ---------- the tee ---------- */}
            <path d={SHIRT} className="fill-surface" />

            <g clipPath="url(#cs-shirt-clip)">
              <rect x="200" y="60" width="400" height="380" className="cs-a cs-wipe1 fill-accent" />
              <rect x="200" y="60" width="400" height="380" className="cs-a cs-wipe2 fill-text" />
            </g>

            <path
              d={SHIRT}
              pathLength="1"
              strokeDasharray="1"
              className="cs-a cs-outline stroke-text"
              strokeWidth="5"
            />
            <path d="M350 78 C362 108 438 108 450 78" className="stroke-text" strokeWidth="4" opacity="0.35" />

            {/* print: a sun that pops onto the chest, its rays slowly turning */}
            <g transform="translate(400 255)">
              <g className="cs-a cs-print cs-box">
                <circle r="24" className="fill-bg" />
                <g className="cs-rays cs-box">
                  {Array.from({ length: 8 }, (_, i) => (
                    <path
                      key={i}
                      d="M0 -40 V-56"
                      className="stroke-bg"
                      strokeWidth="6"
                      transform={`rotate(${i * 45})`}
                    />
                  ))}
                </g>
              </g>
            </g>

            {/* stitches along the hem and both cuffs */}
            <g className="cs-stitch stroke-bg" strokeWidth="3" strokeDasharray="8 8">
              <path d="M312 404 H488" />
              <path d="M258 192 L231 152" />
              <path d="M542 192 L569 152" />
            </g>

            {/* needle travelling along the hem */}
            <g transform="translate(306 404)">
              <g className="cs-a cs-needle">
                <g className="cs-bob">
                  <path d="M0 0 L10 -46" className="stroke-text" strokeWidth="4" />
                  <circle cx="9" cy="-40" r="2.5" className="fill-bg" />
                  <path d="M9 -40 C30 -70 60 -30 80 -52" className="stroke-bg" strokeWidth="3" />
                </g>
              </g>
            </g>

            {/* hang tag that swings in last */}
            <g transform="translate(432 96)">
              <g className="cs-a cs-swing">
                <path d="M0 0 V26" className="stroke-text" strokeWidth="3" />
                <rect x="-19" y="26" width="38" height="52" rx="7" className="fill-bg stroke-text" strokeWidth="3" />
                <circle cy="35" r="3" className="fill-text" />
                <path d="M0 68 C-14 56 -8 46 0 54 C8 46 14 56 0 68Z" className="fill-accent" />
              </g>
            </g>

            {/* sparkles */}
            {[
              { x: 160, y: 96, d: "0s" },
              { x: 670, y: 120, d: "0.9s" },
              { x: 700, y: 400, d: "1.7s" },
              { x: 150, y: 420, d: "0.4s" },
            ].map((s) => (
              <g key={s.x} transform={`translate(${s.x} ${s.y})`}>
                <path d={SPARKLE} className="cs-spark cs-box fill-accent" style={{ animationDelay: s.d }} />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}