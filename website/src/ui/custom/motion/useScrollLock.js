import { useLayoutEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let savedStyles = null;

const isScrollableTarget = (target) =>
  target instanceof Element &&
  Boolean(target.closest('[data-scroll-lock-scrollable], [role="dialog"], [role="presentation"]'));

const preventBackgroundScroll = (event) => {
  if (!isScrollableTarget(event.target)) event.preventDefault();
};

function acquireScrollLock() {
  if (typeof document === 'undefined') return () => {};

  lockCount += 1;
  document.documentElement.classList.add('app-scroll-locked');
  if (lockCount === 1) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    savedStyles = {
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      bodyOverflow: document.body.style.overflow,
    };
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.removeEventListener('wheel', preventBackgroundScroll);
      document.removeEventListener('touchmove', preventBackgroundScroll);
      document.documentElement.classList.remove('app-scroll-locked');
      if (savedStyles) {
        document.body.style.position = savedStyles.bodyPosition;
        document.body.style.top = savedStyles.bodyTop;
        document.body.style.width = savedStyles.bodyWidth;
        document.body.style.overflow = savedStyles.bodyOverflow;
      }
      savedStyles = null;
      window.scrollTo(0, savedScrollY);
    }
  };
}

export default function useScrollLock(locked) {
  useLayoutEffect(() => {
    if (!locked) return undefined;
    return acquireScrollLock();
  }, [locked]);
}
