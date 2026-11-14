import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";

/* ==========================================================================
   HOME: hero section
   The section is exactly the viewport height minus your layout's header.
   Layers (back to front):
     1. big animated heading (letter by letter)
     2. hero image, transparent, anchored to the bottom, rises in after loading
        (so the heading shows through behind it)
     3. small typewriter pill with a moving glow border
   A loader covers the page first. Colours come only from index.css variables,
   so light and dark both work.
   ========================================================================== */

/* ---- Content: edit freely ---- */
const BRAND = "Ronak By Ali";
const PRODUCTS_PATH = "/products";
const PRODUCTS_LABEL = "ronakbyali.com/products";

// The link text is one of the typed phrases (the last one)
const PHRASES = ["Get Discounts", "Your Custom Designs", "Safe order delivery", PRODUCTS_LABEL];

// File: website/public/images/webp/transparent/hero.webp (Vite serves /public from the root)
const HERO_IMAGE = "/images/webp/transparent/hero.webp";
const HERO_ALT = "Ronak By Ali featured product";

// Heading, one array item per line. accent lines use the accent colour + underline
const HEADING_LINES = [
  { words: ["Your", "style,"], accent: false },
  { words: ["your", "way."], accent: true },
];

// Loader never shows for less than this, so it does not just flash
const MIN_LOADER_MS = 1600;

/* ---- Sizes: tweak here ---- */
// Heading: min, fluid (by width / by height), max. Raise or lower the numbers to resize.
const HEADING_SIZE = "text-[clamp(3.5rem,min(19vw,21dvh),13rem)]";
// Typewriter pill text
const PILL_TEXT_SIZE = "text-base sm:text-lg";

/* The layout injects the header. Set --header-h on your layout wrapper
   (e.g. style={{ "--header-h": "4rem" }}) so the hero is exactly 100dvh minus it.
   If the header floats over the page instead, set it to 0px. */
const HERO_HEIGHT = "h-[calc(100dvh-var(--header-h,4.5rem))] min-h-[26rem]";

/* ---- Letter timing (ms) ---- */
const LETTER_START = 400; // wait for the image to start rising first
const LETTER_STEP = 80; // gap between letters
const TOTAL_LETTERS = HEADING_LINES.flatMap((l) => l.words).join("").length;
const HEADING_DONE = LETTER_START + TOTAL_LETTERS * LETTER_STEP;

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

/* ---------- Animated heading (tall font: font-display = Barlow Condensed) ----------
   Letters appear one by one: each fades up from below, un-blurs and scales in.
   Then the accent underline draws itself. Pure transitions, no extra CSS. */
function Heading({ ready }) {
  let n = 0; // running letter counter, drives the stagger

  return (
    <h1
      id="hero-title"
      aria-label={HEADING_LINES.map((l) => l.words.join(" ")).join(" ")}
      className={`font-display ${HEADING_SIZE} leading-[0.92] font-bold tracking-[0.01em] text-text uppercase`}
    >
      {HEADING_LINES.map((line, li) => (
        <span
          key={li}
          aria-hidden="true"
          className={`relative block ${line.accent ? "mx-auto w-fit text-accent" : ""}`}
        >
          {line.words.map((word, wi) => (
            <span key={wi}>
              {wi > 0 && " "}
              <span className="inline-block whitespace-nowrap">
                {word.split("").map((ch, ci) => {
                  const delay = LETTER_START + n++ * LETTER_STEP;
                  return (
                    <span
                      key={ci}
                      className={`inline-block transition duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform ${
                        ready
                          ? "translate-y-0 scale-100 opacity-100 blur-0"
                          : "translate-y-8 scale-75 opacity-0 blur-md"
                      }`}
                      style={{ transitionDelay: ready ? `${delay}ms` : "0ms" }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
            </span>
          ))}

          {line.accent && (
            <span
              className={`absolute inset-x-0 bottom-0 h-[0.06em] origin-left rounded-full bg-accent transition-transform duration-[900ms] ease-out ${
                ready ? "scale-x-100" : "scale-x-0"
              }`}
              style={{ transitionDelay: ready ? `${HEADING_DONE + 100}ms` : "0ms" }}
            />
          )}
        </span>
      ))}
    </h1>
  );
}

/* ---------- Typewriter "input": ONE pill, ONE link, with a moving glow ----------
   A conic-gradient wedge spins behind the pill. It is drawn twice:
   sharp as a thin border, and blurred as the glow around it. */
const SPINNER =
  "absolute top-1/2 left-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 animate-spin [animation-duration:3.6s] bg-[conic-gradient(from_0deg,transparent_0%,transparent_55%,var(--accent)_82%,var(--accent-hover)_100%)]";

function TypewriterField({ text, isLinkPhrase, ready }) {
  return (
    <div
      className={`w-[min(100%,24rem)] transition duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] sm:w-[28rem] ${
        ready ? "scale-100 opacity-100 blur-0" : "scale-90 opacity-0 blur-sm"
      }`}
      style={{ transitionDelay: ready ? `${HEADING_DONE + 200}ms` : "0ms" }}
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
          className="group relative flex h-12 w-full items-center gap-2 rounded-full bg-surface py-1 pr-1 pl-5 text-text transition focus-visible:ring-4 focus-visible:ring-accent/20 sm:h-14 sm:pl-6"
        >
          {/* Screen readers get the full list instead of letter-by-letter noise */}
          <span className="sr-only">{PHRASES.join(", ")}</span>

          <span aria-hidden="true" className={`flex min-w-0 flex-1 items-center text-left ${PILL_TEXT_SIZE}`}>
            <span className={`truncate transition-colors duration-300 ${isLinkPhrase ? "font-medium text-accent" : ""}`}>
              {text}
            </span>
            <span className="ml-0.5 h-5 w-0.5 shrink-0 animate-caret rounded-full bg-accent" />
          </span>

          {/* Arrow with a soft pulsing ring */}
          <span className="relative inline-flex size-10 shrink-0 sm:size-12">
            <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full bg-accent/50" />
            <span className="relative inline-flex size-full items-center justify-center rounded-full bg-btn text-btn-ink transition group-hover:bg-btn-hover group-active:scale-95">
              <ArrowUpRight
                size={20}
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
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [imageDone, setImageDone] = useState(false); // loaded or failed, either way do not hang the loader

  useEffect(() => {
    const id = setTimeout(() => setMinTimePassed(true), MIN_LOADER_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = minTimePassed && imageDone;
  const { text, index } = useTypewriter(PHRASES, ready);
  const isLinkPhrase = PHRASES[index] === PRODUCTS_LABEL;

  return (
    <>
      <Loader visible={!ready} />

      <section
        aria-labelledby="hero-title"
        className={`relative isolate w-full overflow-hidden bg-[radial-gradient(70rem_36rem_at_50%_90%,var(--accent-soft),transparent_70%)] ${HERO_HEIGHT}`}
      >
        {/* Top group. It has no z-index of its own, so the heading (z-0) sits
            BEHIND the image (z-10) while the pill (z-20) stays in front. */}
        <div className="relative flex flex-col items-center gap-4 px-4 pt-4 text-center sm:gap-6 sm:px-10 sm:pt-8 lg:pt-10">
          <div className="relative z-0">
            <Heading ready={ready} />
          </div>
          <div className="relative z-20">
            <TypewriterField text={text} isLinkPhrase={isLinkPhrase} ready={ready} />
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
    </>
  );
}