// On / off row. <SwitchField checked={v} onChange={setV} label="..." hint="..." tone={3} />
export default function SwitchField({ checked, onChange, label, hint, tone = 3 }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent-tone-3/60"
    >
      <span>
        <span className="block text-sm font-medium text-text">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full bg-border transition-colors duration-200"
        style={checked ? { background: `var(--accent-tone-${tone})` } : undefined}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}