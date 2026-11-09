// Shared building blocks for the sidebar rows (nav links, profile, logout).
//
// Every row = [ IconCell ][ Fold label ].
// IconCell is exactly as wide as the collapsed rail's inner width (4.5rem rail
// - 1px border - 2 x 12px padding = 47px), so the icons never move sideways
// while the sidebar opens or collapses: only the label folds away.

export const ICON_CELL = 'flex w-[47px] shrink-0 items-center justify-center';

export function IconCell({ children }) {
  return <span className={ICON_CELL}>{children}</span>;
}

// A label that folds away when the sidebar is collapsed.
// duration-300 matches DURATION in DashboardShell.jsx.
export default function Fold({ collapsed, children, className = '' }) {
  return (
    <span
      aria-hidden={collapsed || undefined}
      className={`block min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none ${
        collapsed ? 'max-w-0 opacity-0' : 'max-w-48 opacity-100'
      } ${className}`}
    >
      {children}
    </span>
  );
}