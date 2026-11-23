import { cloneElement, isValidElement } from "react";
import PageArt from "../art/PageArt";

export default function PageHeader({ art, title, subtitle, actions, className = "" }) {
  const artNode = typeof art === "string"
    ? <PageArt name={art} size="md" decorative className="hidden w-28 lg:block lg:w-44" />
    : isValidElement(art)
      ? cloneElement(art, { className: `${art.props.className ?? ""} hidden lg:block w-28 lg:w-44` })
      : null;

  return (
    <header className={`border-0 bg-transparent p-0 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:p-6 ${className}`}>
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
        {artNode && <div className="shrink-0">{artNode}</div>}
        <div className="sr-only lg:not-sr-only lg:min-w-0 lg:flex-1">
          <h1 className="font-display text-4xl font-bold tracking-wide text-text">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 lg:ml-auto lg:justify-end [&>div]:min-w-0 [&>div]:max-w-full [&>div]:flex-wrap">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
