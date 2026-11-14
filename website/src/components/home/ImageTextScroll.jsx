// src/components/home/ImageTextScroll.jsx   (Home page, after the products marquee)
//
// USAGE
//   <ImageTextScroll />
//
// A scroll-driven showcase:
//   1. A big image enters. When the section reaches the middle of the screen the
//      image blends into BIG words that are filled with the same image (background-clip:text).
//   2. The section then pins to the screen. While you keep scrolling, the words change:
//      each step is one BIG image-filled word with one small word under it in the theme colour.
//   3. After the last word the section unpins and the page scrolls on.
//
// Everything is driven by scroll position, nothing runs on a timer.
// The image fill has a theme-colour gradient behind it, so the words stay visible
// even if the image file is missing.

import { useRef } from 'react';
import useScrollValue from './useScrollValue';

/* ---- Content: edit freely ---- */
// Put an opaque, colourful photo or texture here (public/images/webp/showcase.webp)
const CLIP_IMAGE = '/images/webp/showcase.webp';

// big = image-filled word, small = theme-colour word under it
const STEPS = [
  { big: 'Custom', small: 'design' },
  { big: 'Quality', small: 'premium' },
  { big: 'Delivery', small: 'safe' },
  { big: 'Discounts', small: 'best' },
];

// How much scrolling each word gets while pinned (in screen heights)
const STEP_SCROLL_DVH = 80;

const HEADER = 'var(--header-h,4.5rem)';
const IMAGE_FILL = `url(${CLIP_IMAGE}), linear-gradient(135deg, var(--accent), var(--accent-hover))`;

const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function ImageTextScroll() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);

  // e: 0..1 while the section travels from the middle of the screen up to its pinned spot
  // p: 0..1 while pinned (drives which word is shown)
  const { e, p } = useScrollValue(
    (vh) => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return null;

      const rect = section.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(stage).top) || 0; // header height
      const pinLength = Math.max(1, rect.height - stage.offsetHeight);

      return {
        e: clamp((vh * 0.5 - rect.top) / (vh * 0.5 - top)),
        p: clamp((top - rect.top) / pinLength),
      };
    },
    { e: 0, p: 0 },
  );

  const blend = smooth(0, 0.95, e); // image fades away
  const text = smooth(0.15, 1, e); // words fade in
  const active = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));

  return (
    <section
      ref={sectionRef}
      aria-label={STEPS.map((s) => `${s.big} ${s.small}`).join(', ')}
      className="relative border-t border-border bg-bg"
      style={{ height: `calc(100dvh - ${HEADER} + ${STEPS.length * STEP_SCROLL_DVH}dvh)` }}
    >
      <div
        ref={stageRef}
        className="sticky top-[var(--header-h,4.5rem)] flex h-[calc(100dvh-var(--header-h,4.5rem))] items-center justify-center overflow-hidden"
      >
        {/* Layer 1: the image, blends away into the words */}
        <div
          aria-hidden="true"
          className="absolute inset-3 rounded-[2rem] bg-cover bg-center will-change-transform sm:inset-6"
          style={{
            backgroundImage: IMAGE_FILL,
            opacity: 1 - blend,
            transform: `scale(${1 - 0.12 * blend})`,
            filter: `blur(${blend * 10}px)`,
          }}
        />

        {/* Layer 2: the words */}
        <div
          aria-hidden="true"
          className="relative z-10 grid w-full place-items-center px-4 text-center will-change-transform"
          style={{
            opacity: text,
            transform: `scale(${0.9 + 0.1 * text})`,
            filter: `blur(${(1 - text) * 14}px)`,
          }}
        >
          {STEPS.map((step, i) => {
            const state = i === active ? 'active' : i < active ? 'past' : 'future';
            const motion = {
              active: 'translate-y-0 opacity-100 blur-0',
              past: '-translate-y-16 opacity-0 blur-md',
              future: 'translate-y-16 opacity-0 blur-md',
            }[state];

            return (
              <div
                key={step.big}
                className={`col-start-1 row-start-1 flex flex-col items-center gap-1 transition duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:gap-3 ${motion}`}
              >
                {/* Big word: filled with the image */}
                <span
                  className="inline-block bg-clip-text font-display text-[clamp(4.5rem,min(24vw,36dvh),20rem)] leading-[0.9] font-bold tracking-[0.01em] text-transparent uppercase drop-shadow-[0_8px_18px_var(--card-shadow)]"
                  style={{
                    backgroundImage: IMAGE_FILL,
                    backgroundSize: 'cover',
                    backgroundPosition: `${30 + p * 40}% ${p * 100}%`,
                  }}
                >
                  {step.big}
                </span>

                {/* Small word: theme colour */}
                <span className="font-heading text-[clamp(1.1rem,3.2vw,2.5rem)] font-semibold tracking-[0.25em] text-accent uppercase">
                  {step.small}
                </span>
                <span
                  className={`h-0.5 w-16 origin-center rounded-full bg-accent transition-transform delay-300 duration-700 sm:w-24 ${
                    state === 'active' ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Step counter and progress bar */}
        <div
          aria-hidden="true"
          className="absolute bottom-4 left-5 z-10 font-heading text-sm tracking-widest text-muted tabular-nums sm:left-10"
          style={{ opacity: text }}
        >
          {String(active + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-border">
          <div className="h-full bg-accent" style={{ width: `${p * 100}%` }} />
        </div>
      </div>
    </section>
  );
}