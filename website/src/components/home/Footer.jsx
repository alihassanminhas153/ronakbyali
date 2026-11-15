import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useSelector } from "react-redux";
import { Check, Copy, Mail, MessageCircle, User } from "lucide-react";

import { PATHS } from "../../router/path";
import { selectMe } from "../../store/slices/userSlice";

/* ==========================================================================
   FOOTER
   - Contact details: owner name (click to copy), email (opens your mail app, with a copy
     button), WhatsApp number (opens a chat).
   - Page links. Logged out: sign in + create account. Logged in: a link to /@username,
     read from the users slice (selectMe), falling back to the auth profile.
   - A huge "RONAK" at the bottom. When it scrolls into view, every letter rises from below
     one after another and wobbles like jelly (once). Hovering a letter wobbles it again.
   Colours and fonts come from index.css (font-display = Barlow Condensed Bold).
   ========================================================================== */

/* ---- Content: edit freely ---- */
const BRAND = "Ronak By Ali";
const BIG_WORD = "RONAK";
const OWNER = "Ali Hassan Minhas";
const EMAIL = "ronakbyali@gmail.com";
const WHATSAPP_DIGITS = "923218854601"; // used in the wa.me link (no + or spaces)
const WHATSAPP_SHOWN = "+92 321 8854601";
const WHATSAPP_TEXT = "Hello Ronak By Ali, I would like to ask about an order.";

const LOGIN_PATH = "/welcome-back";
const SIGNUP_PATH = "/create-account";

