import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';

// Multi-image picker with drag and drop, previews and a "main image" (always the first one).
//
// Controlled: `items` is an array and onChange(nextItems) gets the new array.
//   existing image : { key, kind: 'existing', id, url }   (already in the bucket)
//   new image      : { key, kind: 'new', file, url }      (File waiting to be uploaded)
// This component only builds the new-image items and previews. Uploading is the parent's job.
export default function ImageUploader({
  items,
  onChange,
  label = 'Images',
  hint,
  error,
  max = 8,
  maxSizeMB = 5,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const latest = useRef(items);

  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    latest.current = items;
  }, [items]);

  // free the preview URLs of unsaved files when the form closes
  useEffect(
    () => () => {
      latest.current.forEach((i) => i.kind === 'new' && URL.revokeObjectURL(i.url));
    },
    []
  );

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const room = max - items.length;
    const accepted = [];
    let message = '';

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        message = 'Only image files can be added.';
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        message = `Each image must be under ${maxSizeMB} MB.`;
        continue;
      }
      if (accepted.length >= room) {
        message = `You can add up to ${max} images.`;
        break;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        kind: 'new',
        file,
        url: URL.createObjectURL(file),
      });
    }

    setProblem(message);
    if (accepted.length) onChange([...items, ...accepted]);
  };

  const remove = (index) => {
    const gone = items[index];
    if (gone.kind === 'new') URL.revokeObjectURL(gone.url);
    setProblem('');
    onChange(items.filter((_, i) => i !== index));
  };

  const makeMain = (index) => {
    onChange([items[index], ...items.filter((_, i) => i !== index)]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(e.dataTransfer.files);
  };

  const message = error || problem;

  return (
    <div>
      {label && (
        <p className="mb-2 text-[0.8rem] font-medium text-muted lg:text-sm">
          {label} <span className="font-normal">({items.length}/{max})</span>
        </p>
      )}

      {items.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-surface-alt"
            >
              <img src={item.url} alt={`Product image ${index + 1}`} className="size-full object-cover" />

              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
                  Main
                </span>
              )}
              {item.kind === 'new' && (
                <span className="absolute bottom-2 left-2 rounded-sm bg-bg/90 px-2 py-0.5 text-xs text-muted">New</span>
              )}

              <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {index !== 0 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => makeMain(index)}
                    aria-label="Make this the main image"
                    title="Make main"
                    className="flex size-8 items-center justify-center rounded-sm bg-bg/90 text-text transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <Star size={16} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => remove(index)}
                  aria-label="Remove this image"
                  title="Remove"
                  className="flex size-8 items-center justify-center rounded-sm bg-bg/90 text-text transition-colors hover:text-error focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length < max && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
            dragging ? 'border-accent bg-accent/10' : error ? 'border-error' : 'border-border hover:bg-surface-alt'
          }`}
        >
          <ImagePlus size={26} aria-hidden="true" className="text-accent" />
          <span className="text-sm font-medium text-text">Drop images here or click to browse</span>
          <span className="text-xs text-muted">JPG, PNG or WebP, up to {maxSizeMB} MB each</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ''; // the same file can be chosen again
        }}
      />

      {(message || hint) && (
        <p role={message ? 'alert' : undefined} className={`mt-2 text-sm ${message ? 'text-error' : 'text-muted'}`}>
          {message || hint}
        </p>
      )}
    </div>
  );
}
