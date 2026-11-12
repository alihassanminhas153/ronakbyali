import { useCallback, useEffect, useState } from 'react';

const EVENT = 'seen-alerts-changed';

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

// Remembers, per user and per browser, which alerts have been opened.
// Every component using it stays in sync (header bell, alerts page) through a window event.
export default function useSeenAlerts(userId) {
  const key = userId ? `seen-alerts:${userId}` : null;
  const [seen, setSeen] = useState(() => (key ? read(key) : []));

  useEffect(() => {
    const sync = () => setSeen(key ? read(key) : []);
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);

  const markSeen = useCallback(
    (ids) => {
      if (!key) return;
      const list = Array.isArray(ids) ? ids : [ids];
      try {
        localStorage.setItem(key, JSON.stringify([...new Set([...read(key), ...list])]));
      } catch {
        // Storage is unavailable (private mode, quota). The badge simply stays.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return { seen, markSeen };
}