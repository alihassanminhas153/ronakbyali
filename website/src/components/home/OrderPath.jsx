// src/components/home/OrderPath.jsx   (Home page, after the products marquee)
//
// USAGE
//   <OrderPath />
//
// A winding road with smooth, perfectly circular corners that draws itself as you scroll
// past it, showing how an order travels:
//   Ordering > Product processing > Packaging > Safe keeping > Dispatching > Delivery > Review
// Each stop shows only its icon and its heading. The first and last stops are the terminals;
// the stops in between light up at the moment the drawn line reaches them.
//
// The road is a polyline of straight runs (different lengths, directions and angles, so it
// is irregular) whose every corner is rounded with a true circular arc. It is drawn in layers:
// a soft wide track, a dotted centre line, then the progress line in a theme gradient with a
// glow and a pulsing tip.
//
// It never pins or hijacks the scroll: the section is a normal block. Scroll updates write
// straight to the SVG (no React re-render per frame), so scrolling stays smooth. React only
// re-renders when a stop becomes complete.
//
// Phones get their own narrow road. Colours come only from theme variables, so light and
// dark both work.

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
   A layout is a list of corner points V and a corner radius R. Between the points the road
   runs straight; at every point it turns along a circular arc of radius R (smaller only when
   a run is too short to fit it). The builder also records every straight run, so a stop can be
   placed exactly on the road: { seg: which run, t: 0..1 along it, side: where its heading goes }. */
const f = (n) => Math.round(n * 100) / 100;

function roundedPath(V, R) {
  const pieces = []; // straight runs: where each starts/ends and how far along the road it starts
  let d = `M${f(V[0][0])} ${f(V[0][1])}`;
  let cur = V[0];
  let cum = 0;

  for (let i = 1; i < V.length; i += 1) {
    const v = V[i];

    if (i === V.length - 1) {
      const len = Math.hypot(v[0] - cur[0], v[1] - cur[1]);
      pieces.push({ ax: cur[0], ay: cur[1], bx: v[0], by: v[1], start: cum, len });
      d += ` L${f(v[0])} ${f(v[1])}`;
      cum += len;
      break;
    }

    const [px, py] = V[i - 1];
    const [nx, ny] = V[i + 1];
    const d1x = v[0] - px;
    const d1y = v[1] - py;
    const d2x = nx - v[0];
    const d2y = ny - v[1];
    const l1 = Math.hypot(d1x, d1y);
    const l2 = Math.hypot(d2x, d2y);
    const u1x = d1x / l1;
    const u1y = d1y / l1;
    const u2x = d2x / l2;
    const u2y = d2y / l2;
    const phi = Math.acos(Math.min(1, Math.max(-1, u1x * u2x + u1y * u2y))); // how sharply the road turns

    // Distance from the corner point where the arc starts and ends (kept to half a run at most)
    let t = R * Math.tan(phi / 2);
    t = Math.min(t, Math.min(l1, l2) / 2);
    const r = t / Math.tan(phi / 2);

    const ax = v[0] - u1x * t;
    const ay = v[1] - u1y * t;
    const bx = v[0] + u2x * t;
    const by = v[1] + u2y * t;

    const len = Math.hypot(ax - cur[0], ay - cur[1]);
    pieces.push({ ax: cur[0], ay: cur[1], bx: ax, by: ay, start: cum, len });
    cum += len;

    const clockwise = u1x * u2y - u1y * u2x > 0;
    d += ` L${f(ax)} ${f(ay)} A${f(r)} ${f(r)} 0 0 ${clockwise ? 1 : 0} ${f(bx)} ${f(by)}`;
    cum += r * phi; // arc length
    cur = [bx, by];
  }

  return { d, pieces, total: cum };
}

function makeLayout(cfg) {
  const { d, pieces, total } = roundedPath(cfg.V, cfg.R);
  const stops = cfg.stops.map(({ seg, t, side }) => {
    const p = pieces[seg];
    return { x: p.ax + (p.bx - p.ax) * t, y: p.ay + (p.by - p.ay) * t, at: p.start + p.len * t, side };
  });
  return { ...cfg, d, total, stops };
}

// Wide screens (md and up)
const WIDE = makeLayout({
  key: 'wide',
  w: 1000,
  h: 1720,
  R: 80,
  stroke: 10,
  headR: 12,
  V: [
    [150, 100], [650, 100], [880, 330], [880, 560], [420, 560], [180, 800],
    [180, 1040], [640, 1040], [860, 1260], [860, 1480], [500, 1480], [320, 1600],
  ],
  stops: [
    { seg: 0, t: 0, side: 'bottom' },
    { seg: 2, t: 0.5, side: 'left' },
    { seg: 4, t: 0.5, side: 'right' },
    { seg: 6, t: 0.5, side: 'bottom' },
    { seg: 8, t: 0.5, side: 'left' },
    { seg: 9, t: 0.5, side: 'bottom' },
    { seg: 10, t: 1, side: 'bottom' },
  ],
  offset: 2.5, // rem between a stop and its heading
  termOffset: 3.25,
  chip: 'size-12',
  term: 'size-16',
  icon: 22,
  termIcon: 28,
});

