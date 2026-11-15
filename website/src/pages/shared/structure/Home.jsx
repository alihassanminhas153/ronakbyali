import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Tag } from "lucide-react";

// Adjust these paths to where Home.jsx lives (this assumes src/pages/shared/Home.jsx)
import ProductsMarquee from "../../../components/home/ProductsMarquee";
import OrderPath from "../../../components/home/OrderPath";
import Faqs from "../../../components/home/Faqs";
import Footer from "../../../components/home/Footer";
import useSmoothScroll from "../../../components/home/useSmoothScroll";

/* ==========================================================================
   HOME: hero section, then the products marquee, the order journey, then the FAQs
   The hero is exactly the viewport height minus your layout's header.
   Layers (back to front):
     1. big two-word heading, ONE row, top of the hero, swaps words all at once
     2. hero images from src/assets/hero/ (kebab-case file names, e.g. cotton-summer-kurta.webp),
        transparent, anchored to the bottom. The first one rises from the bottom after loading,
        then every few seconds the current one slides fully out and the next slides in, forever.
     3. dots at the bottom showing which image is on screen (click to jump)
     4. a small label in the bottom-left corner with the product name (read from the file name)
        that links to the products page
   A loader covers the page first. Colours come only from index.css variables,
   so light and dark both work.
   ========================================================================== */

/* ---- Content: edit freely ---- */
const BRAND = "Ronak By Ali";

// Big heading: exactly two words each. The first word uses the text colour, the second the accent.
// The font size is fitted so the WIDEST phrase fills one row, so keep phrases similar in length.
const HEADING_PHRASES = [
  ["Custom", "Designs"],
  ["Best", "Discounts"],
  ["Safe", "Delivery"],
  ["Your", "Style"],
];
const HEADING_SWAP_MS = 4500; // how long each heading phrase stays

// Hero images: put them in website/src/assets/hero/ and name each file after its product
// in kebab-case, e.g. cotton-summer-kurta.webp  ->  label "Cotton Summer Kurta".
//   - Add or remove files and the slider updates by itself.
//   - Slides play in file-name order. To control the order, start names with a number:
//     01-cotton-summer-kurta.webp, 02-silk-dupatta.webp (the number is not shown in the label).
// Why src/assets and not public/: a browser cannot list a folder, so the images are found at
// build time with Vite's import.meta.glob, and Vite cannot glob files inside public/.
const heroModules = import.meta.glob("/src/assets/hero/*.webp", { eager: true, query: "?url", import: "default" });

// "/src/assets/hero/01-cotton-summer-kurta.webp" -> "Cotton Summer Kurta"
const toProductName = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.webp$/i, "")
    .replace(/^\d+[-_.\s]+/, "") // optional ordering number
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const HERO_IMAGES = Object.entries(heroModules)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, url]) => ({ url, name: toProductName(path) }));

const PRODUCTS_PATH = "/products"; // where the label sends you
const SLIDE_MS = 5000; // how long each image stays
const SLIDE_ANIM_MS = 1200; // how long a slide animation takes

// Loader never shows for less than this, so it does not just flash
const MIN_LOADER_MS = 1600;

/* ---- Sizes: tweak here ---- */
const HEADING_WIDTH_FILL = 0.96; // 1 = edge to edge; the widest phrase fills this share of the row
const HEADING_MAX_HEIGHT = 0.6; // heading may never be taller than this share of the hero
// Image box height as a share of the hero (phone / tablet / desktop)
// Phones: centred and lifted a little above the bottom edge. From sm up: sits on the bottom edge as before.
const IMAGE_HEIGHT = "bottom-[14%] h-[74%] sm:bottom-0 sm:h-[94%] lg:h-[98%]";

/* The layout injects the header. Set --header-h on your layout wrapper
   (e.g. style={{ "--header-h": "4rem" }}) so the hero is exactly 100dvh minus it.
   If the header floats over the page instead, set it to 0px. */
const HERO_HEIGHT = "h-[calc(100dvh-var(--header-h,4.5rem))] min-h-[26rem]";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- Is the tab on screen? ----------
   Browsers slow timers down and freeze animation frames in a background tab. Without this,
   the slider and heading kept counting and then replayed everything at once when you came back.
   Now every timer below pauses while the tab is hidden and starts fresh when it returns. */
