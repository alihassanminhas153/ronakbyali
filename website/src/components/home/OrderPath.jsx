// src/components/home/OrderPath.jsx   (Home page, after the products marquee)
//
// USAGE
//   <OrderPath />
//
// A hand-shaped, winding road that draws itself as you scroll past it, showing how an
// order travels:
//   Ordering > Product processing > Packaging > Safe keeping > Dispatching > Delivery > Review
// The first and last stops are the terminals. The stops in between light up (and their
// cards come to life) at the moment the drawn line reaches them.
//
// The road is deliberately irregular: uneven bends, different leg lengths and one curl.
// It is drawn in layers: a soft wide track, a dotted centre line, then the progress line
// in a theme gradient with a glow and a pulsing tip.
//
// It never pins or hijacks the scroll: the section is a normal block. Scroll updates write
// straight to the SVG (no React re-render per frame), so scrolling stays smooth. React only
// re-renders when a stop becomes complete.
//
// Phones get their own narrow road with all cards on the right.
// Colours come only from theme variables, so light and dark both work.

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Cog, Package, Send, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { useScrollFrame } from './useScrollValue';

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
   Each layout is a list of waypoints the curve passes through, plus the index of the
   waypoint that is a stop. The waypoints are placed by hand and are deliberately uneven
   (the run of tight points in the middle is the curl). The curve is a smooth spline through
   them, cut into one piece per stop-to-stop leg so each leg can be drawn separately. */
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
  const pts = cfg.wp.map(([x, y]) => ({ x, y }));
  return {
    ...cfg,
    ghostD: pathD(pts, 0, pts.length - 1),
    segDs: cfg.nodeIdx.slice(0, -1).map((from, k) => pathD(pts, from, cfg.nodeIdx[k + 1])),
    points: cfg.nodeIdx.map((i) => pts[i]),
  };
}

// Wide screens (md and up): cards sit on the outer side of each stop
const WIDE = makeLayout({
  key: 'wide',
  w: 1000,
  h: 1650,
  stroke: 10,
  headR: 12,
  wp: [
    [250, 90], [430, 55], [600, 115], [690, 230], [730, 310],
    [765, 400], [660, 470], [470, 465], [345, 515], [270, 590],
    [443, 699], [470, 732], [484, 769], [484, 804], [473, 829], [456, 842], [440, 841], [431, 827], [435, 806], [453, 785], [484, 769], [524, 765], [565, 774],
    [740, 880],
    [785, 985], [630, 1015], [470, 1000], [350, 1060], [290, 1150],
    [235, 1240], [380, 1272], [560, 1250], [655, 1300], [700, 1390],
    [690, 1480], [545, 1510], [430, 1545],
  ],
  nodeIdx: [0, 4, 9, 23, 28, 33, 36],
  sides: ['left', 'right', 'left', 'right', 'left', 'right', 'left'],
  offset: 3.25, // rem between a stop and its card
  chip: 'size-12',
  term: 'size-16',
  icon: 22,
  termIcon: 28,
});

// Phones: a narrow road near the left, every card on the right
const NARROW = makeLayout({
  key: 'narrow',
  w: 400,
  h: 1450,
  stroke: 7,
  headR: 9,
  wp: [
    [80, 70], [125, 100], [155, 175], [150, 260],
    [140, 330], [105, 360], [75, 400], [70, 470],
    [99, 556], [111, 572], [127, 582], [143, 585], [156, 582], [164, 575], [165, 566], [159, 560], [148, 559], [136, 564], [125, 576], [118, 594], [118, 614],
    [145, 700],
    [160, 770], [115, 820], [75, 860], [65, 930],
    [75, 1000], [135, 1030], [155, 1090], [150, 1150],
    [135, 1220], [110, 1260], [100, 1370],
  ],
  nodeIdx: [0, 3, 7, 21, 25, 29, 32],
  sides: Array(7).fill('right'),
  offset: 2.25,
  chip: 'size-10',
  term: 'size-12',
  icon: 18,
  termIcon: 22,
});

