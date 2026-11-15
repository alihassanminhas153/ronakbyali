import Footer from "../home/Footer";

/* Shared layout for the text pages (Privacy, Disclaimer): big heading and an animated drawing on
   the left (sticky on large screens), numbered cards on the right, then the footer.
   Props: titleLines (array of words, one per row), Art (an art component), updated (text),
          brand (text), sections ([{ title, text: [paragraphs], list: [bullets] }]) */

const SECTION_HEIGHT = "min-h-[calc(100dvh-var(--header-h,4.5rem))]";

export default function PolicyLayout({ id, titleLines, Art, updated, brand, sections }) {
  return (
    <main>
      <section
        aria-labelledby={id}
        className={`mx-auto grid w-full max-w-[90rem] gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 ${SECTION_HEIGHT}`}
      >
        {/* Left: heading + animated drawing */}
        <div className="flex min-h-0 flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h,4.5rem)+1rem)] lg:h-[calc(100dvh-var(--header-h,4.5rem)-4rem)] lg:gap-6 lg:self-start">
          <div className="flex items-end justify-between gap-3 lg:block">
            <h1
              id={id}
              className="min-w-0 font-display text-[2.75rem] leading-[0.85] font-bold tracking-[0.01em] text-text uppercase sm:text-7xl lg:text-7xl xl:text-8xl"
            >
              {titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            {/* phones and tablets: small, next to the heading */}
            <Art className="w-[40%] max-w-[10rem] shrink-0 text-text sm:w-[30%] sm:max-w-[15rem] lg:hidden" />
          </div>

          <p className="m-0 text-sm text-muted sm:text-base">
            {brand} &middot; Last updated {updated}
          </p>

          {/* large screens: big, pinned to the bottom */}
          <Art className="mt-auto hidden max-h-[42dvh] w-full max-w-[34rem] text-text lg:block" />
        </div>

        {/* Right: numbered cards */}
        <ol className="m-0 flex list-none flex-col gap-2 p-0 sm:gap-3">
          {sections.map(({ title, text = [], list }, i) => (
            <li
              key={title}
              className="rounded-3xl rounded-bl-none border border-border bg-surface px-4 py-4 sm:px-6 sm:py-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-accent bg-accent-soft font-display text-base font-bold text-accent sm:size-10 sm:text-lg">
                  {i + 1}
                </span>
                <h2 className="m-0 font-heading text-lg font-semibold text-text sm:text-2xl">{title}</h2>
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

      <Footer />
    </main>
  );
}