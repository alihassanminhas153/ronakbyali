import { Link } from "react-router";
import { ArrowUpRight, MessageCircle } from "lucide-react";

import CustomStudio from "../../components/home/CustomStudio";
import OrderPath from "../../components/home/OrderPath";
import Footer from "../../components/home/Footer";
import { PATHS } from "../../router/path";
import { WHATSAPP_URL } from "../../lib/siteInfo";

/* Custom studio page (route /custom-studio):
   1. the animated "custom order being made" drawing (no Learn more link here, it IS that page)
   2. the order path
   3. the details, as numbered cards. Edit the text in DETAILS below.
   4. two buttons to start, then the footer.
   The details are a first draft: please check them against how you really work. */

const DETAILS_TITLE = "The details";

// Each card: a title, then paragraphs (strings) and/or a list (array of strings)
const DETAILS = [
  {
    title: "What you can customise",
    text: ["Start from your own idea, or take one of our ready-made designs and change it."],
    list: [
      "Colour: pick the shade you like for the whole piece.",
      "Artwork: add a logo, a picture or a pattern.",
      "Words: a name, a message or a team name.",
      "Fit: tell us your size, or send exact measurements.",
    ],
  },
  {
    title: "What to send us",
    text: [
      "PNG, JPG or PDF files work best, and the larger and clearer the picture, the sharper the print. A photo of a rough sketch is fine too, and we will help you from there.",
      "Tell us the colour, the size, how many pieces you need and the date you need them by.",
    ],
  },
  {
    title: "Preview and price first",
    text: [
      "Before we start, we send you a preview of the design and the final price. You can ask for changes as many times as you need, and we only begin once you say yes.",
    ],
  },
  {
    title: "How long it takes",
    text: [
      "Custom pieces usually take 7 to 14 days, depending on the design and how many you order. We update you at every stage, from confirmed to packed to on its way.",
      "If you need it for a special date, tell us early and we will say honestly whether we can make it.",
    ],
  },
  {
    title: "Bulk and group orders",
    text: [
      "Making something for a team, an event or a gift? Tell us the quantity and the design and we will send a bulk price. Ask us about different sizes or names inside one order.",
    ],
  },
  {
    title: "Fit, changes and cancelling",
    text: [
      "Custom pieces are stitched to the size you give us, and if one does not fit we will alter it. You can change or cancel an order until we start making it. After that it cannot be cancelled or returned.",
    ],
  },
];

const btn =
  "inline-flex items-center gap-2 rounded-full px-5 py-3 font-heading text-sm font-semibold transition focus-visible:ring-4 focus-visible:ring-accent/20 sm:text-base";

export default function CustomStudioPage() {
  return (
    <main>
      <h1 className="sr-only">Custom designs</h1>

      <CustomStudio learnMore={false} />
      <OrderPath />

      {/* The details */}
      <section aria-labelledby="studio-details" className="mx-auto w-full max-w-[90rem] px-4 py-12 sm:px-6 sm:py-20">
        <h2
          id="studio-details"
          className="font-display text-4xl leading-[0.9] font-bold tracking-[0.01em] text-text uppercase sm:text-6xl lg:text-7xl"
        >
          {DETAILS_TITLE}
        </h2>

        <ol className="m-0 mt-6 grid list-none gap-2 p-0 sm:mt-10 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DETAILS.map(({ title, text = [], list }, i) => (
            <li
              key={title}
              className="rounded-3xl rounded-bl-none border border-border bg-surface px-4 py-4 sm:px-6 sm:py-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-accent bg-accent-soft font-display text-base font-bold text-accent sm:size-10 sm:text-lg">
                  {i + 1}
                </span>
                <h3 className="m-0 font-heading text-lg font-semibold text-text sm:text-2xl">{title}</h3>
              </div>

              {text.map((t) => (
                <p key={t} className="m-0 mt-3 text-sm leading-relaxed text-text sm:text-base">
                  {t}
                </p>
              ))}
              {list && (
                <ul className="m-0 mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-text marker:text-accent sm:text-base">
                  {list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Start */}
      <section
        aria-labelledby="studio-cta"
        className="mx-auto flex w-full max-w-[90rem] flex-col items-start gap-5 px-4 pb-14 sm:px-6 sm:pb-20"
      >
        <h2
          id="studio-cta"
          className="font-display text-4xl leading-[0.9] font-bold tracking-[0.01em] text-text uppercase sm:text-6xl lg:text-7xl"
        >
          Start yours
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to={PATHS.products} className={`${btn} bg-accent text-on-accent hover:opacity-90`}>
            Browse the shop
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} border border-border bg-surface text-text hover:border-accent hover:text-accent`}
          >
            <MessageCircle size={18} aria-hidden="true" />
            Message us
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}