function usePageVisible() {
  const [visible, setVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState !== "hidden",
  );
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/* ---------- Hero images: known at build time, so only the first one is waited for ---------- */
function useHeroImages() {
  const [firstDone, setFirstDone] = useState(HERO_IMAGES.length === 0); // first image loaded, or failed: either way stop waiting

  useEffect(() => {
    if (HERO_IMAGES.length === 0) return;

    const first = new Image();
    first.onload = () => setFirstDone(true);
    first.onerror = () => setFirstDone(true);
    first.src = HERO_IMAGES[0].url;

    // Warm up the rest in the background so every slide appears instantly
    HERO_IMAGES.slice(1).forEach(({ url }) => {
      new Image().src = url;
    });
  }, []);

  return { images: HERO_IMAGES, firstDone };
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

function Heading({ ready, sectionRef, visible }) {
  const [current, setCurrent] = useState(0);
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  useFitText(sectionRef, wrapRef, innerRef);

  // Swap to the next phrase on a timer (not at all with reduced motion)
  useEffect(() => {
    if (!ready || !visible || prefersReducedMotion()) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % HEADING_PHRASES.length), HEADING_SWAP_MS);
    return () => clearInterval(id);
  }, [ready, visible]);

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

/* ---------- One hero slide ----------
   Every image stays mounted for the whole life of the page and only moves with a GPU
   transform. That is what keeps the slider smooth: nothing is decoded or laid out while
   it animates, and there is no filter or blur on the moving layers.
   A slide is always in one of four states:
     below   : waiting under the hero (only the very first image, before the loader ends)
     parked  : waiting off to the right
     active  : on screen
     leaving : sliding out to the left (then it is parked again, instantly, off screen) */
const EASE_SLIDE = "cubic-bezier(0.65, 0, 0.35, 1)"; // ease in and out: soft start, smooth middle, soft landing
const EASE_RISE = "cubic-bezier(0.22, 1, 0.36, 1)"; // the first image: fast start, long gentle landing

const SLIDE_POSITION = {
  below: "translate3d(0,100%,0)",
  parked: "translate3d(100%,0,0)",
  active: "translate3d(0,0,0)",
  leaving: "translate3d(-100%,0,0)",
};

function Slide({ src, alt, status, rising }) {
  const moving = status === "active" || status === "leaving";

  return (
    <div
      aria-hidden={status !== "active"}
      className="absolute inset-0 px-2"
      style={{
        transform: SLIDE_POSITION[status],
        // moving slides animate; parked / waiting slides jump instantly (they are off screen)
        transition: moving ? `transform ${rising ? 1500 : SLIDE_ANIM_MS}ms ${rising ? EASE_RISE : EASE_SLIDE}` : "none",
        willChange: moving ? "transform" : "auto",
        contain: "layout paint",
      }}
    >
      <img
        src={src}
        alt={alt}
        decoding="async"
        draggable={false}
        className="h-full w-full object-contain object-bottom select-none"
      />
    </div>
  );
}

/* ---------- Page ---------- */
export default function Home() {
  const sectionRef = useRef(null);
  const { images, firstDone } = useHeroImages();
  const visible = usePageVisible();
  useSmoothScroll(); // eased wheel / touch scrolling for this page (npm i lenis)

  const [minTimePassed, setMinTimePassed] = useState(false);
  const [current, setCurrent] = useState(0); // which image is showing
  const [intro, setIntro] = useState(true); // true until the first slide change (the first image rises, later ones slide)
  const [statuses, setStatuses] = useState(() => HERO_IMAGES.map((_, i) => (i === 0 ? "below" : "parked")));

  useEffect(() => {
    const id = setTimeout(() => setMinTimePassed(true), MIN_LOADER_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = minTimePassed && firstDone;

  // First image: once the loader is done it rises from the bottom
  useEffect(() => {
    if (!ready) return;
    setStatuses((prev) => prev.map((st, i) => (i === 0 && st === "below" ? "active" : st)));
  }, [ready]);

  // Show another image: the current one leaves to the left, the next one slides in from the right
  const goTo = useCallback(
    (next) => {
      const from = current;
      setIntro(false);
      setCurrent(next);
      setStatuses((prev) => prev.map((st, i) => (i === next ? "active" : st === "active" ? "leaving" : st)));

      // Once it has fully left, park it off to the right (only if it is still leaving)
      setTimeout(() => {
        setStatuses((prev) => prev.map((st, i) => (i === from && st === "leaving" ? "parked" : st)));
      }, SLIDE_ANIM_MS + 150);
    },
    [current],
  );

  // Coming back to the tab: any slide that was mid-exit is parked at once, so nothing replays
  useEffect(() => {
    if (!visible) return;
    setStatuses((prev) => (prev.includes("leaving") ? prev.map((st) => (st === "leaving" ? "parked" : st)) : prev));
  }, [visible]);

  // Auto-advance, forever. The timer restarts whenever the image changes (so a dot click resets it).
  // It does not run while the tab is hidden, and starts a full fresh wait when the tab comes back.
  useEffect(() => {
    if (!ready || !visible || images.length < 2 || prefersReducedMotion()) return;
    const id = setTimeout(() => goTo((current + 1) % images.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [ready, visible, images.length, current, goTo]);

  return (
    <>
      <Loader visible={!ready} />

      <section
        ref={sectionRef}
        aria-labelledby="hero-title"
        className={`relative isolate w-full overflow-hidden bg-[radial-gradient(70rem_36rem_at_50%_90%,var(--accent-soft),transparent_70%)] ${HERO_HEIGHT}`}
      >
        {/* Heading, pinned to the top. z-0 puts it BEHIND the images (z-10). */}
        <div className="relative z-0 px-3 pt-2 sm:px-6 sm:pt-4">
          <Heading ready={ready} sectionRef={sectionRef} visible={visible} />
        </div>

        {/* Images: transparent, bottom-anchored. object-contain scales each one to the
            biggest size that fits, on every screen. Sliding is clipped by the section. */}
        <div className={`pointer-events-none absolute inset-x-0 z-10 ${IMAGE_HEIGHT}`}>
          {/* Soft ground shadow. It is static, so the moving images carry no shadow filter. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-[22%] bottom-0 h-8 rounded-[50%] bg-[radial-gradient(closest-side,var(--card-shadow),transparent)] opacity-70"
          />
          {images.map((image, i) => (
            <Slide key={image.url} src={image.url} alt={image.name} status={statuses[i]} rising={intro && i === 0} />
          ))}
        </div>

        {/* Product label: the current image's product name (from its file name), links to the products page */}
        {images.length > 0 && (
          <Link
            to={PRODUCTS_PATH}
            aria-label={`${images[current]?.name}: browse all products`}
            className={`group absolute bottom-16 left-3 z-20 flex max-w-[72vw] items-center gap-2 rounded-full border border-border bg-surface/90 py-1.5 pr-1.5 pl-3 text-text shadow-soft transition duration-700 hover:border-accent focus-visible:ring-4 focus-visible:ring-accent/20 sm:bottom-5 sm:left-6 sm:max-w-[min(22rem,30vw)] ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: ready ? "900ms" : "0ms" }}
          >
            <Tag size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-accent" />
            <span className="min-w-0">
              <span className="block text-[0.6rem] leading-none font-semibold tracking-[0.18em] text-muted uppercase">
                Featured
              </span>
              {/* key restarts the rise animation each time the image changes */}
              <span key={current} className="block animate-rise truncate font-heading text-sm leading-tight font-semibold">
                {images[current]?.name}
              </span>
            </span>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-btn text-btn-ink transition group-hover:bg-btn-hover group-active:scale-95">
              <ArrowUpRight
                size={15}
                strokeWidth={2}
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </span>
          </Link>
        )}

        {/* Dots: which image is on screen. Click one to jump to it. */}
        {images.length > 1 && (
          <div
            className={`absolute bottom-3 left-1/2 z-20 -translate-x-1/2 transition duration-700 sm:bottom-5 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: ready ? "900ms" : "0ms" }}
          >
            <div
              role="group"
              aria-label="Hero images"
              className="flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-2"
            >
              {images.map((image, i) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => i !== current && goTo(i)}
                  aria-label={`Show ${image.name} (${i + 1} of ${images.length})`}
                  aria-current={i === current ? "true" : undefined}
                  title={image.name}
                  className={`h-2.5 cursor-pointer rounded-full transition-all duration-500 ${
                    i === current ? "w-7 bg-accent" : "w-2.5 bg-border hover:bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Products, right after the hero */}
      <ProductsMarquee />

      {/* Order journey: one viewport tall, a curvy path that draws itself as you scroll */}
      <OrderPath />

      {/* FAQs: one viewport tall, click a question and its answer slides in */}
      <Faqs />

      {/* Footer: contact details, links and the big jelly RONAK */}
      <Footer />
    </>
  );
}