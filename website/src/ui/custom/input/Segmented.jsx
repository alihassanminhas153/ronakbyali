import { useLayoutEffect, useRef, useState } from 'react';
import { tint, toneVar } from '../../graphs/utils';

// Custom button group (replaces <select> / radio buttons).
//   options: [{ value, label, icon?, tone? }]   tone = 1-8 theme accent shade
//   <Segmented options={...} value={v} onChange={setV} />
export default function Segmented({ options, value, onChange, className = '', iconOnly = false, 'aria-label': ariaLabel }) {
  const refs = useRef({});
  const [thumb, setThumb] = useState({ left: 0, width: 0 });
  const active = options.find((o) => o.value === value);
  const color = toneVar(active?.tone ?? 1);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [value, options]);

  return (
    <div className={`flex min-w-0 max-w-full items-center gap-2 ${className}`}>
      <div className="no-scrollbar min-w-0 overflow-x-auto">
        <div role="radiogroup" aria-label={ariaLabel} className="relative inline-flex min-w-max gap-0.5 rounded-lg border border-border bg-surface-alt/60 p-1">
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 rounded-md transition-[left,width,background-color] duration-300 ease-out"
            style={{ left: thumb.left, width: thumb.width, background: tint(color, 16), boxShadow: `inset 0 0 0 1px ${tint(color, 40)}` }}
          />
          {options.map((o) => {
            const on = o.value === value;
            const Icon = o.icon;
            return (
              <button
                key={o.value}
                ref={(el) => (refs.current[o.value] = el)}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={iconOnly ? o.label : undefined}
                title={iconOnly ? o.label : undefined}
                onClick={() => onChange(o.value)}
                style={on ? { color: toneVar(o.tone ?? 1) } : undefined}
                className={`relative z-10 flex min-h-9 items-center gap-1.5 rounded-md ${iconOnly ? 'justify-center px-3' : 'px-3'} text-sm font-medium transition-colors ${on ? '' : 'text-muted hover:text-text'}`}
              >
                {Icon && <Icon size={15} />}
                {!iconOnly && o.label}
              </button>
            );
          })}
        </div>
      </div>
      {iconOnly && active && (
        <span className="shrink-0 text-sm font-medium text-text" aria-live="polite">
          {active.label}
        </span>
      )}
    </div>
  );
}