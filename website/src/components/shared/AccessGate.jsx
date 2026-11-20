import { useLocation } from 'react-router';

import useSession from '../../router/useSession';
import usePanelAccess from '../../lib/layout/usePanelAccess';
import useUserLabels from '../../lib/layout/useUserLabels';
import { blockedBy, isBlocked } from '../../lib/layout/accessRules';
import { pageForPath } from '../../lib/layout/layoutRegistry';
import AccessDenied from '../../pages/shared/structure/AccessDenied';

// Sits inside DashboardShell, AFTER your route guards (sign-in check, "not staff -> own panel" redirect).
// So by the time it runs the person is signed in and allowed into this panel; it only answers one more
// question: is this label blocked from THIS page? If yes, the page is never rendered, so nothing from it loads.
//   - admins are never blocked
//   - locked pages (overview, settings) are never blocked
//   - if the rules table cannot be read, the page opens (the app must keep working)
export default function AccessGate({ area, children }) {
  const { pathname } = useLocation();
  const { username } = useSession();
  const { status, rows } = usePanelAccess();
  const labels = useUserLabels();

  if (labels.includes('admin')) return children;

  const page = pageForPath(area, pathname, username);
  if (!page || page.locked) return children;

  // wait for the rules, so a blocked page never flashes on screen
  if (status === 'idle' || status === 'loading') {
    return <div aria-hidden="true" className="h-48 animate-pulse rounded-2xl bg-surface-alt motion-reduce:animate-none" />;
  }

  const row = rows.find((r) => r.area === area && r.key === page.key);
  if (isBlocked(row, labels)) return <AccessDenied area={area} page={page} blockedBy={blockedBy(row, labels)} />;

  return children;
}
