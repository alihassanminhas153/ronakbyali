// Compresses and converts images to WebP in the browser, BEFORE they are
// uploaded to the Appwrite bucket.
//
//   const file = await optimizeImage(originalFile);        // one File -> one File
//   const files = await optimizeImages(originalFiles);     // array, processed one by one
//
// What it does
//   - decodes the image (respects phone photo rotation / EXIF)
//   - shrinks it so the longest side is at most `maxSide` px (never enlarges)
//   - re-encodes as WebP at `quality` (0..1), keeps transparency (PNG logos etc.)
//   - renames the file to <name>.webp
// What it leaves alone (returned unchanged)
//   - GIF (animated), SVG, files that are not images
//   - WebP files that already fit inside `maxSide` (so running it twice is safe)
//   - if anything fails, the original file is uploaded instead (never blocks a save)
// Safari cannot encode WebP from a canvas; there it falls back to a compressed JPEG.

export const IMAGE_DEFAULTS = {
  maxSide: 1600, // px, longest side. 1200 = smaller files, 2000 = sharper zoom
  quality: 0.8, // 0.75 to 0.85 is the sweet spot for products
};

const SKIP_TYPES = ['image/gif', 'image/svg+xml'];

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function optimizeImage(file, options = {}) {
  const { maxSide, quality } = { ...IMAGE_DEFAULTS, ...options };
  if (!(file instanceof File) || !file.type.startsWith('image/') || SKIP_TYPES.includes(file.type)) return file;

  let source;
  try {
    source = await decode(file);
  } catch {
    return file; // unreadable (e.g. HEIC on a browser that cannot decode it)
  }

  try {
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));

    // already a WebP that fits: nothing to do (keeps this function idempotent)
    if (file.type === 'image/webp' && scale === 1) return file;

    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);

    let blob = await toBlob(canvas, 'image/webp', quality);
    let type = 'image/webp';
    let ext = 'webp';

    if (!blob || blob.type !== 'image/webp') {
      // this browser cannot encode WebP: compressed JPEG on a white background
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      blob = await toBlob(canvas, 'image/jpeg', quality);
      type = 'image/jpeg';
      ext = 'jpg';
      if (!blob || blob.size >= file.size) return file; // no gain, keep the original
    }

    canvas.width = 0; // release the canvas memory
    canvas.height = 0;

    const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';
    return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
  } catch (error) {
    console.error(`Image optimisation failed, uploading the original: ${error.message}`);
    return file;
  } finally {
    source.close?.();
  }
}

// One at a time on purpose: 5 large photos decoded together can exhaust phone memory.
export async function optimizeImages(files, options) {
  const out = [];
  for (const file of Array.from(files || [])) out.push(await optimizeImage(file, options));
  return out;
}
