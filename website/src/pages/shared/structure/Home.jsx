import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, BadgePercent, Globe, Palette, ShieldCheck } from "lucide-react";

// Adjust this path to where Home.jsx lives (this assumes src/pages/shared/Home.jsx)
import ProductsMarquee from "../../../components/home/ProductsMarquee";

/* ==========================================================================
   HOME: hero section
   The section is exactly the viewport height minus your layout's header.
   Layers (back to front):
     1. big two-word heading, ONE row, top of the hero, swaps words all at once
     2. hero image, transparent, anchored to the bottom, rises in after loading
        (so the heading shows through behind it)
     3. small typewriter pill with icons and a moving glow border
   A loader covers the page first. Colours come only from index.css variables,
   so light and dark both work.
   ========================================================================== */

/* ---- Content: edit freely ---- */
const BRAND = "Ronak By Ali";
const PRODUCTS_PATH = "/products";
const PRODUCTS_LABEL = "ronakbyali.com/products";

// Big heading: exactly two words each. The first word uses the text colour, the second the accent.
// The font size is fitted so the WIDEST phrase fills one row, so keep phrases similar in length.
const HEADING_PHRASES = [
  ["Custom", "Designs"],
  ["Best", "Discounts"],
  ["Safe", "Delivery"],
  ["Your", "Style"],
];
const HEADING_SWAP_MS = 3200; // how long each phrase stays

// Typewriter pill: each phrase has its own icon. The last one is the link text.
const PHRASES = [
  { text: "Get Discounts", icon: BadgePercent },
  { text: "Your Custom Designs", icon: Palette },
  { text: "Safe order delivery", icon: ShieldCheck },
  { text: PRODUCTS_LABEL, icon: Globe, isLink: true },
];
const PHRASE_TEXTS = PHRASES.map((p) => p.text);

// File: website/public/images/webp/transparent/hero.webp (Vite serves /public from the root)
const HERO_IMAGE = "/images/webp/transparent/hero.webp";
const HERO_ALT = "Ronak By Ali featured product";

// Loader never shows for less than this, so it does not just flash
const MIN_LOADER_MS = 1600;

/* ---- Sizes: tweak here ---- */
const HEADING_WIDTH_FILL = 0.96; // 1 = edge to edge; the widest phrase fills this share of the row
const HEADING_MAX_HEIGHT = 0.6; // heading may never be taller than this share of the hero
const PILL_TEXT_SIZE = "text-base sm:text-lg";

/* The layout injects the header. Set --header-h on your layout wrapper
   (e.g. style={{ "--header-h": "4rem" }}) so the hero is exactly 100dvh minus it.
   If the header floats over the page instead, set it to 0px. */
const HERO_HEIGHT = "h-[calc(100dvh-var(--header-h,4.5rem))] min-h-[26rem]";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- Typewriter: types, holds, deletes, moves to the next phrase ---------- */
function useTypewriter(phrases, active) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active || prefersReducedMotion()) return;

    const full = phrases[index];
    let timer;

    if (!deleting && text === full) {
      timer = setTimeout(() => setDeleting(true), 1600); // hold the finished phrase
    } else if (deleting && text === "") {
      timer = setTimeout(() => {
        setDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      }, 300);
    } else {
      timer = setTimeout(
        () => setText(full.slice(0, text.length + (deleting ? -1 : 1))),
        deleting ? 35 : 75
      );
    }
    return () => clearTimeout(timer);
  }, [active, deleting, index, phrases, text]);

  // Reduced motion: no typing, just show the first phrase
  if (prefersReducedMotion()) return { text: phrases[0], index: 0 };
  return { text, index };
}

