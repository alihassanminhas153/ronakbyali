import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { PATHS, dashboardHome } from "../../../router/path";
import useSession from "../../../router/useSession";
import PageArt from "../../../ui/art/PageArt";

export default function NotFound() {
  const navigate = useNavigate();
  const { isLoggedIn, username, isStaff } = useSession();

  useEffect(() => {
    document.title = "404 | Page not found";
  }, []);

  const homeHref = (() => {
    if (!isLoggedIn) return PATHS.home;
    if (isStaff) return dashboardHome(username, true);
    return dashboardHome(username, false);
  })();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <PageArt name="notFound" size="hero" decorative />
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">404 error</p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-text sm:text-5xl">Page not found</h1>
        <p className="mx-auto max-w-md text-sm text-muted sm:text-base">
          The page you opened is unavailable or no longer exists. You can go back, or head to a safe place.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text transition hover:border-accent hover:text-accent"
        >
          Go back
        </button>
        <Link
          to={homeHref}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}