import { useLayoutEffect } from 'react';

let lockCount = 0;

function acquireScrollLock() {
  if (typeof document === 'undefined') return () => {};

  lockCount += 1;
  document.documentElement.classList.add('app-scroll-locked');

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.documentElement.classList.remove('app-scroll-locked');
  };
}

export default function useScrollLock(locked) {
  useLayoutEffect(() => {
    if (!locked) return undefined;
    return acquireScrollLock();
  }, [locked]);
}
