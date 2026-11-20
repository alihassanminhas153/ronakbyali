import PageArt from "../../../ui/art/PageArt";

/* "Something went wrong" page. Shown only when a technical error breaks the UI
   (an uncaught render error), never for a missing page (that is NotFound).

   It deliberately uses plain <a> / <button> elements and no router hooks, so it
   still works when the error happened above the router or inside the store.

   props:
     error    the caught Error (details are shown in development only)
     onRetry  optional, resets the error boundary so the page renders again
*/
export default function ServerError({ error, onRetry }) {
  const isDev = import.meta.env.DEV;
  const details = error ? `${error.message || String(error)}${error.stack ? `\n\n${error.stack}` : ""}` : "";

  const primary =
    "inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const secondary =
    "inline-flex items-center justify-center rounded-xl border border-text/20 px-5 py-2.5 text-sm font-semibold text-text transition hover:bg-text/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-bg px-4 py-10 text-text">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <PageArt name="error" size="lg" decorative={false} />

        <div role="alert" className="mt-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Something went wrong</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-text/70 sm:text-base">
            The page hit an unexpected problem and couldn&apos;t load. Your data is safe. Try again, or go back to the home page.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button type="button" onClick={onRetry} className={primary}>
              Try again
            </button>
          )}
          <button type="button" onClick={() => window.location.reload()} className={onRetry ? secondary : primary}>
            Reload page
          </button>
          <a href="/" className={secondary}>
            Go to home
          </a>
        </div>

        {isDev && details && (
          <details className="mt-8 w-full rounded-xl border border-text/15 bg-text/5 p-4 text-left">
            <summary className="cursor-pointer text-sm font-semibold">Error details (development only)</summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-text/80">{details}</pre>
          </details>
        )}
      </div>
    </main>
  );
}