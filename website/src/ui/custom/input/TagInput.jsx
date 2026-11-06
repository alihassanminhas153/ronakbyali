import { useId, useState } from 'react';
import { X } from 'lucide-react';

// Chips input. Enter or comma adds a tag, Backspace on an empty box removes the last one.
// Pasting "a, b, c" adds three tags. value / onChange use a plain array of strings.
export default function TagInput({
  label,
  value = [],
  onChange,
  placeholder = 'Add a tag',
  hint,
  error,
  max = 20,
  maxLength = 30,
  disabled = false,
  className = '',
}) {
  const id = useId();
  const [text, setText] = useState('');
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const addMany = (raw) => {
    const parts = String(raw).split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    parts.forEach((part) => {
      const tag = part.slice(0, maxLength);
      const exists = next.some((t) => t.toLowerCase() === tag.toLowerCase());
      if (!exists && next.length < max) next.push(tag);
    });
    onChange?.(next);
    setText('');
  };

  const removeAt = (index) => onChange?.(value.filter((_, i) => i !== index));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addMany(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      removeAt(value.length - 1);
    }
  };

  const onPaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (/[,\n]/.test(pasted)) {
      e.preventDefault();
      addMany(pasted);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-[0.8rem] font-medium text-muted lg:text-sm">
          {label}
        </label>
      )}

      <div
        className={`flex min-h-12 flex-wrap items-center gap-2 rounded-md border bg-bg px-2.5 py-2 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 ${
          error ? 'border-error' : 'border-border'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        {value.map((tag, i) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-sm bg-surface-alt py-1 pl-2.5 pr-1 text-sm text-text">
            {tag}
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(i)}
              aria-label={`Remove tag ${tag}`}
              className="flex size-5 items-center justify-center rounded-sm text-muted transition-colors hover:text-error focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          disabled={disabled || value.length >= max}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => addMany(text)}
          maxLength={maxLength}
          placeholder={value.length ? '' : placeholder}
          aria-describedby={messageId}
          className="min-w-24 flex-1 bg-transparent px-1 py-1 text-base text-text outline-none placeholder:text-muted/60"
        />
      </div>

      {(error || hint) && (
        <p id={messageId} className={`mt-2 text-sm ${error ? 'text-error' : 'text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
