import { cloneElement, isValidElement } from "react";
import PageArt from "../art/PageArt";

export default function PageHeader({ art, title, subtitle, actions, className = "" }) {
  const artNode = typeof art === "string"
    ? <PageArt name={art} size="header" decorative />
    : isValidElement(art)
      ? cloneElement(art, { className: `${art.props.className ?? ""} block w-20 sm:w-24 lg:w-44` })
      : null;

  return (
    <header className={`rounded-xl border border-border bg-surface p-3 sm:p-4 lg:rounded-2xl lg:p-6 ${className}`}>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 lg:flex lg:flex-row lg:flex-wrap lg:gap-4">
        {artNode && <div className="shrink-0">{artNode}</div>}
        <div className="min-w-0 lg:flex-1">
          <h1 className="break-words font-display text-2xl font-bold leading-tight tracking-wide text-text sm:text-3xl lg:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1 break-words text-xs text-muted sm:text-sm">{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="col-span-2 flex w-full min-w-0 max-w-full flex-wrap items-center justify-end gap-2 lg:col-span-1 lg:ml-auto lg:w-auto lg:justify-end [&>div]:min-w-0 [&>div]:w-full [&>div]:max-w-full [&>div]:flex-wrap lg:[&>div]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
