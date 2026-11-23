// src/ui/custom/input/useDropdownPosition.js
//
// Shared by SearchSelect and SelectInput. Works out WHERE the option panel goes so it always stays on
// the screen, and whether the input is so narrow that it should use its compact style.
//
//   const anchorRef = useRef(null);                 // the box that holds the trigger button
//   const { place, narrow } = useDropdownPosition(anchorRef, open, { reserve: 43 });
//
//   place  = null before the first measure, otherwise
//            { left, width, dropUp, panelMax, listMax }
//            left / width : px, relative to the anchor box (use style={{ left, width }})
//            dropUp       : open upward because there is more room above
//            panelMax    : max height in px for the full option panel
//            listMax      : max height in px for the scrolling option list
//   narrow = the input itself is under NARROW_PX wide (for example half of a 300px phone screen)
//
// Rules:
//   - The panel is at least `minWidth` wide (never narrower than the input) and never wider than the screen.
//   - If it is wider than the input, it lines up with the input's right edge when the input sits in the
//     right half of the screen, and with its left edge otherwise. It is then nudged to stay on screen.
//   - It opens downward unless there is not enough room below and more room above.
//   - The list shows `rows` options (5 by default); with more options it scrolls (see LIST_SCROLL).
//   - It follows scrolling, resizing and the on-screen keyboard (visualViewport) while open.

import { useCallback, useLayoutEffect, useState } from 'react';

export const ROW_PX = 36; // every option row is h-9
export const listHeight = (rows) => rows * ROW_PX + 8; // + the p-1 padding of the list

// Thin, quiet scrollbar for the option list. Standard properties only (Chrome 121+, Firefox, Safari 18.2+);
// older browsers fall back to their normal thin overlay scrollbar.
export const LIST_SCROLL =
  'overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--text-muted)_55%,transparent)_transparent]';

const GAP = 6; // px between input and panel
const MARGIN = 8; // px kept free at the screen edges
const NARROW_PX = 176; // inputs narrower than this use the compact style

// Pure maths (exported so it can be tested without a browser).
//   rect     : { left, right, top, bottom, width } of the anchor, in viewport pixels
//   viewport : { left, width, top, bottom } of the visible area
export function computePlacement(rect, viewport, { minWidth = 224, align = 'auto', reserve = 0, rows = 5 } = {}) {
  const maxWidth = Math.max(0, viewport.width - MARGIN * 2);
  const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
  const viewportLeft = viewport.left ?? 0;
  const viewportRight = viewportLeft + viewport.width;

  let viewLeft = rect.left;
  if (width > rect.width) {
    const inRightHalf = rect.left + rect.width / 2 > viewportLeft + viewport.width / 2;
    if (align === 'right' || (align === 'auto' && inRightHalf)) viewLeft = rect.right - width;
  }
  viewLeft = Math.min(Math.max(viewLeft, viewportLeft + MARGIN), viewportRight - MARGIN - width);

  const wanted = listHeight(rows);
  const below = viewport.bottom - rect.bottom - GAP - MARGIN;
  const above = rect.top - viewport.top - GAP - MARGIN;
  const wantedPanel = wanted + reserve;
  const dropUp = below < wantedPanel && above > below;
  const space = Math.max(0, dropUp ? above : below);
  const panelMax = Math.round(Math.min(wantedPanel, space));
  const listMax = Math.max(0, panelMax - reserve);

  return { left: Math.round(viewLeft - rect.left), width: Math.round(width), dropUp, panelMax, listMax };
}

export default function useDropdownPosition(anchorRef, open, { minWidth = 224, align = 'auto', reserve = 0, rows = 5 } = {}) {
  const [place, setPlace] = useState(null);
  const [narrow, setNarrow] = useState(false);

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setNarrow(rect.width > 0 && rect.width < NARROW_PX);

    const vv = window.visualViewport;
    const viewport = {
      left: vv ? vv.offsetLeft : 0,
      width: vv ? vv.width : document.documentElement.clientWidth || window.innerWidth,
      top: vv ? vv.offsetTop : 0,
      bottom: vv ? vv.offsetTop + vv.height : window.innerHeight,
    };
    const next = computePlacement(rect, viewport, { minWidth, align, reserve, rows });
    setPlace((prev) =>
      prev &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.dropUp === next.dropUp &&
      prev.panelMax === next.panelMax &&
      prev.listMax === next.listMax
        ? prev
        : next,
    );
  }, [anchorRef, minWidth, align, reserve, rows]);

  // Always: keep `narrow` right when the input is resized (for example the layout goes 1 -> 2 columns).
  useLayoutEffect(() => {
    measure();
    const el = anchorRef.current;
    const observer = typeof ResizeObserver === 'undefined' || !el ? null : new ResizeObserver(measure);
    if (observer) observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [anchorRef, measure]);

  // Only while open: re-measure before the panel is painted, then follow scrolling and the keyboard.
  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    const vv = window.visualViewport;
    window.addEventListener('scroll', measure, true);
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
    };
  }, [open, measure]);

  return { place, narrow };
}