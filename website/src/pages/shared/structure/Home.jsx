import { useCallback, useId, useState } from "react";
import { Check, Copy, Globe, MessageCircle, Phone } from "lucide-react";
import ThemeToggle from "../../../ui/custom/toggles/ThemeToggle";

const OWNER = "Ali Hassan Minhas";
const PHONE_DISPLAY = "+92 321 8854601";
const PHONE_RAW = "+923218854601";
const WHATSAPP_URL = "https://wa.me/923218854601";
const SITE_URL = "https://ronakbyali.com";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-deep";

// Short screens: hide the optional extras so everything still fits without scrolling
const shortScreen = "[@media(max-height:720px)]:hidden";
const veryShortScreen = "[@media(max-height:600px)]:hidden";
const landscapeShort = "[@media(max-height:560px)_and_(orientation:landscape)]";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyField({ icon: Icon, label, value, copyValue }) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (await copyText(copyValue ?? value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, [copyValue, value]);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[0.75rem] text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-full border border-line bg-field py-1 pr-1 pl-3 transition focus-within:border-sage focus-within:ring-4 focus-within:ring-sage/20">
        <Icon size={17} strokeWidth={1.6} className="shrink-0 text-sage-deep" aria-hidden="true" />
        <input
          id={id}
          type="text"
          value={value}
          readOnly
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 truncate bg-transparent py-1 text-[0.9rem] text-ink outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full p-2.5 text-sm font-medium transition active:scale-95 sm:px-3 ${focusRing} ${
            copied
              ? "bg-sage-deep text-page"
              : "bg-sage-wash text-sage-deep hover:brightness-95 dark:hover:brightness-125"
          }`}
        >
          {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.8} />}
          <span className="hidden w-[3.2rem] text-left sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  // Changing the key remounts the letters, replaying the fall + jelly animation
  const [round, setRound] = useState(0);

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-[radial-gradient(60rem_30rem_at_50%_8%,var(--glow),transparent_70%)] bg-page text-ink">
      <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-10 sm:py-5">
        <span className="font-serif text-2xl font-semibold tracking-[0.01em] sm:text-[1.75rem]">
          Ronak By Ali
        </span>
        <div className="flex items-center gap-2">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className={`inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-[0.6875rem] text-sm font-medium text-sage-deep transition-colors hover:border-sage hover:bg-sage-wash sm:px-4 ${focusRing}`}
          >
            <MessageCircle size={18} strokeWidth={1.6} />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Main: fills the remaining viewport height, content is spread evenly */}
      <main
        className={`flex min-h-0 flex-1 flex-col items-center justify-evenly gap-2 px-4 sm:px-10 ${landscapeShort}:flex-row ${landscapeShort}:gap-10`}
      >
        {/* Hero */}
        <section className="flex min-h-0 w-full flex-col items-center text-center" aria-labelledby="soon">
          <p
            className="animate-fade font-serif text-[clamp(1.25rem,3.6vh,2.25rem)] font-medium tracking-[0.04em] text-muted italic"
            style={{ animationDelay: "0.1s" }}
          >
            Coming
          </p>

          <h1
            id="soon"
            key={round}
            aria-label="Soon"
            title="Tap to replay"
            onClick={() => setRound((r) => r + 1)}
            className={`flex cursor-pointer font-display text-[min(33vw,28vh,22rem)] leading-[0.95] font-bold tracking-[0.03em] text-sage [-webkit-text-stroke:0.03em_currentColor] select-none [-webkit-tap-highlight-color:transparent] ${landscapeShort}:text-[min(24vw,42vh)]`}
          >
            {"SOON".split("").map((ch, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="inline-block origin-bottom animate-jelly-drop will-change-transform motion-reduce:animate-fade"
                style={{ animationDelay: `${0.35 + i * 0.14}s` }}
              >
                {ch}
              </span>
            ))}
          </h1>

          {/* Ground */}
          <div key={`g${round}`} className="relative mt-0.5 h-4 w-[min(86vw,46rem)]" aria-hidden="true">
            <span
              className="absolute inset-x-0 top-0 h-0.5 animate-fade rounded-full bg-linear-to-r from-transparent via-sage to-transparent opacity-60"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="absolute inset-x-[12%] top-1.5 h-2.5 animate-ground-pulse rounded-full bg-sage-deep/30 blur-sm motion-reduce:animate-fade"
              style={{ animationDelay: "0.35s" }}
            />
          </div>

          <p
            className={`mt-2 max-w-md animate-fade text-[0.95rem] leading-relaxed text-muted ${shortScreen}`}
            style={{ animationDelay: "2.2s" }}
          >
            Something beautiful is being crafted. We’ll be here shortly.
          </p>
        </section>

        {/* Contact card */}
        <section
          aria-label="Contact"
          className={`flex w-full max-w-xl shrink-0 animate-fade flex-col gap-3 rounded-3xl border border-line bg-surface p-4 shadow-[0_18px_40px_-28px_var(--card-shadow)] sm:p-5 ${landscapeShort}:max-w-sm`}
          style={{ animationDelay: "2.4s" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-[0.75rem] text-muted">Owner</span>
              <span className="truncate font-serif text-[1.45rem] leading-tight font-semibold">{OWNER}</span>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex shrink-0 items-center gap-2 rounded-full bg-btn px-4 py-2.5 text-sm font-medium text-btn-ink transition hover:bg-btn-hover active:scale-[0.97] ${focusRing}`}
            >
              <MessageCircle size={16} strokeWidth={1.8} />
              Message
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 [@media(max-height:560px)_and_(orientation:landscape)]:grid-cols-1">
            <CopyField icon={Phone} label="WhatsApp number" value={PHONE_DISPLAY} copyValue={PHONE_RAW} />
            <CopyField icon={Globe} label="Website" value="ronakbyali.com" copyValue={SITE_URL} />
          </div>
        </section>
      </main>

      <footer className={`shrink-0 p-3 text-center text-[0.75rem] text-muted ${veryShortScreen}`}>
        © {new Date().getFullYear()} Ronak By Ali
      </footer>
    </div>
  );
}