// Phones: a narrow road near the left, every heading on the right
const NARROW = makeLayout({
  key: 'narrow',
  w: 400,
  h: 1600,
  R: 34,
  stroke: 7,
  headR: 9,
  V: [
    [70, 60], [70, 230], [160, 320], [160, 520], [70, 610],
    [70, 800], [170, 900], [170, 1100], [60, 1200], [60, 1500],
  ],
  stops: [
    { seg: 0, t: 0, side: 'right' },
    { seg: 2, t: 0.3, side: 'right' },
    { seg: 4, t: 0.5, side: 'right' },
    { seg: 6, t: 0.5, side: 'right' },
    { seg: 7, t: 0.5, side: 'right' },
    { seg: 8, t: 0.4, side: 'right' },
    { seg: 8, t: 1, side: 'right' },
  ],
  offset: 2,
  termOffset: 2.5,
  chip: 'size-10',
  term: 'size-12',
  icon: 18,
  termIcon: 22,
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

// Where a stop's heading sits, as inline style + classes
function headingPlacement(stop, L, terminal) {
  const xPct = (stop.x / L.w) * 100;
  const yPct = (stop.y / L.h) * 100;
  const off = terminal ? L.termOffset : L.offset;

  switch (stop.side) {
    case 'left':
      return {
        cls: '-translate-y-1/2 text-right',
        style: { top: `${yPct}%`, right: `calc(${100 - xPct}% + ${off}rem)`, maxWidth: `calc(${xPct}% - ${off}rem - 0.5rem)` },
      };
    case 'right':
      return {
        cls: '-translate-y-1/2 text-left',
        style: { top: `${yPct}%`, left: `calc(${xPct}% + ${off}rem)`, maxWidth: `calc(${100 - xPct}% - ${off}rem - 0.5rem)` },
      };
    case 'top':
      return { cls: '-translate-x-1/2 text-center', style: { left: `${xPct}%`, bottom: `calc(${100 - yPct}% + ${off}rem)`, maxWidth: '45%' } };
    default: // bottom
      return { cls: '-translate-x-1/2 text-center', style: { left: `${xPct}%`, top: `calc(${yPct}% + ${off}rem)`, maxWidth: '45%' } };
  }
}

export default function OrderPath() {
  const wide = useMedia('(min-width: 768px)');
  const L = wide ? WIDE : NARROW;
  const gradId = `road-${useId().replace(/:/g, '')}`;

  const boxRef = useRef(null);
  const pathRef = useRef(null);
  const headRef = useRef(null);
  const pulseRef = useRef(null);
  const lengthRef = useRef(0);
  const progressRef = useRef(0);
  const [doneCount, setDoneCount] = useState(1); // stops completed so far (the start terminal counts from the beginning)

  // Draws the line for the current progress. Writes straight to the DOM, no re-render.
  const apply = () => {
    const path = pathRef.current;
    const total = lengthRef.current;
    if (!path || !total) return;

    const drawn = progressRef.current * total;
    path.style.strokeDashoffset = String(total - drawn);

    const tip = path.getPointAtLength(drawn);
    [headRef.current, pulseRef.current].forEach((c) => {
      if (!c) return;
      c.setAttribute('cx', tip.x);
      c.setAttribute('cy', tip.y);
    });

    // A stop is complete once the line has reached it
    setDoneCount(L.stops.filter((s) => s.at <= drawn + 0.5).length); // no-op when unchanged
  };

  // Measure the road and hide the line, whenever the layout (wide or narrow) is shown
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    lengthRef.current = path.getTotalLength();
    path.style.strokeDasharray = String(lengthRef.current);
    path.style.strokeDashoffset = String(lengthRef.current);
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
      </header>

      {/* Screen readers get the steps as a plain list */}
      <ol className="sr-only">
        {STAGES.map((s) => (
          <li key={s.title}>
            {s.title}: {s.note}
          </li>
        ))}
      </ol>

      {/* The box keeps the SVG's shape, so stops and headings placed in % stay on the road */}
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
            d={L.d}
            stroke="var(--accent)"
            strokeOpacity="0.1"
            strokeWidth={L.stroke * 2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 2. Dotted centre line: the road ahead */}
          <path
            d={L.d}
            stroke="var(--accent)"
            strokeOpacity="0.55"
            strokeWidth={L.stroke * 0.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`1 ${L.stroke * 1.4}`}
          />

          {/* 3. Progress line (its dash offset is set from the scroll) */}
          <g style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }}>
            <path
              key={L.key}
              ref={pathRef}
              d={L.d}
              stroke={`url(#${gradId})`}
              strokeWidth={L.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* 4. Tip of the line, with a soft pulse */}
          <circle
            ref={pulseRef}
            cx={L.stops[0].x}
            cy={L.stops[0].y}
            r={L.headR}
            fill="var(--accent)"
            className="animate-ring"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          <circle
            ref={headRef}
            cx={L.stops[0].x}
            cy={L.stops[0].y}
            r={L.headR}
            fill="var(--accent)"
            stroke="var(--bg)"
            strokeWidth={L.stroke / 2.5}
          />
        </svg>

        {/* Stops and their headings */}
        {STAGES.map((stage, i) => {
          const stop = L.stops[i];
          const xPct = (stop.x / L.w) * 100;
          const yPct = (stop.y / L.h) * 100;
          const terminal = i === 0 || i === STAGES.length - 1;
          const isDone = i < doneCount;
          const isCurrent = i === doneCount;
          const Icon = stage.icon;
          const place = headingPlacement(stop, L, terminal);

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
              </span>

              {/* Heading only */}
              <span
                className={`absolute block font-display text-[1.35rem] leading-[0.95] font-bold tracking-[0.01em] uppercase transition-colors duration-500 md:text-[clamp(1.5rem,2.8vw,2.4rem)] ${place.cls} ${
                  isDone ? 'text-text' : 'text-muted'
                }`}
                style={place.style}
              >
                {stage.title}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}