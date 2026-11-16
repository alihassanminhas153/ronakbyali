import PageArt from "./PageArt";

/* ==========================================================================
   EmptyState: a picture, a title, a line of text and an optional button, centred.
   Use it for anything empty: an empty cart, no orders yet, or a search with no matches.

     <EmptyState art="cart" title="Your cart is empty" message="Add something you like." />

   NoSearchResults: the same thing ready-made for any failed search. It works for every search
   box on the site (orders in the admin panel, products in the shop, users, reviews...):

     <NoSearchResults query={search} noun="orders" onClear={() => setSearch("")} />
   ========================================================================== */

export function EmptyState({ art = "noResults", title, message, action, size = "lg", className = "" }) {
  return (
    <div role="status" className={`mx-auto flex max-w-xl flex-col items-center px-4 py-8 text-center sm:py-12 ${className}`}>
      <PageArt name={art} size={size} decorative />
      <h3 className="m-0 mt-4 font-heading text-lg font-semibold text-text sm:text-2xl">{title}</h3>
      {message && <p className="m-0 mt-1.5 text-sm text-muted sm:text-base">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function NoSearchResults({ query = "", noun = "results", onClear, className = "" }) {
  const trimmed = String(query).trim();
  return (
    <EmptyState
      art="noResults"
      className={className}
      title={`No ${noun} found`}
      message={
        trimmed
          ? `Nothing matches \u201c${trimmed}\u201d. Check the spelling, try a shorter word, or clear the search.`
          : "Nothing matches your search. Try a different word or clear the search."
      }
      action={
        onClear && (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer rounded-full border border-border bg-surface px-4 py-2 font-heading text-sm font-semibold text-text transition hover:border-accent hover:text-accent focus-visible:ring-4 focus-visible:ring-accent/20"
          >
            Clear search
          </button>
        )
      }
    />
  );
}

export default EmptyState;
