import { cloneElement, isValidElement } from "react";
import PageArt from "../art/PageArt";

export default function PageHeader({ art, title, subtitle, actions, className = "" }) {
  const artNode = typeof art === "string"
    ? <PageArt name={art} size="md" decorative className="hidden w-28 sm:block sm:w-32 lg:w-44" />
    : isValidElement(art)
      ? cloneElement(art, { className: `${art.props.className ?? ""} hidden sm:block w-28 sm:w-32 lg:w-44` })
      : null;

  return (
    <header className={`rounded-2xl border border-border bg-surface p-4 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {artNode && <div className="shrink-0">{artNode}</div>}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}
