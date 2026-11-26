import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Crop, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';

import ActionButton from '../../../ui/custom/button/ActionButton';
import productService from '../../../lib/appwrite/product';
import siteLayoutService from '../../../lib/appwrite/siteLayout';
import { ALL_PRODUCTS_BANNER_IMAGE_OPTIONS, optimizeImage } from '../../../lib/imageOptimizer';
import { Banner } from './SettingsParts';

// Each slide is stored as TWO images:
//   cropped  the wide strip the All Products page shows. Its id goes in the row's `imageIds` (in order).
//   full     the whole picture, kept so the position can be changed later.
// The full id and the crop position live in the row's `content` column as JSON, so the page keeps working
// with `imageIds` alone. Old slides (one image, no position) are treated as their own full image.

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RATIOS = [
  { label: '2:1', value: 2 },
  { label: '3:1', value: 3 },
  { label: '4:1', value: 4 },
];
const DEFAULT_RATIO = 3; // width / height of the banner strip
const MAX_SLIDES = 10;
const MAX_CROP_WIDTH = 2400; // pixels, before the 600 KB WebP cap
const LOW_RES_WIDTH = 1200;

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const iconBtn = `grid size-9 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let uidCounter = 0;
const nextUid = () => `new-${Date.now()}-${++uidCounter}`;
const baseName = (name) => (name || 'banner').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'banner';
const idsOf = (slide) => [slide.cropId, slide.fullId].filter(Boolean);
const revokeLocal = (slide) => {
  if (slide?.local?.cropUrl) URL.revokeObjectURL(slide.local.cropUrl);
  if (slide?.local?.fullUrl) URL.revokeObjectURL(slide.local.fullUrl);
};

/* ---------- reading and writing the saved row ---------- */

function parseSlides(row) {
  const ids = Array.isArray(row?.imageIds) ? row.imageIds : [];
  let meta = [];
  try {
    const parsed = JSON.parse(row?.content || '');
    if (Array.isArray(parsed?.slides)) meta = parsed.slides;
  } catch {
    // content is empty or not ours: every slide is an old, uncropped one
  }
  return ids.map((id) => {
    const m = meta.find((item) => item?.c === id);
    const hasRect = m && Number.isFinite(m.x) && Number.isFinite(m.y) && Number.isFinite(m.w);
    return {
      uid: `slide-${id}`,
      cropId: id,
      fullId: m?.f || id,
      rect: hasRect ? { x: m.x, y: m.y, w: m.w } : null,
      ratio: Number(m?.r) || null,
      local: null,
    };
  });
}

const buildMeta = (slides) =>
  slides.length
    ? JSON.stringify({
        v: 2,
        slides: slides.map((s) => ({ c: s.cropId, f: s.fullId, x: s.rect?.x, y: s.rect?.y, w: s.rect?.w, r: s.ratio })),
      })
    : '';

async function uploadWebp(file) {
  const optimized = await optimizeImage(file, ALL_PRODUCTS_BANNER_IMAGE_OPTIONS);
  if (optimized.type !== 'image/webp') throw new Error(`${file.name} could not be converted to WebP in this browser.`);
  const uploaded = await productService.uploadImage(optimized, ALL_PRODUCTS_BANNER_IMAGE_OPTIONS);
  if (!uploaded?.$id) throw new Error(`Could not upload ${file.name}.`);
  return uploaded.$id;
}

/* ---------- crop editor ---------- */

// Places a crop box of the given width (clamped) around a centre point, inside the picture.
function place(nat, ratio, wantW, cx, cy) {
  const maxW = Math.min(nat.w, nat.h * ratio);
  const w = clamp(wantW, maxW * 0.15, maxW);
  const h = w / ratio;
  return { x: clamp(cx - w / 2, 0, nat.w - w), y: clamp(cy - h / 2, 0, nat.h - h), w };
}

const CORNERS = [
  { sx: -1, sy: -1, pos: '-left-2.5 -top-2.5 cursor-nwse-resize' },
  { sx: 1, sy: -1, pos: '-right-2.5 -top-2.5 cursor-nesw-resize' },
  { sx: -1, sy: 1, pos: '-bottom-2.5 -left-2.5 cursor-nesw-resize' },
  { sx: 1, sy: 1, pos: '-bottom-2.5 -right-2.5 cursor-nwse-resize' },
];

function BannerCropper({ title, step, src, initial, onCancel, onApply }) {
  const imgRef = useRef(null);
  const stageRef = useRef(null);
  const drag = useRef(null);
  const [nat, setNat] = useState(null); // natural size of the picture
  const [area, setArea] = useState({ w: 0, h: 0 }); // room available for the picture
  const [ratio, setRatio] = useState(initial?.ratio || DEFAULT_RATIO);
  const [rect, setRect] = useState(null); // { x, y, w } in picture pixels
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // lock page scroll, close with Esc
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [busy, onCancel]);

  // measure the stage
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const onLoad = (e) => {
    const n = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
    setNat(n);
    if (initial?.rect && initial?.ratio) {
      const { rect: r, ratio: ir } = initial;
      setRect(place(n, ir, r.w, r.x + r.w / 2, r.y + r.w / ir / 2));
    } else {
      setRect(place(n, ratio, Infinity, n.w / 2, n.h / 2));
    }
  };

  const changeRatio = (next) => {
    if (!nat || !rect || next === ratio) return;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.w / ratio / 2;
    setRatio(next);
    setRect(place(nat, next, Infinity, cx, cy));
  };

  const scale = nat && area.w ? Math.min(area.w / nat.w, area.h / nat.h) : 1;
  const dw = nat ? nat.w * scale : 1;
  const dh = nat ? nat.h * scale : 1;
  const cropH = rect ? rect.w / ratio : 0;

  const startDrag = (e, type, corner) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { type, corner, sx: e.clientX, sy: e.clientY, rect };
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d || !nat) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    const h0 = d.rect.w / ratio;
    if (d.type === 'move') {
      setRect({ ...d.rect, x: clamp(d.rect.x + dx, 0, nat.w - d.rect.w), y: clamp(d.rect.y + dy, 0, nat.h - h0) });
      return;
    }
    const { sx, sy } = d.corner;
    const ax = sx > 0 ? d.rect.x : d.rect.x + d.rect.w; // the opposite corner stays put
    const ay = sy > 0 ? d.rect.y : d.rect.y + h0;
    const movX = (sx > 0 ? d.rect.x + d.rect.w : d.rect.x) + dx;
    const movY = (sy > 0 ? d.rect.y + h0 : d.rect.y) + dy;
    const wanted = (sx * (movX - ax) + sy * (movY - ay) * ratio) / 2;
    const room = Math.min(sx > 0 ? nat.w - ax : ax, (sy > 0 ? nat.h - ay : ay) * ratio);
    const w = clamp(wanted, Math.min(nat.w, nat.h * ratio) * 0.1, room);
    setRect({ x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - w / ratio, w });
  };

  const endDrag = () => {
    drag.current = null;
  };

  const onKeyDown = (e) => {
    if (!nat || !rect) return;
    const stepPx = (e.shiftKey ? 0.05 : 0.01) * nat.w;
    const moves = { ArrowLeft: [-stepPx, 0], ArrowRight: [stepPx, 0], ArrowUp: [0, -stepPx], ArrowDown: [0, stepPx] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setRect((r) => ({ ...r, x: clamp(r.x + m[0], 0, nat.w - r.w), y: clamp(r.y + m[1], 0, nat.h - r.w / ratio) }));
  };

  const apply = async () => {
    if (!rect || !imgRef.current) return;
    setBusy(true);
    setError('');
    try {
      const outW = Math.round(Math.min(rect.w, MAX_CROP_WIDTH));
      const outH = Math.round(outW / ratio);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgRef.current, rect.x, rect.y, rect.w, cropH, 0, 0, outW, outH);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not crop this image.');
      onApply({ blob, ratio, rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w) } });
    } catch (e) {
      setError(e.message || 'Could not crop this image.');
      setBusy(false);
    }
  };

  const lowRes = rect && rect.w < LOW_RES_WIDTH;

  // Rendered into <body> so it is centred on the screen. A transformed/filtered ancestor would otherwise
  // make `fixed` relative to the page container instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-dvh w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:max-h-[92dvh] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-text">{title}</h3>
            {step && <p className="text-xs text-muted">Image {step.pos} of {step.total}</p>}
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className={iconBtn}>
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div role="group" aria-label="Banner shape" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Shape</span>
            {RATIOS.map((r) => (
              <button
                key={r.value}
                type="button"
                aria-pressed={ratio === r.value}
                onClick={() => changeRatio(r.value)}
                disabled={!rect || busy}
                className={`rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors disabled:opacity-50 ${FOCUS} ${
                  ratio === r.value ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted hover:border-accent'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => nat && setRect(place(nat, ratio, Infinity, nat.w / 2, nat.h / 2))}
              disabled={!rect || busy}
              className={`ml-auto text-xs font-medium text-accent hover:underline disabled:opacity-50 ${FOCUS}`}
            >
              Reset
            </button>
          </div>

          {/* the whole picture with the crop box on it */}
          <div ref={stageRef} className="grid h-[44dvh] min-h-[13rem] place-items-center overflow-hidden rounded-xl bg-black/85 sm:h-[22rem]">
            <div className="relative overflow-hidden" style={{ width: dw, height: dh, opacity: nat ? 1 : 0 }}>
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={onLoad}
                onError={() => setError('This image could not be opened.')}
                className="block size-full select-none"
              />
              {rect && (
                <div
                  role="group"
                  tabIndex={0}
                  aria-label="Crop area. Drag it, or use the arrow keys, to move it."
                  onPointerDown={(e) => startDrag(e, 'move')}
                  onPointerMove={onMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={onKeyDown}
                  className="absolute cursor-move touch-none border-2 border-white outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{
                    left: rect.x * scale,
                    top: rect.y * scale,
                    width: rect.w * scale,
                    height: cropH * scale,
                    boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.58)',
                  }}
                >
                  {/* rule-of-thirds guides */}
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/35" />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/35" />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/35" />
                  {CORNERS.map((c) => (
                    <span
                      key={c.pos}
                      onPointerDown={(e) => startDrag(e, 'resize', c)}
                      onPointerMove={onMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      className={`absolute z-10 grid size-6 touch-none place-items-center ${c.pos}`}
                    >
                      <span aria-hidden="true" className="size-3 rounded-sm border-2 border-white bg-accent" />
                    </span>
                  ))}
                </div>
              )}
              {!nat && !error && (
                <span className="absolute inset-0 grid place-items-center text-white/70">
                  <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                </span>
              )}
            </div>
          </div>

          {/* what the page will show */}
          {rect && nat && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-text">On the page</span>
                <span className="tabular-nums text-muted">
                  {Math.round(Math.min(rect.w, MAX_CROP_WIDTH))} × {Math.round(Math.min(rect.w, MAX_CROP_WIDTH) / ratio)} px
                  {lowRes && <span className="text-error"> · low resolution</span>}
                </span>
              </div>
              <div className="relative w-full overflow-hidden rounded-lg border border-border bg-surface-alt" style={{ aspectRatio: ratio }}>
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url("${src}")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${(nat.w / rect.w) * 100}% auto`,
                    backgroundPosition: `${nat.w > rect.w ? (rect.x / (nat.w - rect.w)) * 100 : 0}% ${
                      nat.h > cropH ? (rect.y / (nat.h - cropH)) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
          <ActionButton variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </ActionButton>
          <ActionButton variant="primary" icon={Crop} onClick={apply} disabled={!rect || busy} loading={busy}>
            Apply crop
          </ActionButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- one slide in the list ---------- */

function SlideImage({ slide, index }) {
  const [useFull, setUseFull] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = slide.cropId;
  const thumbnail = id ? productService.getThumbUrl(id, 960) : '';
  const fullImage = id ? productService.getImageUrl(id) : '';
  const src = slide.local?.cropUrl || (useFull ? fullImage : thumbnail || fullImage);

  if (failed || !src) {
    return (
      <div role="img" aria-label={`Preview unavailable for slide ${index + 1}`} className="grid h-full place-items-center text-sm text-muted">
        Preview unavailable
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Banner slide ${index + 1}`}
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => {
        if (!slide.local?.cropUrl && !useFull && thumbnail && fullImage) setUseFull(true);
        else setFailed(true);
      }}
    />
  );
}

/* ---------- the section ---------- */

export default function AllProductsBannerSettings() {
  const [saved, setSaved] = useState(null); // slides as stored
  const [slides, setSlides] = useState([]); // slides on screen
  const [editor, setEditor] = useState(null); // the open crop editor
  const [queue, setQueue] = useState([]); // picked files still waiting for their crop
  const [batch, setBatch] = useState(0); // how many files were picked together
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);
  const replaceUid = useRef(null);
  const slidesRef = useRef([]);
  slidesRef.current = slides;

  useEffect(() => {
    let active = true;
    siteLayoutService.getAllProductsBanner().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(`Could not load banner settings: ${result.message}`);
        setSaved([]);
        setSlides([]);
        return;
      }
      const loaded = parseSlides(result.row);
      setSaved(loaded);
      setSlides(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // free the preview files when the section goes away
  useEffect(() => () => slidesRef.current.forEach(revokeLocal), []);

  // open the next picked file in the crop editor
  useEffect(() => {
    if (editor || !queue.length) return;
    const [file, ...rest] = queue;
    setQueue(rest);
    setEditor({
      kind: replaceUid.current ? 'replace' : 'new',
      uid: replaceUid.current,
      file,
      src: URL.createObjectURL(file),
      owned: true,
      step: batch > 1 ? { pos: batch - rest.length, total: batch } : null,
    });
  }, [editor, queue, batch]);

  const busy = saving;
  const dirty =
    saved !== null &&
    (slides.length !== saved.length || slides.some((s, i) => s.local || s.uid !== saved[i].uid));

  /* ----- picking files ----- */

  const takeFiles = (fileList, replacing = null) => {
    const files = Array.from(fileList || []);
    if (!files.length || busy) return;
    const valid = files.filter((f) => ACCEPTED_TYPES.has(f.type));
    if (valid.length !== files.length) setError('Choose JPG, PNG, or WebP images.');
    else setError('');
    setNotice('');
    const room = replacing ? 1 : MAX_SLIDES - slides.length;
    if (room <= 0) {
      setError(`A banner can have up to ${MAX_SLIDES} images.`);
      return;
    }
    const picked = valid.slice(0, room);
    if (valid.length > room) setError(`Only ${room} more ${room === 1 ? 'image fits' : 'images fit'} (limit ${MAX_SLIDES}).`);
    if (!picked.length) return;
    replaceUid.current = replacing;
    setBatch(picked.length);
    setQueue(picked);
  };

  const onPick = (event) => {
    const replacing = replaceUid.current;
    takeFiles(event.target.files, replacing);
    event.target.value = '';
  };

  const choose = () => {
    replaceUid.current = null;
    fileInput.current?.click();
  };

  const chooseReplacement = (uid) => {
    replaceUid.current = uid;
    fileInput.current?.click();
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    replaceUid.current = null;
    takeFiles(event.dataTransfer?.files);
  };

  /* ----- crop editor ----- */

  const openEdit = async (slide) => {
    setError('');
    setNotice('');
    if (slide.local?.fullUrl) {
      setEditor({ kind: 'edit', uid: slide.uid, src: slide.local.fullUrl, owned: false, initial: { rect: slide.rect, ratio: slide.ratio } });
      return;
    }
    setEditor({ kind: 'edit', uid: slide.uid, loading: true });
    try {
      const response = await fetch(productService.getImageUrl(slide.fullId));
      if (!response.ok) throw new Error('not ok');
      const blob = await response.blob();
      setEditor({ kind: 'edit', uid: slide.uid, src: URL.createObjectURL(blob), owned: true, initial: { rect: slide.rect, ratio: slide.ratio } });
    } catch {
      setEditor(null);
      setError('Could not load the full image to edit its position.');
    }
  };

  const closeEditor = useCallback(() => {
    setEditor((current) => {
      if (current?.owned && current.src) URL.revokeObjectURL(current.src);
      return null;
    });
    // cancelling a replacement should not leave the next picked file thinking it replaces something
    if (!queue.length) replaceUid.current = null;
  }, [queue.length]);

  const applyCrop = ({ blob, rect, ratio }) => {
    const e = editor;
    const cropFile = new File([blob], `${baseName(e.file?.name)}-banner.png`, { type: 'image/png' });
    const cropUrl = URL.createObjectURL(cropFile);

    if (e.kind === 'new') {
      const slide = {
        uid: nextUid(),
        cropId: null,
        fullId: null,
        rect,
        ratio,
        local: { fullFile: e.file, fullUrl: e.src, cropFile, cropUrl },
      };
      setSlides((list) => [...list, slide]);
    } else if (e.kind === 'replace') {
      setSlides((list) =>
        list.map((s) => {
          if (s.uid !== e.uid) return s;
          revokeLocal(s);
          return { ...s, cropId: null, fullId: null, rect, ratio, local: { fullFile: e.file, fullUrl: e.src, cropFile, cropUrl } };
        })
      );
    } else {
      setSlides((list) =>
        list.map((s) => {
          if (s.uid !== e.uid) return s;
          if (s.local?.cropUrl) URL.revokeObjectURL(s.local.cropUrl);
          return { ...s, rect, ratio, local: { ...(s.local || {}), cropFile, cropUrl } };
        })
      );
      if (e.owned && e.src) URL.revokeObjectURL(e.src);
    }
    replaceUid.current = null;
    setEditor(null);
  };

  /* ----- list actions ----- */

  const move = (index, direction) => {
    setSlides((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (uid) => {
    setSlides((list) => {
      list.filter((s) => s.uid === uid).forEach(revokeLocal);
      return list.filter((s) => s.uid !== uid);
    });
  };

  const discard = () => {
    slides.forEach(revokeLocal);
    setSlides(saved);
    setError('');
    setNotice('');
  };

  /* ----- save ----- */

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    const uploaded = []; // ids created by this save, removed again if it fails
    const uploadedFull = [];
    try {
      const next = [];
      for (const slide of slides) {
        let { cropId, fullId } = slide;
        if (slide.local?.fullFile) {
          fullId = await uploadWebp(slide.local.fullFile);
          uploaded.push(fullId);
          uploadedFull.push(fullId);
        }
        if (slide.local?.cropFile) {
          cropId = await uploadWebp(slide.local.cropFile);
          uploaded.push(cropId);
        }
        next.push({ ...slide, cropId, fullId });
      }

      const meta = buildMeta(next);
      const result = await siteLayoutService.saveAllProductsBanner(next.map((s) => s.cropId), meta);
      if (!result.ok) throw new Error(`Could not save banner images: ${result.message}`);

      // did the service keep the position data? (it has to write the `content` column)
      let metaKept = true;
      if (meta) {
        const check = await siteLayoutService.getAllProductsBanner();
        metaKept = !check.ok || (check.row?.content || '') === meta;
      }

      const finalSlides = next.map((s) => ({
        uid: `slide-${s.cropId}`,
        cropId: s.cropId,
        fullId: metaKept ? s.fullId : s.cropId,
        rect: metaKept ? s.rect : null,
        ratio: metaKept ? s.ratio : null,
        local: null,
      }));

      // remove every stored file that is no longer used: old crops, replaced pictures, removed slides
      const stillUsed = new Set(finalSlides.flatMap(idsOf));
      const gone = new Set([...saved.flatMap(idsOf), ...(metaKept ? [] : uploadedFull)]);
      const removedIds = [...gone].filter((id) => !stillUsed.has(id));

      slides.forEach(revokeLocal);
      setSaved(finalSlides);
      setSlides(finalSlides);
      setNotice('Banner saved.');

      const cleanup = await siteLayoutService.deleteImagesIfUnused(removedIds);
      if (!cleanup.ok) {
        setError(`Banner saved, but old images could not be fully removed from storage: ${cleanup.message}`);
      } else if (!metaKept) {
        setError(
          'Banner saved, but the position data was not stored, so Edit position will start from the cropped image. Make saveAllProductsBanner write its second argument to the content column.'
        );
      }
    } catch (saveError) {
      const cleanup = await siteLayoutService.deleteImagesIfUnused(uploaded);
      setError(
        cleanup.ok ? saveError.message : `${saveError.message} Some uploaded images could not be removed from storage.`
      );
    } finally {
      setSaving(false);
    }
  };

  /* ----- render ----- */

  const loading = saved === null;
  const full = slides.length >= MAX_SLIDES;

  return (
    <section
      onDragOver={(e) => {
        if (busy || loading) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={onDrop}
      className={`space-y-4 rounded-2xl border bg-surface p-4 shadow-soft transition-colors sm:p-5 ${
        dragging ? 'border-accent bg-accent-soft/30' : 'border-border'
      }`}
    >
      {error && <Banner kind="error" onDismiss={() => setError('')}>{error}</Banner>}
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-text">All Products banner</h3>
          <p className="mt-0.5 text-xs text-muted">
            {loading ? 'Loading…' : `${slides.length} of ${MAX_SLIDES} images · each one is cropped to the banner strip`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onPick}
            disabled={busy || loading}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <ActionButton variant="secondary" size="sm" icon={ImagePlus} onClick={choose} disabled={busy || loading || full}>
            Add images
          </ActionButton>
          {dirty && (
            <ActionButton variant="secondary" size="sm" onClick={discard} disabled={busy}>
              Discard
            </ActionButton>
          )}
          <ActionButton variant="primary" size="sm" onClick={save} disabled={!dirty || busy} loading={saving}>
            Save banner
          </ActionButton>
        </div>
      </div>

      {loading ? (
        <ul className="grid gap-3 md:grid-cols-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <li key={i} className="overflow-hidden rounded-xl border border-border">
              <div className="aspect-[3/1] animate-pulse bg-surface-alt motion-reduce:animate-none" />
              <div className="h-12 border-t border-border" />
            </li>
          ))}
        </ul>
      ) : slides.length === 0 ? (
        <div className="grid place-items-center rounded-xl border-2 border-dashed border-border bg-surface-alt/40 px-4 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
            <UploadCloud size={22} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-text">Drop images here</p>
          <p className="mt-1 max-w-xs text-xs text-muted">JPG, PNG or WebP. You will pick the part of each picture that shows on the page.</p>
          <div className="mt-4">
            <ActionButton variant="primary" size="sm" icon={ImagePlus} onClick={choose} disabled={busy}>
              Choose images
            </ActionButton>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {slides.map((slide, index) => (
            <li
              key={slide.uid}
              className={`overflow-hidden rounded-xl border bg-surface ${slide.local ? 'border-accent/50' : 'border-border'}`}
            >
              <div className="relative overflow-hidden bg-surface-alt" style={{ aspectRatio: slide.ratio || 2 }}>
                <SlideImage key={slide.local?.cropUrl || slide.cropId} slide={slide} index={index} />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  Slide {index + 1}
                </span>
                {slide.local ? (
                  <span className="absolute right-2 top-2 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-on-accent">
                    Not saved
                  </span>
                ) : (
                  !slide.rect && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                      Not cropped
                    </span>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(slide)}
                    disabled={busy || Boolean(editor)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
                  >
                    {editor?.loading && editor.uid === slide.uid ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Crop size={15} aria-hidden="true" />
                    )}
                    Edit position
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseReplacement(slide.uid)}
                    disabled={busy || Boolean(editor)}
                    aria-label={`Replace the image in slide ${index + 1}`}
                    title="Replace image"
                    className={iconBtn}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`Move slide ${index + 1} up`} className={iconBtn}>
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={busy || index === slides.length - 1} aria-label={`Move slide ${index + 1} down`} className={iconBtn}>
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(slide.uid)}
                    disabled={busy}
                    aria-label={`Remove slide ${index + 1}`}
                    className={`${iconBtn} hover:border-error/50 hover:text-error`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editor?.src && (
        <BannerCropper
          key={editor.src}
          title={editor.kind === 'edit' ? 'Edit position' : 'Crop image'}
          step={editor.step}
          src={editor.src}
          initial={editor.initial}
          onCancel={closeEditor}
          onApply={applyCrop}
        />
      )}
    </section>
  );
}