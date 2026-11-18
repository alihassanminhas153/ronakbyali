import { Moon, Sun } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';
const FADE = `transition-opacity duration-300 ${EASE} motion-reduce:transition-none`;

// Switch geometry (px). The knob position is set with inline styles on purpose,
// so it moves the same way whatever the Tailwind version is.
const TRACK_W = 56;
const TRACK_H = 32;
const BORDER = 1;
const KNOB = 24;
const GAP = 3; // space between the knob and the track edge
const TRAVEL = TRACK_W - BORDER * 2 - KNOB - GAP * 2; // 24px
const KNOB_TOP = (TRACK_H - BORDER * 2 - KNOB) / 2; // 3px

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Sidebar-only theme control. One row, two looks that cross-fade in the same space:
//   expanded  -> "Dark mode" label + a real toggle switch. The round knob slides from the sun
//                side to the moon side and the icon inside it turns from sun to moon.
//   collapsed -> the round icon button from ThemeToggle.jsx (shows the icon of the theme you will get)
// Only the visible look can be clicked or focused; the hidden one is inert.
export default function SidebarThemeToggle({ collapsed = false }) {
  const { isDark, toggleTheme } = useTheme();
  const actionLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  const reduce = prefersReducedMotion();
  const slide = reduce ? 'none' : 'transform 380ms cubic-bezier(0.22,1,0.36,1), background-color 300ms, color 300ms';

  const iconBase = `absolute transition-all duration-500 ${EASE} motion-reduce:transition-none`;
  const shown = 'rotate-0 scale-100 opacity-100';
  const hiddenTurnLeft = '-rotate-90 scale-0 opacity-0';
  const hiddenTurnRight = 'rotate-90 scale-0 opacity-0';

  return (
    <div className="relative h-11 w-full overflow-hidden">
      {/* ---------- expanded: label + switch ---------- */}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Dark mode"
        aria-hidden={collapsed || undefined}
        tabIndex={collapsed ? -1 : 0}
        onClick={toggleTheme}
        className={`group absolute left-0 top-0 flex h-11 w-full min-w-[14.9rem] cursor-pointer items-center justify-between rounded-md px-2.5 text-sm text-muted hover:bg-surface-alt hover:text-text focus-visible:-outline-offset-2 focus-visible:outline-accent ${FADE} ${
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        style={{ transitionDelay: collapsed ? '0ms' : '120ms' }}
      >
        <span className="whitespace-nowrap">Dark mode</span>

        {/* the toggle: track with both icons printed on it, knob on top */}
        <span
          aria-hidden="true"
          className={`block shrink-0 rounded-full border transition-colors duration-300 motion-reduce:transition-none ${
            isDark ? 'border-accent/40 bg-accent-soft' : 'border-border bg-surface-alt'
          }`}
          style={{
            position: 'relative',
            width: TRACK_W,
            height: TRACK_H,
            boxSizing: 'border-box',
          }}
        >
          {/* faint sun (left) and moon (right) on the track */}
          <Sun
            size={14}
            strokeWidth={2}
            className="text-muted"
            style={{ position: 'absolute', left: 8, top: (TRACK_H - BORDER * 2 - 14) / 2, opacity: 0.55 }}
          />
          <Moon
            size={14}
            strokeWidth={2}
            className="text-muted"
            style={{ position: 'absolute', right: 8, top: (TRACK_H - BORDER * 2 - 14) / 2, opacity: 0.55 }}
          />

          {/* knob: slides across, holds the active icon */}
          <span
            className={`grid place-items-center rounded-full shadow-soft ${
              isDark ? 'bg-accent text-on-accent' : 'bg-white text-amber-500'
            }`}
            style={{
              position: 'absolute',
              left: GAP,
              top: KNOB_TOP,
              width: KNOB,
              height: KNOB,
              transform: `translateX(${isDark ? TRAVEL : 0}px)`,
              transition: slide,
            }}
          >
            <Sun size={14} strokeWidth={2} className={`${iconBase} ${isDark ? hiddenTurnRight : shown}`} />
            <Moon size={14} strokeWidth={2} className={`${iconBase} ${isDark ? shown : hiddenTurnLeft}`} />
          </span>
        </span>
      </button>

      {/* ---------- collapsed: round button, same as ThemeToggle ---------- */}
      <span className="pointer-events-none absolute left-0 top-0 flex h-11 w-[47px] items-center justify-center">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={actionLabel}
          aria-hidden={!collapsed || undefined}
          tabIndex={collapsed ? 0 : -1}
          title={actionLabel}
          className={`relative grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-surface text-accent transition-[opacity,border-color,background-color] duration-300 ${EASE} hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
            collapsed ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ transitionDelay: collapsed ? '150ms' : '0ms' }}
        >
          <Sun size={18} strokeWidth={1.7} aria-hidden="true" className={`${iconBase} ${isDark ? shown : hiddenTurnRight}`} />
          <Moon size={18} strokeWidth={1.7} aria-hidden="true" className={`${iconBase} ${isDark ? hiddenTurnLeft : shown}`} />
        </button>
      </span>
    </div>
  );
}