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
//   - by default, if anything fails, the original file is uploaded instead
//   - with `maxBytes` + `strictMaxBytes`, oversized files fail instead of bypassing the limit
// Safari cannot encode WebP from a canvas; there it falls back to a compressed JPEG.

export const IMAGE_DEFAULTS = {
  maxSide: 1600, // px, longest side. 1200 = smaller files, 2000 = sharper zoom
  quality: 0.8, // 0.75 to 0.85 is the sweet spot for products
};

const KIB = 1024;
const PRODUCT_IMAGE_MIN_BYTES = 50 * KIB;
const PRODUCT_IMAGE_MEDIUM_BYTES = 100 * KIB;
const PRODUCT_IMAGE_LARGE_BYTES = 150 * KIB;

// Source size <=50 KB gets a 50 KB cap, <=300 KB gets 100 KB, and larger files get 150 KB.
export const getProductImageTargetBytes = (file) => {
  const size = typeof file === 'number' ? file : Number(file?.size) || 0;
  if (size <= PRODUCT_IMAGE_MIN_BYTES) return PRODUCT_IMAGE_MIN_BYTES;
  if (size <= 300 * KIB) return PRODUCT_IMAGE_MEDIUM_BYTES;
  return PRODUCT_IMAGE_LARGE_BYTES;
};

export const PRODUCT_IMAGE_OPTIONS = {
  maxSide: 1600,
  quality: 0.82,
  minQuality: 0.4,
  maxBytes: getProductImageTargetBytes,
  strictMaxBytes: true,
};

export const REVIEW_IMAGE_OPTIONS = {
  maxSide: 1600,
  quality: 0.82,
  minQuality: 0.4,
  maxBytes: 1024 * 1024,
  strictMaxBytes: true,
};

export const ALL_PRODUCTS_BANNER_IMAGE_OPTIONS = {
  maxSide: 2400,
  quality: 0.9,
  minQuality: 0.72,
  maxBytes: 600 * KIB,
  strictMaxBytes: true,
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
  const { maxSide, quality, minQuality = 0.4, maxBytes: target, strictMaxBytes = false } = {
    ...IMAGE_DEFAULTS,
    ...options,
  };
  const targetBytes = typeof target === 'function' ? target(file) : target;
  const hasTarget = Number.isFinite(targetBytes) && targetBytes > 0;
  const failIfTooLarge = () => {
    throw new Error(`Image could not be compressed below ${Math.ceil(targetBytes / KIB)} KB.`);
  };

  if (!(file instanceof File) || !file.type.startsWith('image/') || SKIP_TYPES.includes(file.type)) {
    if (strictMaxBytes && hasTarget && file?.size > targetBytes) failIfTooLarge();
    return file;
  }

  let source;
  try {
    source = await decode(file);
  } catch {
    if (strictMaxBytes && hasTarget && file.size > targetBytes) failIfTooLarge();
    return file; // unreadable (e.g. HEIC on a browser that cannot decode it)
  }

  let canvas;
  try {
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    let scale = Math.min(1, maxSide / Math.max(sw, sh));

    // already a WebP that fits: nothing to do (keeps this function idempotent)
    if (file.type === 'image/webp' && scale === 1 && (!hasTarget || file.size <= targetBytes)) return file;

    canvas = document.createElement('canvas');
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';
    let currentQuality = quality;
    let blob;
    let type;
    let ext;
    const maxAttempts = hasTarget ? 40 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const width = Math.max(1, Math.round(sw * scale));
      const height = Math.max(1, Math.round(sh * scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('This browser could not process the image.');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, width, height);

      blob = await toBlob(canvas, 'image/webp', currentQuality);
      type = 'image/webp';
      ext = 'webp';

      if (!blob || blob.type !== 'image/webp') {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        blob = await toBlob(canvas, 'image/jpeg', currentQuality);
        type = 'image/jpeg';
        ext = 'jpg';
      }

      if (!blob) throw new Error('This browser could not encode the image.');
      if (!hasTarget) {
        if (type === 'image/jpeg' && blob.size >= file.size) return file;
        return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
      }
      if (blob.size <= targetBytes) return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
      if (file.size <= targetBytes) return file;

      if (currentQuality > minQuality) {
        currentQuality = Math.max(minQuality, currentQuality - 0.1);
      } else {
        scale *= 0.85;
        currentQuality = quality;
        if (Math.max(sw, sh) * scale < 160) break;
      }
    }

    if (strictMaxBytes && hasTarget && file.size > targetBytes) failIfTooLarge();
    if (blob && type && ext) return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
    return file;
  } catch (error) {
    console.error(`Image optimisation failed, uploading the original: ${error.message}`);
    if (strictMaxBytes && hasTarget && file.size > targetBytes) throw error;
    return file;
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    source.close?.();
  }
}

// One at a time on purpose: 5 large photos decoded together can exhaust phone memory.
export async function optimizeImages(files, options) {
  const out = [];
  for (const file of Array.from(files || [])) out.push(await optimizeImage(file, options));
  return out;
}
