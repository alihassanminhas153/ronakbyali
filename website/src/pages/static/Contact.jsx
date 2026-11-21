import { Link } from "react-router";
import { ArrowUpRight, Check, Copy, Mail, MessageCircle, User } from "lucide-react";

import ContactArt from "../../components/static/ContactArt";
import Footer from "../../components/home/Footer";
import useCopied from "../../lib/useCopied";
import { PATHS } from "../../router/path";
import { EMAIL, OWNER, WHATSAPP_SHOWN, WHATSAPP_URL } from "../../lib/siteInfo";

/* Contact page. Left: big heading and the animated envelope. Right: contact details as chat-style
   cards. Name: click to copy. Email: opens your mail app (copy button too). WhatsApp: opens a chat.
   Details live in src/lib/siteInfo.js. */

const SECTION_HEIGHT = "min-h-[calc(100dvh-var(--header-h,4.5rem))]";

const card =
  "flex items-center gap-3 rounded-3xl rounded-bl-none border border-border bg-surface px-4 py-3 transition-colors sm:gap-4 sm:px-5 sm:py-4";
const iconWrap =
  "grid size-10 shrink-0 place-items-center rounded-full border border-accent bg-accent-soft text-accent sm:size-12";
const pillBase =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-heading text-xs font-semibold transition focus-visible:ring-4 focus-visible:ring-accent/20 sm:text-sm";
const pill = `${pillBase} border-border bg-bg text-text hover:border-accent hover:text-accent`;
// Filled button: its text stays the "on accent" colour on hover (it used to turn into the background colour)
const pillPrimary = `${pillBase} border-accent bg-accent text-on-accent hover:text-on-accent hover:opacity-90`;

function Row({ icon: Icon, label, value, children }) {
  return (
    <li className={card}>
      <span className={iconWrap}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs text-muted sm:text-sm">{label}</p>
        <p className="m-0 font-heading text-base leading-snug font-semibold break-words text-text sm:text-xl">{value}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">{children}</div>
    </li>
  );
}

export default function Contact() {
  const { copied, copy } = useCopied();

  return (
    <main>
      <section
        aria-labelledby="contact-title"
        className={`mx-auto grid w-full max-w-[90rem] content-start gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:content-center lg:items-center lg:gap-12 ${SECTION_HEIGHT}`}
      >
        {/* Left: heading + animated envelope */}
        <div className="flex items-end justify-between gap-3 lg:flex-col lg:items-stretch lg:justify-start lg:gap-8">
          <h1
            id="contact-title"
            className="min-w-0 font-display text-[2.75rem] leading-[0.85] font-bold tracking-[0.01em] text-text uppercase sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            <span className="block">Let&rsquo;s</span>
            <span className="block">talk</span>
          </h1>
          <ContactArt className="w-[40%] max-w-[10rem] shrink-0 text-text sm:w-[32%] sm:max-w-[16rem] lg:max-h-[42dvh] lg:w-full lg:max-w-[34rem]" />
        </div>

        {/* Right: the details */}
        <div className="flex flex-col justify-center gap-4">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 sm:gap-3">
            <Row icon={MessageCircle} label="WhatsApp, the fastest way" value={WHATSAPP_SHOWN}>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={pillPrimary}>
                Open chat
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </Row>

            <Row icon={Mail} label="Email" value={EMAIL}>
              <a href={`mailto:${EMAIL}`} className={pill}>
                Write
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <button type="button" onClick={() => copy("email", EMAIL)} className={pill} aria-live="polite">
                {copied === "email" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied === "email" ? "Copied" : "Copy"}
              </button>
            </Row>

            <Row icon={User} label="Owner" value={OWNER}>
              <button type="button" onClick={() => copy("name", OWNER)} className={pill} aria-live="polite">
                {copied === "name" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied === "name" ? "Copied" : "Copy"}
              </button>
            </Row>
          </ul>

          <p className="m-0 text-sm text-muted sm:text-base">
            Quick question? Try the{" "}
            <Link to={PATHS.faqs} className="font-medium text-text underline underline-offset-4 hover:text-accent">
              FAQs
            </Link>{" "}
            first.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}