import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, CreditCard, Palette, Shirt, Truck } from "lucide-react";

/* ==========================================================================
   ORDER PATH: one smooth, curvy, stitched line that fits in ONE viewport height.
   - It starts drawing only when the section is really on screen (about 60% visible),
     plays once, and takes a fixed time. It is NOT tied to scroll speed.
   - If the tab is hidden while it draws, it pauses and carries on when you come back
     (no sudden jump).
   - A round arrow head travels at the tip of the line and turns with the curve.
   - Wide screens: the line waves left to right. Phones: top to bottom, labels on the right.
   Colours come only from your index.css variables.
   ========================================================================== */

/* ---- Content: edit freely ---- */
const TITLE = "From idea to your door";
const STEPS = [
  { icon: Shirt, title: "Pick a design", text: "Choose a ready-made piece from the shop, or start your own custom design." },
  { icon: Palette, title: "Make it yours", text: "Pick size and colour. For custom pieces, upload your artwork and add notes." },
  { icon: CreditCard, title: "Checkout and confirm", text: "Review your cart, pay and confirm. Custom orders get a price check first." },
  { icon: Box, title: "We make and pack", text: "Ready-made pieces are packed right away. Custom ones are made to order." },
  { icon: Truck, title: "Tracked delivery", text: "Follow your parcel from our door to yours." },
];

/* ---- Sizes and timing: tweak here ---- */
const WIDE_AT = 768; // px: this width and above uses the left-to-right layout
const NODE_WIDE = 56; // step circle size (px)
const NODE_NARROW = 44;
const DRAW_MS = 4200; // how long the line takes to draw
const START_VISIBLE = 0.6; // share of the section that must be on screen before it starts
const LINE_WIDTH = 14; // thickness of the path (px)
const SECTION_HEIGHT = "h-[calc(100dvh-var(--header-h,4.5rem))] min-h-[34rem]";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- Geometry ---------- */
function buildLayout(w, h, wide) {
  const n = STEPS.length;
  const node = wide ? NODE_WIDE : NODE_NARROW;

  if (wide) {
    const nodes = STEPS.map((_, i) => ({
      x: w * (0.12 + (0.76 * i) / (n - 1)),
      y: h * (i % 2 === 0 ? 0.64 : 0.34),
      above: i % 2 === 1,
    }));
    return { node, nodes, lead: [{ x: 0, y: h * 0.5 }, { x: w, y: h * 0.5 }], labelW: clamp(w * 0.24, 130, 250) };
  }

  const xa = node / 2 + 12;
  const xb = xa + clamp(w * 0.2, 40, 90);
  const labelLeft = xb + node / 2 + 18;
  const nodes = STEPS.map((_, i) => ({
    x: i % 2 === 0 ? xa : xb,
    y: h * (0.09 + (0.82 * i) / (n - 1)),
    labelLeft,
  }));
  return {
    node,
    nodes,
    lead: [{ x: nodes[0].x, y: 0 }, { x: nodes[n - 1].x, y: h }],
    labelW: Math.max(110, w - labelLeft - 4),
  };
}

function curveSegments(pts) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    segs.push([
      p1,
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p2,
    ]);
  }
  return segs;
}

const bezierLength = ([a, b, c, d]) => {
  let len = 0;
  let prev = a;
  for (let t = 1; t <= 32; t++) {
    const u = t / 32;
    const m = 1 - u;
    const x = m * m * m * a.x + 3 * m * m * u * b.x + 3 * m * u * u * c.x + u * u * u * d.x;
    const y = m * m * m * a.y + 3 * m * m * u * b.y + 3 * m * u * u * c.y + u * u * u * d.y;
    len += Math.hypot(x - prev.x, y - prev.y);
    prev = { x, y };
  }
  return len;
};

const f = (n) => Math.round(n * 10) / 10;

function buildPath(layout) {
  const pts = [layout.lead[0], ...layout.nodes, layout.lead[1]];
  const segs = curveSegments(pts);
  const d =
    `M${f(pts[0].x)},${f(pts[0].y)}` +
    segs.map(([, c1, c2, p]) => ` C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(p.x)},${f(p.y)}`).join("");

  const lengths = segs.map(bezierLength);
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  let run = 0;
  const marks = layout.nodes.map((_, i) => {
    run += lengths[i];
    return run / total;
  });
  return { d, marks };
}

/* ---------- Hooks ---------- */
function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// True once the section has been (mostly) on screen. It never goes back to false.
function useSeen(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: START_VISIBLE },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

// 0 -> 1 over DRAW_MS once `start` is true. A hidden tab pauses it (frame gaps are capped,
// so coming back never makes it jump).
function useDrawProgress(start) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (prefersReducedMotion()) {
      setP(1);
      return;
    }
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    const tick = (now) => {
      if (last) elapsed += Math.min(now - last, 50); // cap the gap
      last = now;
      const t = clamp(elapsed / DRAW_MS, 0, 1);
      setP(easeInOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);
  return p;
}