const clamp = (v) => Math.min(1, Math.max(0, v));
const two = (n) => String(n).padStart(2, '0');

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
  const gradId = `road-${useId().replace(/:/g, '')}`;

  const boxRef = useRef(null);
  const segRefs = useRef([]);
  const headRef = useRef(null);
  const pulseRef = useRef(null);
  const barRef = useRef(null);
  const lengthsRef = useRef([]);
  const progressRef = useRef(0);
  const [doneCount, setDoneCount] = useState(1); // stops completed so far (the start terminal counts from the beginning)

  // Draws the line for the current progress. Writes straight to the DOM, no re-render.
  const apply = () => {
    if (barRef.current) barRef.current.style.width = `${progressRef.current * 100}%`;

    const lens = lengthsRef.current;
    if (!lens.length) return;

    const total = lens.reduce((a, b) => a + b, 0);
    const drawn = progressRef.current * total;
    let acc = 0;
    let count = 1;
    let tipIdx = 0;
    let tipAt = 0;

    lens.forEach((len, i) => {
      const d = Math.min(Math.max(drawn - acc, 0), len);
      const el = segRefs.current[i];
      if (el) el.style.strokeDashoffset = String(len - d);
      if (len > 0 && d >= len - 0.5) count += 1;
      if (drawn >= acc || i === 0) {
        tipIdx = i;
        tipAt = d;
      }
      acc += len;
    });

    const tipPath = segRefs.current[tipIdx];
    if (tipPath) {
      const pt = tipPath.getPointAtLength(tipAt);
      [headRef.current, pulseRef.current].forEach((c) => {
        if (!c) return;
        c.setAttribute('cx', pt.x);
        c.setAttribute('cy', pt.y);
      });
    }
    setDoneCount(count); // no-op when unchanged
  };

  // Measure every leg and hide the line, whenever the layout (wide or narrow) is shown
  useLayoutEffect(() => {
    const els = segRefs.current.slice(0, L.segDs.length);
    lengthsRef.current = els.map((el) => (el ? el.getTotalLength() : 0));
    els.forEach((el, i) => {
      if (!el) return;
      el.style.strokeDasharray = String(lengthsRef.current[i]);
      el.style.strokeDashoffset = String(lengthsRef.current[i]);
    });
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // 0 when the road's top is 70% down the screen, 1 when its last stop has come into view
  useScrollFrame((vh) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    progressRef.current = clamp((vh * 0.7 - rect.top) / (rect.height * 0.85));
    apply();
  });

  const reached = Math.min(doneCount, STAGES.length);

  return (
    <section
      aria-labelledby="journey-title"
      className="relative overflow-x-clip border-t border-border bg-bg px-4 py-12 sm:px-6 sm:py-16"
    >
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">The journey</p>
        <h2
          id="journey-title"
          className="font-display text-[clamp(2.25rem,6vw,4rem)] leading-[0.95] font-bold tracking-[0.01em] text-text uppercase"
        >
          From order to <span className="text-accent">your door</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
          Follow your order through every step, from the moment you place it to the moment you review it.
        </p>

        {/* Live progress readout */}
        <div aria-hidden="true" className="mx-auto mt-5 w-full max-w-xs">
          <div className="flex items-center justify-between gap-3 text-xs font-medium tracking-wide text-muted">
            <span className="font-heading text-text tabular-nums">
              {two(reached)} <span className="text-muted">/ {two(STAGES.length)}</span>
            </span>
            <span className="truncate text-accent uppercase">{STAGES[reached - 1].title}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
            <div ref={barRef} className="h-full rounded-full bg-accent" style={{ width: '0%' }} />
          </div>
        </div>
      </header>

      {/* Screen readers get the steps as a plain list */}
      <ol className="sr-only">
        {STAGES.map((s) => (
          <li key={s.title}>
            {s.title}: {s.note}
          </li>
        ))}
      </ol>

      {/* The box keeps the SVG's shape, so stops and cards placed in % stay on the road */}
      <div
        ref={boxRef}
        aria-hidden="true"
        className="relative mx-auto mt-8 w-full max-w-4xl"
        style={{ aspectRatio: `${L.w} / ${L.h}` }}
      >
        <svg viewBox={`0 0 ${L.w} ${L.h}`} className="absolute inset-0 h-full w-full overflow-visible" fill="none">
          <defs>
            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={L.h}>
              <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
              <stop offset="1" style={{ stopColor: 'var(--accent-hover)' }} />
            </linearGradient>
          </defs>

          {/* 1. Soft wide track: the road itself */}
          <path
            d={L.ghostD}
            stroke="var(--accent)"
            strokeOpacity="0.1"
            strokeWidth={L.stroke * 2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 2. Dotted centre line: the road ahead */}
          <path
            d={L.ghostD}
            stroke="var(--accent)"
            strokeOpacity="0.55"
            strokeWidth={L.stroke * 0.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`1 ${L.stroke * 1.4}`}
          />

          {/* 3. Progress line: one piece per leg (dash offsets are set from the scroll) */}
          <g style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }}>
            {L.segDs.map((d, i) => (
              <path
                key={`${L.key}-${i}`}
                ref={(el) => {
                  segRefs.current[i] = el;
                }}
                d={d}
                stroke={`url(#${gradId})`}
                strokeWidth={L.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* 4. Tip of the line, with a soft pulse */}
          <circle
            ref={pulseRef}
            cx={L.points[0].x}
            cy={L.points[0].y}
            r={L.headR}
            fill="var(--accent)"
            className="animate-ring"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          <circle
            ref={headRef}
            cx={L.points[0].x}
            cy={L.points[0].y}
            r={L.headR}
            fill="var(--accent)"
            stroke="var(--bg)"
            strokeWidth={L.stroke / 2.5}
          />
        </svg>

        {/* Stops and cards */}
        {STAGES.map((stage, i) => {
          const { x, y } = L.points[i];
          const xPct = (x / L.w) * 100;
          const yPct = (y / L.h) * 100;
          const terminal = i === 0 || i === STAGES.length - 1;
          const isDone = i < doneCount;
          const isCurrent = i === doneCount;
          const left = L.sides[i] === 'left';
          const Icon = stage.icon;

          const cardStyle = left
            ? { top: `${yPct}%`, right: `calc(${100 - xPct}% + ${L.offset}rem)`, width: `calc(${xPct}% - ${L.offset}rem - 0.5rem)` }
            : { top: `${yPct}%`, left: `calc(${xPct}% + ${L.offset}rem)`, width: `calc(${100 - xPct}% - ${L.offset}rem - 0.5rem)` };

          return (
            <div key={stage.title}>
              {/* The stop */}
              <span
                className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 transition-all duration-500 ${
                  terminal ? L.term : L.chip
                } ${terminal ? 'ring-4 ring-accent/20' : ''} ${
                  isDone
                    ? 'scale-100 border-accent bg-accent text-on-accent shadow-[0_8px_20px_-8px_var(--accent)]'
                    : 'scale-90 border-border bg-surface text-muted'
                }`}
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              >
                {isCurrent && <span className="absolute inset-0 animate-ring rounded-full bg-accent/40" />}
                <Icon size={terminal ? L.termIcon : L.icon} strokeWidth={1.8} className="relative" />
                <span
                  className={`absolute -top-1 -right-1 grid size-5 place-items-center rounded-full border border-bg text-[0.6rem] font-bold tabular-nums transition-colors duration-500 ${
                    isDone ? 'bg-text text-bg' : 'bg-border text-muted'
                  }`}
                >
                  {i + 1}
                </span>
              </span>

              {/* Card */}
              <div
                className={`absolute -translate-y-1/2 rounded-2xl border bg-surface/90 p-3 backdrop-blur transition-all duration-500 md:p-4 ${
                  left ? 'text-right' : 'text-left'
                } ${
                  isDone
                    ? 'border-accent/40 opacity-100 shadow-soft'
                    : 'border-border opacity-60'
                }`}
                style={cardStyle}
              >
                <span className="block text-[0.65rem] font-semibold tracking-[0.2em] text-accent uppercase md:text-xs">
                  {terminal ? (i === 0 ? 'Start' : 'Finish') : `Step ${two(i + 1)}`}
                </span>
                <span
                  className={`mt-0.5 block font-display text-[1.35rem] leading-[0.95] font-bold tracking-[0.01em] uppercase transition-colors duration-500 md:text-[clamp(1.5rem,2.8vw,2.4rem)] ${
                    isDone ? 'text-text' : 'text-muted'
                  }`}
                >
                  {stage.title}
                </span>
                <span className="mt-1.5 block text-xs leading-snug text-muted md:text-sm">{stage.note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}