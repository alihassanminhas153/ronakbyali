import { Component } from "react";
import { Link } from "react-router";

import NotFound from "../pages/shared/structure/NotFound";
import useSession from "./useSession";
import { PATHS, dashboardHome } from "./path";

function RouteErrorScreen({ error, onReset }) {
  const { isLoggedIn, username, isStaff } = useSession();
  const isNotFound = error instanceof Response && error.status === 404;

  if (isNotFound) return <NotFound />;

  const homeHref = !isLoggedIn ? PATHS.home : dashboardHome(username, isStaff);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Something went wrong</p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-text sm:text-5xl">We hit a problem</h1>
        <p className="mx-auto max-w-lg text-sm text-muted sm:text-base">
          The page could not be loaded. Please try again or head back to a safe place.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text transition hover:border-accent hover:text-accent"
        >
          Reload
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

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Route boundary error:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <RouteErrorScreen error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}
