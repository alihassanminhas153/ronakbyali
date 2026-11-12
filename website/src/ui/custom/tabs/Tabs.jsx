import { useLayoutEffect, useRef, useState } from 'react';

// <Tabs tabs={[{ id, label, icon?, badge? }]} value={id} onChange={setId} />
// <TabPanel key={id}>...</TabPanel>   (re-mounting with a key plays the enter animation)
export default function Tabs({ tabs, value, onChange, className = '' }) {
  const refs = useRef({});
  const [bar, setBar] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [value, tabs]);

  return (
    <div className={`no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${className}`}>
      <div role="tablist" className="relative flex min-w-max gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = t.id === value;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              ref={(el) => (refs.current[t.id] = el)}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={`group flex min-h-11 items-center gap-2 px-3.5 text-sm font-medium transition-colors sm:px-4 ${
                active ? 'text-accent' : 'text-muted hover:text-text'
              }`}
            >
              {Icon && <Icon size={16} className="transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6" />}
              {t.label}
              {t.badge != null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] transition-colors ${active ? 'bg-accent-soft text-accent' : 'bg-surface-alt text-muted'}`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="absolute -bottom-px h-0.5 rounded-full bg-accent transition-[left,width,background-color] duration-300 ease-out"
          style={{ left: bar.left, width: bar.width }}
        />
      </div>
    </div>
  );
}

export function TabPanel({ children, className = '' }) {
  return (
    <div role="tabpanel" className={`animate-rise ${className}`}>
      {children}
    </div>
  );
}