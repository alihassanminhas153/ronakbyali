// src/components/home/OrderPath.jsx   (Home page, after ImageTextScroll)
//
// USAGE
//   <OrderPath />
//
// A winding path that DRAWS ITSELF as you scroll, showing how an order travels:
//   Ordering > Product processing > Packaging > Safe keeping > Dispatching > Delivery > Review
// The first and last stops are the terminals. The stops in between light up
// (and show their note) at the moment the drawn path reaches them.
//
// Responsive: wide screens get a big zig-zag with labels on the outer sides,
// phones get a gentle vertical wave with every label on the right.
// Colours come only from theme variables, so light and dark both work.

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { Cog, Package, Send, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import useScrollValue from './useScrollValue';

/* ---- Content: edit freely (first = start terminal, last = end terminal) ---- */
const STAGES = [
  { title: 'Ordering', note: 'You pick it, customise it and place your order.', icon: ShoppingBag },
  { title: 'Product processing', note: 'We confirm your design and get your piece made.', icon: Cog },
  { title: 'Packaging', note: 'Every item is checked and packed with care.', icon: Package },
  { title: 'Safe keeping', note: 'Your parcel is held securely until it is ready to go.', icon: ShieldCheck },
  { title: 'Dispatching', note: 'Handed to the courier with your tracking details.', icon: Send },
  { title: 'Delivery', note: 'Safely at your door, right on time.', icon: Truck },
  { title: 'Review', note: 'Tell us how we did and help others choose.', icon: Star },
];

/* ---------- Path geometry ----------
   Every stop sits exactly on the path. The curve is a smooth spline through the stops
   (each stop gets a vertical tangent, which makes the S-curves). The path is cut into
   one piece per stop-to-stop leg, so each leg can be drawn on its own. */
function buildPath(nodes, pre) {
  const pts = [];
  const nodeIdx = [];
  nodes.forEach(([x, y], k) => {
    if (k > 0) {
      const [px, py] = nodes[k - 1];
      pts.push({ x: (px + x) / 2, y: (py + y) / 2 }); // crossing point between two stops
    }
    const inner = k > 0 && k < nodes.length - 1;
    if (inner) pts.push({ x, y: y - pre });
    nodeIdx.push(pts.length);
    pts.push({ x, y });
    if (inner) pts.push({ x, y: y + pre });
  });
  return { pts, nodeIdx };
}

const f = (n) => Math.round(n * 10) / 10;

// SVG path text from pts[from] to pts[to] (Catmull-Rom converted to cubic curves)
function pathD(pts, from, to) {
  let d = `M${f(pts[from].x)} ${f(pts[from].y)}`;
  for (let i = from; i < to; i += 1) {
    const p1 = pts[i];
    const p0 = pts[i - 1] ?? p1;
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(
      p2.y - (p3.y - p1.y) / 6,
    )} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

function makeLayout(cfg) {
  const { pts, nodeIdx } = buildPath(cfg.nodes, cfg.pre);
  return {
    ...cfg,
    ghostD: pathD(pts, 0, pts.length - 1),
    segDs: nodeIdx.slice(0, -1).map((from, k) => pathD(pts, from, nodeIdx[k + 1])),
    points: nodeIdx.map((i) => pts[i]),
  };
}

// Wide screens (md and up): big zig-zag, labels on the OUTER side of each stop
const WIDE = makeLayout({
  key: 'wide',
  w: 1000,
  h: 2000,
  stroke: 14,
  headR: 15,
  pre: 90,
  nodes: [[230, 110], [770, 410], [230, 710], [770, 1010], [230, 1310], [770, 1610], [500, 1900]],
  offset: 3.75, // rem between a stop and its label
  chip: 'size-14',
  term: 'size-20',
  icon: 26,
  termIcon: 32,
  side: (x, w) => (x < w / 2 ? 'left' : 'right'),
});

// Phones: gentle wave near the left, every label on the right
const NARROW = makeLayout({
  key: 'narrow',
  w: 400,
  h: 2150,
  stroke: 9,
  headR: 11,
  pre: 80,
  nodes: [[75, 90], [135, 420], [75, 750], [135, 1080], [75, 1410], [135, 1740], [105, 2060]],
  offset: 2.5,
  chip: 'size-11',
  term: 'size-14',
  icon: 20,
  termIcon: 26,
  side: () => 'right',
});

const clamp = (v) => Math.min(1, Math.max(0, v));

function useMedia(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export default function OrderPath() {
  const wide = useMedia('(min-width: 768px)');
  const L = wide ? WIDE : NARROW;

  const boxRef = useRef(null);
  const segRefs = useRef([]);
  const headRef = useRef(null);
  const [lengths, setLengths] = useState([]);

  // 0..1: how much of the path is drawn. 0 when the path's top is 65% down the screen,
  // 1 when the path's last stop has come up into view.
  const { p } = useScrollValue(
    (vh) => {
      const box = boxRef.current;
      if (!box) return null;
      const rect = box.getBoundingClientRect();
      return { p: clamp((vh * 0.65 - rect.top) / (rect.height * 0.9)) };
    },
    { p: 0 },
  );

  // Measure every leg once the layout is on screen (and again when it switches)
  useLayoutEffect(() => {
    setLengths(segRefs.current.slice(0, L.segDs.length).map((el) => (el ? el.getTotalLength() : 0)));
  }, [L]);

  const total = lengths.reduce((a, b) => a + b, 0);
  const drawn = p * total;

  // How much of each leg is drawn, and which stops are complete
  let acc = 0;
  const segDrawn = lengths.map((len) => {
    const d = Math.min(Math.max(drawn - acc, 0), len);
    acc += len;
    return d;
  });
  const done = STAGES.map((_, i) => i === 0 || (lengths[i - 1] > 0 && segDrawn[i - 1] >= lengths[i - 1] - 0.5));
  const current = done.indexOf(false); // the stop the path is heading to (-1 when finished)

  // Move the glowing tip to the end of the drawn line (direct DOM update, no re-render)
  useLayoutEffect(() => {
    const head = headRef.current;
    if (!head || !total) return;
    let start = 0;
    let j = 0;
    while (j < lengths.length - 1 && drawn > start + lengths[j]) {
      start += lengths[j];
      j += 1;
    }
    const path = segRefs.current[j];
    if (!path) return;
    const pt = path.getPointAtLength(Math.min(Math.max(drawn - start, 0), lengths[j]));
    head.setAttribute('cx', pt.x);
    head.setAttribute('cy', pt.y);
  }, [drawn, lengths, total, L]);

  return (
    <section
      aria-labelledby="journey-title"
      className="relative overflow-x-clip border-t border-border bg-bg px-4 py-14 sm:px-6 sm:py-20"
    >
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">The journey</p>
        <h2
          id="journey-title"
          className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] font-bold tracking-[0.01em] text-text uppercase"
        >
          From order to <span className="text-accent">your door</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Scroll to follow your order through every step, from the moment you place it to the moment you review it.
        </p>
      </header>

      {/* Screen readers get the steps as a plain list */}
      <ol className="sr-only">
        {STAGES.map((s) => (
          <li key={s.title}>
            {s.title}: {s.note}
          </li>
        ))}
      </ol>

      {/* The path. Its box keeps the SVG's shape, so stops and labels placed in % stay on the line. */}
      <div
        ref={boxRef}
        aria-hidden="true"
        className="relative mx-auto mt-10 w-full max-w-5xl"
        style={{ aspectRatio: `${L.w} / ${L.h}` }}
      >
        <svg viewBox={`0 0 ${L.w} ${L.h}`} className="absolute inset-0 h-full w-full overflow-visible" fill="none">
          {/* Faint full path, like the unvisited part of the road */}
          <path
            d={L.ghostD}
            stroke="var(--accent)"
            strokeOpacity="0.18"
            strokeWidth={L.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* The drawn path: one piece per leg, revealed with the scroll */}
          {L.segDs.map((d, i) => {
            const len = lengths[i] || 1;
            return (
              <path
                key={`${L.key}-${i}`}
                ref={(el) => {
                  segRefs.current[i] = el;
                }}
                d={d}
                stroke="var(--accent)"
                strokeWidth={L.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={len}
                strokeDashoffset={lengths[i] ? len - (segDrawn[i] || 0) : len}
              />
            );
          })}

          {/* Glowing tip of the line */}
          <circle
            ref={headRef}
            cx={L.points[0].x}
            cy={L.points[0].y}
            r={L.headR}
            fill="var(--accent)"
            stroke="var(--bg)"
            strokeWidth={L.stroke / 3}
          />
        </svg>

        {/* Stops and labels */}
        {STAGES.map((stage, i) => {
          const { x, y } = L.points[i];
          const xPct = (x / L.w) * 100;
          const yPct = (y / L.h) * 100;
          const terminal = i === 0 || i === STAGES.length - 1;
          const isDone = done[i];
          const isCurrent = i === current;
          const left = L.side(x, L.w) === 'left';
          const Icon = stage.icon;

          const labelStyle = left
            ? { top: `${yPct}%`, right: `calc(${100 - xPct}% + ${L.offset}rem)`, width: `calc(${xPct}% - ${L.offset}rem - 0.5rem)` }
            : { top: `${yPct}%`, left: `calc(${xPct}% + ${L.offset}rem)`, width: `calc(${100 - xPct}% - ${L.offset}rem - 0.5rem)` };

          return (
            <div key={stage.title}>
              {/* The stop */}
              <span
                className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 transition-all duration-500 ${
                  terminal ? L.term : L.chip
                } ${terminal ? 'ring-4 ring-accent/20' : ''} ${
                  isDone ? 'scale-100 border-accent bg-accent text-on-accent' : 'scale-90 border-border bg-surface text-muted'
                }`}
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              >
                {isCurrent && <span className="absolute inset-0 animate-ring rounded-full bg-accent/40" />}
                <Icon size={terminal ? L.termIcon : L.icon} strokeWidth={1.8} className="relative" />
              </span>

              {/* Label */}
              <div
                className={`absolute flex -translate-y-1/2 flex-col ${left ? 'items-end text-right' : 'items-start text-left'}`}
                style={labelStyle}
              >
                {terminal && (
                  <span className="text-[0.7rem] font-semibold tracking-[0.2em] text-accent uppercase md:text-xs">
                    {i === 0 ? 'Start' : 'Finish'}
                  </span>
                )}
                <span
                  className={`font-display text-[1.6rem] leading-[0.95] font-bold tracking-[0.01em] uppercase transition-colors duration-500 md:text-[clamp(1.75rem,3.6vw,3.25rem)] ${
                    isDone ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {stage.title}
                </span>
                <span
                  className={`mt-2 inline-block max-w-full rounded-2xl border border-accent/30 bg-surface px-3 py-1.5 text-xs leading-snug text-muted shadow-soft transition-all duration-500 md:text-sm ${
                    left ? 'rotate-2' : '-rotate-2'
                  } ${isDone ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
                >
                  {stage.note}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}