/* ---------- Fit text: sizes the heading so its widest phrase fits ONE row ---------- */
function useFitText(sectionRef, wrapRef, innerRef) {
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    // A child's layout effect runs before its parent's ref is attached,
    // so sectionRef.current can still be null here. Fall back to the DOM.
    const getSection = () => sectionRef.current ?? wrap.closest("section");

    const fit = () => {
      const sec = getSection();
      if (!sec) return;

      inner.style.fontSize = "100px"; // measure at a known size, then scale
      const width100 = inner.scrollWidth;
      if (!width100) return;

      const byWidth = (wrap.clientWidth * HEADING_WIDTH_FILL * 100) / width100;
      const byHeight = sec.clientHeight * HEADING_MAX_HEIGHT;
      inner.style.fontSize = `${Math.min(byWidth, byHeight)}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const sec = getSection();
    if (sec) ro.observe(sec);
    document.fonts?.ready.then(fit); // re-measure once the tall font has loaded
    return () => ro.disconnect();
  }, [sectionRef, wrapRef, innerRef]);
}

/* ---------- Loader ---------- */
function Loader({ visible }) {
  const [filling, setFilling] = useState(false);
  const [mounted, setMounted] = useState(true);

  // Start the progress bar on the next frame so its transition actually runs
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilling(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Remove from the DOM once the fade-out has finished
  useEffect(() => {
    if (visible) return;
    const id = setTimeout(() => setMounted(false), 700);
    return () => clearTimeout(id);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <span className="font-display text-5xl font-bold tracking-[0.02em] text-text uppercase sm:text-6xl">
        {BRAND}
      </span>
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-border sm:w-52">
        <div
          className="h-full rounded-full bg-accent transition-[width] ease-out"
          style={{ width: filling ? "100%" : "0%", transitionDuration: `${MIN_LOADER_MS}ms` }}
        />
      </div>
    </div>
  );
}

/* ---------- Big heading: two words, one row, swaps all at once ----------
   All phrases sit stacked in the same spot. The current one slides up into view
   while the previous one slides up and out, together, inside a mask. */
const SWAP_EASE = "duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]";

function Heading({ ready, sectionRef }) {
  const [current, setCurrent] = useState(0);
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  useFitText(sectionRef, wrapRef, innerRef);

  // Swap to the next phrase on a timer (not at all with reduced motion)
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % HEADING_PHRASES.length), HEADING_SWAP_MS);
    return () => clearInterval(id);
  }, [ready]);

  const previous = (current - 1 + HEADING_PHRASES.length) % HEADING_PHRASES.length;

  return (
    <div ref={wrapRef} className="w-full">
      <h1
        id="hero-title"
        aria-label={HEADING_PHRASES.map((p) => p.join(" ")).join(", ")}
        className="overflow-hidden text-center"
      >
        <span
          ref={innerRef}
          aria-hidden="true"
          style={{ fontSize: "12vw" }}
          className="inline-grid py-[0.04em] font-display leading-[0.9] font-bold tracking-[0.01em] whitespace-nowrap uppercase"
        >
          {HEADING_PHRASES.map(([first, second], k) => {
            const state = !ready ? "below" : k === current ? "active" : k === previous ? "above" : "below";
            const motion = {
              active: `translate-y-0 opacity-100 transition ${SWAP_EASE}`,
              above: `-translate-y-full opacity-0 transition ${SWAP_EASE}`,
              below: "translate-y-full opacity-0 transition-none", // parked out of sight, no animation
            }[state];

            return (
              <span
                key={first + second}
                className={`col-start-1 row-start-1 justify-self-center ${motion}`}
                style={{ transitionDelay: state === "active" ? "250ms" : "0ms" }}
              >
                <span className="text-text">{first}</span> <span className="text-accent">{second}</span>
              </span>
            );
          })}
        </span>
      </h1>
    </div>
  );
}

/* ---------- Typewriter "input": ONE pill, ONE link, icons, moving glow ----------
   A conic-gradient wedge spins behind the pill. It is drawn twice:
   sharp as a thin border, and blurred as the glow around it. */
const SPINNER =
  "absolute top-1/2 left-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 animate-spin [animation-duration:3.6s] bg-[conic-gradient(from_0deg,transparent_0%,transparent_55%,var(--accent)_82%,var(--accent-hover)_100%)]";

function TypewriterField({ text, index, ready }) {
  const { icon: Icon, isLink } = PHRASES[index];

  return (
    <div
      className={`w-[min(100%,25rem)] transition duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] sm:w-[30rem] ${
        ready ? "scale-100 opacity-100 blur-0" : "scale-90 opacity-0 blur-sm"
      }`}
      style={{ transitionDelay: ready ? "700ms" : "0ms" }}
    >
      <div className="relative rounded-full p-[1.5px]">
        {/* Glow: blurred copy that spills outside the pill */}
        <span aria-hidden="true" className="absolute -inset-1 overflow-hidden rounded-full opacity-70 blur-md">
          <span className={SPINNER} />
        </span>
        {/* Sharp moving border */}
        <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full">
          <span className={SPINNER} />
        </span>

        <Link
          to={PRODUCTS_PATH}
          aria-label={`Browse products at ${PRODUCTS_LABEL}`}
          className="group relative flex h-14 w-full items-center gap-3 rounded-full bg-surface py-1 pr-1 pl-1.5 text-text transition focus-visible:ring-4 focus-visible:ring-accent/20 sm:h-16"
        >
          {/* Screen readers get the full list instead of letter-by-letter noise */}
          <span className="sr-only">{PHRASES.map((p) => p.text).join(", ")}</span>

          {/* Icon chip: swaps with each phrase */}
          <span
            aria-hidden="true"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent sm:size-12"
          >
            <Icon key={index} size={22} strokeWidth={1.8} className="animate-rise" />
          </span>

          {/* Typed text */}
          <span aria-hidden="true" className={`flex min-w-0 flex-1 items-center text-left font-heading ${PILL_TEXT_SIZE}`}>
            <span
              className={`truncate font-medium tracking-tight transition-colors duration-300 ${
                isLink ? "text-accent underline decoration-accent/40 decoration-2 underline-offset-4" : "text-text"
              }`}
            >
              {text}
            </span>
            <span className="ml-1 h-5 w-[3px] shrink-0 animate-caret rounded-full bg-accent shadow-[0_0_10px_var(--accent)] sm:h-6" />
          </span>

          {/* Arrow with a soft pulsing ring */}
          <span className="relative inline-flex size-12 shrink-0 sm:size-14">
            <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full bg-accent/50" />
            <span className="relative inline-flex size-full items-center justify-center rounded-full bg-btn text-btn-ink transition group-hover:bg-btn-hover group-active:scale-95">
              <ArrowUpRight
                size={22}
                strokeWidth={2}
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function Home() {
  const sectionRef = useRef(null);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [imageDone, setImageDone] = useState(false); // loaded or failed, either way do not hang the loader

  useEffect(() => {
    const id = setTimeout(() => setMinTimePassed(true), MIN_LOADER_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = minTimePassed && imageDone;
  const { text, index } = useTypewriter(PHRASE_TEXTS, ready);

  return (
    <>
      <Loader visible={!ready} />

      <section
        ref={sectionRef}
        aria-labelledby="hero-title"
        className={`relative isolate w-full overflow-hidden bg-[radial-gradient(70rem_36rem_at_50%_90%,var(--accent-soft),transparent_70%)] ${HERO_HEIGHT}`}
      >
        {/* Top group, pinned to the top. It has no z-index of its own, so the
            heading (z-0) sits BEHIND the image (z-10) while the pill (z-20) stays in front. */}
        <div className="relative flex flex-col items-center gap-3 px-3 pt-2 sm:gap-5 sm:px-6 sm:pt-4">
          <div className="relative z-0 w-full">
            <Heading ready={ready} sectionRef={sectionRef} />
          </div>
          <div className="relative z-20 flex w-full justify-center">
            <TypewriterField text={text} index={index} ready={ready} />
          </div>
        </div>

        {/* Image: transparent, bottom-anchored, rises in after loading.
            object-contain scales it to the biggest size that fits, on every screen. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[80%] justify-center px-2 sm:h-[86%] lg:h-[92%]">
          <img
            src={HERO_IMAGE}
            alt={HERO_ALT}
            onLoad={() => setImageDone(true)}
            onError={() => setImageDone(true)}
            className={`h-full w-full object-contain object-bottom drop-shadow-[0_24px_30px_var(--card-shadow)] transition-transform duration-[1500ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] will-change-transform ${
              ready ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ transitionDelay: ready ? "100ms" : "0ms" }}
          />
        </div>
      </section>

      {/* Products, right after the hero */}
      <ProductsMarquee />
    </>
  );
}