/* ---- Sizes and timing ---- */
const WORD_FILL = 0.98; // how much of the width the big word may fill
const WORD_MAX_VH = 0.75; // the word may never be taller than this share of the screen (font size)
const JELLY_MS = 1700; // how long one letter's jelly entrance lasts
const LETTER_STAGGER_MS = 90; // delay between letters

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* One letter: rises from below, stretches, lands with a squash, then wobbles until still */
const JELLY_FRAMES = [
  { offset: 0, transform: "translateY(125%) scale(0.88, 1.25)", easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
  { offset: 0.42, transform: "translateY(-7%) scale(0.92, 1.16)", easing: "ease-in" },
  { offset: 0.56, transform: "translateY(0) scale(1.2, 0.68)", easing: "ease-out" },
  { offset: 0.68, transform: "translateY(-5%) scale(0.92, 1.12)", easing: "ease-in-out" },
  { offset: 0.8, transform: "translateY(0) scale(1.08, 0.92)", easing: "ease-in-out" },
  { offset: 0.9, transform: "translateY(0) scale(0.98, 1.03)", easing: "ease-in-out" },
  { offset: 1, transform: "translateY(0) scale(1, 1)" },
];
const WOBBLE_FRAMES = [
  { transform: "scale(1, 1)" },
  { transform: "scale(1.12, 0.86)" },
  { transform: "scale(0.95, 1.08)" },
  { transform: "scale(1.03, 0.98)" },
  { transform: "scale(1, 1)" },
];

/* ---------- Copy to clipboard (with an old-browser fallback) ---------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function useCopied() {
  const [copied, setCopied] = useState("");
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (key, text) => {
    if (await copyText(text)) {
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(""), 1800);
    }
  }, []);
  return { copied, copy };
}

/* ---------- Fit the big word to the width of the footer ---------- */
function useFitWord(wrapRef, innerRef) {
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const fit = () => {
      inner.style.fontSize = "100px";
      const width100 = inner.scrollWidth;
      if (!width100) return;
      const byWidth = (wrap.clientWidth * WORD_FILL * 100) / width100;
      inner.style.fontSize = `${Math.min(byWidth, window.innerHeight * WORD_MAX_VH)}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [wrapRef, innerRef]);
}

/* ---------- The big jelly word ---------- */
function JellyWord() {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const letters = useRef([]);
  const [played, setPlayed] = useState(false);
  useFitWord(wrapRef, innerRef);

  // Play once, when the word is on screen and the tab is visible
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || played) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setPlayed(true);
      return;
    }

    let io;
    const start = () => {
      const animations = letters.current.map((el, i) =>
        el?.animate(JELLY_FRAMES, {
          duration: JELLY_MS,
          delay: i * LETTER_STAGGER_MS,
          fill: "both",
        }),
      );
      Promise.all(animations.map((a) => a?.finished)).then(() => setPlayed(true)).catch(() => setPlayed(true));
    };

    io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || document.visibilityState === "hidden") return;
        io.disconnect();
        start();
      },
      { threshold: 0.35 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [played]);

  const wobble = (i) => {
    if (!played || prefersReducedMotion()) return;
    letters.current[i]?.animate(WOBBLE_FRAMES, { duration: 650, easing: "ease-in-out" });
  };

  return (
    <div
      ref={wrapRef}
      className="w-full text-center"
      // clips the letters below the baseline while they rise, but lets them squash sideways freely
      style={{ clipPath: "inset(0 -6vw 0 -6vw)" }}
    >
      <h2 aria-label={BIG_WORD} className="m-0">
        <span
          ref={innerRef}
          aria-hidden="true"
          style={{ fontSize: "18vw" }}
          className="inline-flex font-display leading-[0.86] font-bold tracking-[0.01em] whitespace-nowrap text-text uppercase select-none"
        >
          {BIG_WORD.split("").map((letter, i) => (
            <span
              key={i}
              ref={(el) => (letters.current[i] = el)}
              onPointerEnter={() => wobble(i)}
              className="inline-block"
              style={{
                transformOrigin: "50% 100%",
                willChange: played ? "auto" : "transform",
                // hidden until its animation takes over; cleared once everything has played
                transform: played ? undefined : "translateY(125%)",
              }}
            >
              {letter}
            </span>
          ))}
        </span>
      </h2>
    </div>
  );
}

/* ---------- Small pieces ---------- */
const linkClass =
  "font-heading text-base font-medium text-text underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:text-accent sm:text-lg";

function Column({ title, children }) {
  return (
    <div>
      <h3 className="m-0 font-heading text-sm font-semibold text-muted">{title}</h3>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">{children}</ul>
    </div>
  );
}

function CopyButton({ done, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:border-accent hover:text-accent focus-visible:ring-4 focus-visible:ring-accent/20"
    >
      {done ? <Check size={14} aria-hidden="true" className="text-accent" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  );
}

/* ---------- Footer ---------- */
export default function Footer() {
  const me = useSelector(selectMe);
  const authProfile = useSelector((s) => s.auth.profile);
  const loggedIn = Boolean(me || authProfile);
  const username = String(me?.username || authProfile?.username || "").replace(/^@/, "");

  const { copied, copy } = useCopied();
  const whatsappHref = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface-alt">
      <div className="mx-auto w-full max-w-[90rem] px-4 pt-12 sm:px-6 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-16">
          {/* Contact */}
          <div>
            <h3 className="m-0 font-heading text-sm font-semibold text-muted">Contact</h3>
            <p className="mt-3 mb-5 max-w-[26rem] text-sm text-muted sm:text-base">
              Ready-made or custom, message us and we will help you pick, size and order.
            </p>

            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <li className="flex items-center gap-3">
                <User size={18} aria-hidden="true" className="shrink-0 text-accent" />
                <button
                  type="button"
                  onClick={() => copy("name", OWNER)}
                  className="min-w-0 cursor-pointer text-left font-heading text-base font-medium text-text underline-offset-4 transition-colors hover:text-accent hover:underline sm:text-lg"
                  title="Copy the owner's name"
                >
                  {OWNER}
                  <span className="ml-2 text-xs font-normal text-muted" aria-live="polite">
                    {copied === "name" ? "Copied" : "Owner"}
                  </span>
                </button>
              </li>

              <li className="flex items-center gap-3">
                <Mail size={18} aria-hidden="true" className="shrink-0 text-accent" />
                <a href={`mailto:${EMAIL}`} className={`${linkClass} min-w-0 break-all`}>
                  {EMAIL}
                </a>
                <CopyButton done={copied === "email"} label="Copy email address" onClick={() => copy("email", EMAIL)} />
              </li>

              <li className="flex items-center gap-3">
                <MessageCircle size={18} aria-hidden="true" className="shrink-0 text-accent" />
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {WHATSAPP_SHOWN}
                  <span className="ml-2 text-xs font-normal text-muted">WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Pages */}
          <Column title="Pages">
            <li>
              <Link to={PATHS.products} className={linkClass}>
                Shop
              </Link>
            </li>
            <li>
              <Link to={PATHS.contact} className={linkClass}>
                Contact
              </Link>
            </li>
            <li>
              <Link to={PATHS.faqs} className={linkClass}>
                FAQs
              </Link>
            </li>
          </Column>

          {/* Account: sign-in pages for guests, own page for signed-in users */}
          <Column title="Account">
            {loggedIn ? (
              username ? (
                <li>
                  <Link to={`/@${username}`} className={linkClass}>
                    @{username}
                  </Link>
                </li>
              ) : (
                <li className="text-sm text-muted">Loading your account…</li>
              )
            ) : (
              <>
                <li>
                  <Link to={LOGIN_PATH} className={linkClass}>
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to={SIGNUP_PATH} className={linkClass}>
                    Create account
                  </Link>
                </li>
              </>
            )}
          </Column>
        </div>

        <p className="mt-10 mb-2 text-xs text-muted sm:mt-14 sm:text-sm">
          © {new Date().getFullYear()} {BRAND}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          Made with{" "}
          <span className="text-accent" role="img" aria-label="love">
            ♥
          </span>
        </p>

        <JellyWord />
      </div>
    </footer>
  );
}