import { useId, useState } from "react";
import FaqArt from "./FaqArt";
import { HOME_FAQS } from "./faqData";

/* ==========================================================================
   FAQS: a chat-style question list, exactly one viewport tall (minus the header).
   - Left: big heading, with an animated sleeping-cat drawing at the bottom on large screens.
   - Right: the questions. The open one shrinks to a bubble on the left and its
     answer slides in from the right, just under it, with a round badge on the end.
   - One answer is always open. Click another question to switch.
   Colours come only from your index.css variables, so light and dark both work.
   ========================================================================== */

const LOGO = "/images/icons/branding/logo.webp"; // logo shown in the round badge at the end of the answer

// Same trick as the hero: exactly one viewport tall minus the header, but never shorter than its content needs
const SECTION_HEIGHT = "min-h-[calc(100dvh-var(--header-h,4.5rem))]";

// items: the questions to show (edit them in faqData.js). as: "h2" on the home page, "h1" on the FAQs page.
export default function Faqs({ items = HOME_FAQS, as: Heading = "h2" }) {
  const [open, setOpen] = useState(0); // index of the open question; there is always one
  const baseId = useId();

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className={`mx-auto grid w-full max-w-[90rem] gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 ${SECTION_HEIGHT}`}
    >
      {/* Left: heading with the animated cat. Phones: side by side. Large screens: heading on top, cat at the bottom */}
      <div className="flex min-h-0 items-end justify-between gap-3 lg:sticky lg:top-[calc(var(--header-h,4.5rem)+1rem)] lg:h-[calc(100dvh-var(--header-h,4.5rem)-4rem)] lg:flex-col lg:items-stretch lg:gap-6 lg:self-start">
        <Heading
          id={`${baseId}-title`}
          className="min-w-0 font-display text-[2.75rem] leading-[0.85] font-bold tracking-[0.01em] text-text uppercase sm:text-7xl lg:text-8xl xl:text-9xl"
        >
          <span className="block">Things you</span>
          <span className="block">might ask</span>
        </Heading>

        <FaqArt className="w-[36%] max-w-[9rem] shrink-0 text-text sm:w-[30%] sm:max-w-[14rem] lg:mt-auto lg:max-h-[42dvh] lg:w-full lg:max-w-[34rem]" />
      </div>

      {/* Right: questions and the open answer */}
      <ul className="m-0 flex list-none flex-col justify-center gap-1.5 p-0 sm:gap-2 lg:self-center">
        {items.map(({ q, a }, i) => {
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
                      className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-accent bg-[#ddd] p-1.5 sm:size-12 sm:p-2"
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