/* ---------- Component ---------- */
export default function OrderPath() {
  const sectionRef = useRef(null);
  const areaRef = useRef(null);
  const pathRef = useRef(null);
  const headRef = useRef(null);

  const { w, h } = useSize(areaRef);
  const seen = useSeen(sectionRef);
  const p = useDrawProgress(seen);
  const wide = w >= WIDE_AT;

  const ready = w > 0 && h > 0;
  const layout = ready ? buildLayout(w, h, wide) : null;
  const geometry = layout ? buildPath(layout) : null;
  const d = geometry?.d;

  // Move the arrow head to the tip of the line and turn it along the curve
  useEffect(() => {
    const path = pathRef.current;
    const head = headRef.current;
    if (!path || !head || !d) return;
    const total = path.getTotalLength();
    const at = total * p;
    const a = path.getPointAtLength(Math.max(0, at - 2));
    const b = path.getPointAtLength(Math.min(total, at + 2));
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    head.setAttribute("transform", `translate(${b.x} ${b.y}) rotate(${angle})`);
  }, [p, d]);

  const headVisible = p > 0.002 && p < 0.995;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="order-path-title"
      className={`relative flex flex-col overflow-hidden px-4 py-6 sm:px-6 sm:py-8 ${SECTION_HEIGHT}`}
    >
      <h2
        id="order-path-title"
        className="font-display text-4xl leading-[0.9] font-bold tracking-[0.01em] text-text uppercase sm:text-6xl lg:text-7xl"
      >
        {TITLE}
      </h2>

      <div ref={areaRef} className="relative mt-2 min-h-0 flex-1">
        {ready && (
          <>
            <svg
              aria-hidden="true"
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              className="pointer-events-none absolute inset-0 overflow-visible"
              fill="none"
            >
              {/* the empty ribbon */}
              <path d={d} className="stroke-surface-alt" strokeWidth={LINE_WIDTH} strokeLinecap="round" />
              <path d={d} className="stroke-border" strokeWidth={LINE_WIDTH} strokeLinecap="round" opacity="0.55" />

              {/* the filled ribbon, drawn with pathLength="1" so a 0..1 value controls it */}
              <path
                ref={pathRef}
                d={d}
                pathLength="1"
                className="stroke-accent"
                strokeWidth={LINE_WIDTH}
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset={1 - p}
                style={{ opacity: p > 0.002 ? 1 : 0 }}
              />

              {/* stitches along the whole ribbon, like thread */}
              <path
                d={d}
                className="stroke-bg"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="7 9"
                opacity="0.9"
              />

              {/* the arrow head: a round badge that travels with the line and turns with it */}
              <g ref={headRef} style={{ opacity: headVisible ? 1 : 0, transition: "opacity 300ms" }}>
                <circle r="20" className="fill-accent stroke-bg" strokeWidth="4" />
                <path
                  d="M-6,-7 L7,0 L-6,7 L-3,0 Z"
                  className="fill-on-accent stroke-on-accent"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </g>
            </svg>

            <ol className="absolute inset-0 m-0 list-none p-0">
              {STEPS.map(({ icon: Icon, title, text }, i) => {
                const n = layout.nodes[i];
                const reached = p >= geometry.marks[i] - 0.01;

                const labelStyle = wide
                  ? {
                      left: n.x,
                      top: n.above ? n.y - layout.node / 2 - 16 : n.y + layout.node / 2 + 16,
                      width: layout.labelW,
                      transform: n.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
                    }
                  : { left: n.labelLeft, top: n.y, width: layout.labelW, transform: "translate(0, -50%)" };

                return (
                  <li key={title}>
                    <div
                      className={`absolute z-10 grid place-items-center rounded-full border-[3px] transition-[background-color,border-color,color,transform] duration-500 motion-reduce:transition-none ${
                        reached
                          ? "border-bg bg-accent text-on-accent shadow-soft"
                          : "border-border bg-surface text-muted"
                      }`}
                      style={{
                        left: n.x,
                        top: n.y,
                        width: layout.node,
                        height: layout.node,
                        transform: `translate(-50%, -50%) scale(${reached ? 1 : 0.88})`,
                      }}
                    >
                      <Icon size={wide ? 22 : 18} strokeWidth={2} aria-hidden="true" />
                    </div>

                    <div className="absolute" style={labelStyle}>
                      <div
                        className={`transition duration-500 motion-reduce:transition-none ${wide ? "text-center" : "text-left"} ${
                          reached ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                        }`}
                      >
                        <h3 className="font-heading text-sm leading-tight font-semibold text-text sm:text-lg">{title}</h3>
                        <p className="mt-0.5 text-xs leading-snug text-muted sm:text-sm">{text}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}