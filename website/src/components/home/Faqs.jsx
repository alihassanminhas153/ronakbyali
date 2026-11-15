import { useId, useState } from "react";
import FaqArt from "./FaqArt";

/* ==========================================================================
   FAQS: a chat-style question list, exactly one viewport tall (minus the header).
   - Left: big heading, with an animated sleeping-cat drawing at the bottom on large screens.
   - Right: the questions. The open one shrinks to a bubble on the left and its
     answer slides in from the right, just under it, with a round badge on the end.
   - One answer is always open. Click another question to switch.
   Colours come only from your index.css variables, so light and dark both work.
   ========================================================================== */

/* ---- Content: replace these with your own ---- */
const FAQS = [
  {
    q: "Can I get a custom design made?",
    a: "Yes. Send us a picture, a sketch or just the idea, and we will tell you what is possible, how long it takes and what it costs before we start.",
  },
  {
    q: "How long does an order take?",
    a: "Ready-made pieces ship within 2 to 3 days. Custom pieces take 7 to 14 days depending on the design, and we update you at every stage.",
  },
  {
    q: "How do I know my size?",
    a: "Use the size guide on each product page, or send us your measurements and we will recommend the closest fit. Custom orders are stitched to your exact measurements.",
  },
  {
    q: "Is delivery safe and tracked?",
    a: "Every parcel is packed carefully and sent with a tracking number, so you can follow it from our door to yours.",
  },
  {
    q: "What if it does not fit?",
    a: "Tell us within 7 days and we will exchange it or alter it for you. Custom pieces can be altered, but they cannot be returned.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "You can pay online by card or bank transfer, or choose cash on delivery on ready-made pieces.",
  },
  {
    q: "Do you offer discounts?",
    a: "Yes. Seasonal sales and bulk-order discounts appear in the alerts bell and on the products page, so keep an eye there.",
  },
];

const LOGO = "../../../public/images/icons/branding/favicon.ico"; // logo shown in the round badge at the end of the answer

// Same trick as the hero: exactly one viewport tall minus the header, but never shorter than its content needs
const SECTION_HEIGHT = "min-h-[calc(100dvh-var(--header-h,4.5rem))]";

export default function Faqs() {
  const [open, setOpen] = useState(0); // index of the open question; there is always one
  const baseId = useId();

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className={`mx-auto grid w-full max-w-[90rem] gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 ${SECTION_HEIGHT}`}
    >
      {/* Left: heading, with an optional picture pinned to the bottom */}
      <div className="flex min-h-0 flex-col justify-between gap-6">
        <h2
          id={`${baseId}-title`}
          className="font-display text-5xl leading-[0.85] font-bold tracking-[0.01em] text-text uppercase sm:text-7xl lg:text-8xl xl:text-9xl"
        >
          <span className="block">Things you</span>
          <span className="block">might ask</span>
        </h2>

        {/* Animated drawing: large screens only, so phones keep the list in one screen */}
        <FaqArt className="mt-auto hidden max-h-[42dvh] w-full max-w-[34rem] text-text lg:block" />
      </div>

      {/* Right: questions and the open answer */}
      <ul className="m-0 flex list-none flex-col justify-center gap-1.5 p-0 sm:gap-2 lg:self-center">
        {FAQS.map(({ q, a }, i) => {
          const isOpen = open === i;
          const buttonId = `${baseId}-q${i}`;
          const panelId = `${baseId}-a${i}`;

          return (
            <li key={q} className="flex flex-col">
              <h3 className="m-0 text-[inherit]">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(i)}
                  className={`block cursor-pointer border px-4 py-2.5 text-left font-heading text-sm leading-snug font-semibold text-text transition-[background-color,border-color,border-radius,max-width] duration-300 outline-none focus-visible:ring-4 focus-visible:ring-accent/20 motion-reduce:transition-none sm:px-5 sm:py-3 sm:text-base ${
                    isOpen
                      ? "w-fit max-w-[92%] rounded-3xl rounded-bl-none border-accent bg-accent-soft"
                      : "w-full rounded-l-none rounded-r-3xl border-border bg-surface hover:border-accent"
                  }`}
                >
                  {q}
                </button>
              </h3>

              {/* Answer: the row grows open, and the bubble slides in from the right edge */}
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                aria-hidden={!isOpen}
                className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={`flex items-end gap-2 pt-1.5 pb-1 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:gap-3 sm:pt-2 ${
                      isOpen ? "translate-x-0 opacity-100 delay-100" : "translate-x-full opacity-0"
                    }`}
                  >
                    <p className="m-0 ml-4 flex-1 rounded-3xl rounded-br-none border border-border bg-bg px-4 py-3 text-sm leading-relaxed text-text sm:ml-16 sm:px-6 sm:py-4 sm:text-base">
                      {a}
                    </p>
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-accent bg-[#eee] p-1.5 sm:size-12 sm:p-2"
                    >
                      <img src={LOGO} alt="" draggable={false} className="size-full object-contain select-none" />
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}