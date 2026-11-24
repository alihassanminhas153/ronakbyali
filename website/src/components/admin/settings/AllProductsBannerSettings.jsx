import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';

import ActionButton from '../../../ui/custom/button/ActionButton';
import productService from '../../../lib/appwrite/product';
import siteLayoutService from '../../../lib/appwrite/siteLayout';
import { ALL_PRODUCTS_BANNER_IMAGE_OPTIONS, optimizeImage } from '../../../lib/imageOptimizer';
import { Banner } from './SettingsParts';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function BannerImagePreview({ id, index }) {
  const [useFullImage, setUseFullImage] = useState(false);
  const [failed, setFailed] = useState(false);
  const thumbnail = productService.getThumbUrl(id, 640);
  const fullImage = productService.getImageUrl(id);

  if (failed || (!thumbnail && !fullImage)) {
    return (
      <div role="img" aria-label={`Preview unavailable for slide ${index + 1}`} className="grid h-full place-items-center text-sm text-muted">
        Preview unavailable
      </div>
    );
  }

  return (
    <img
      src={useFullImage ? fullImage : thumbnail || fullImage}
      alt={`Banner slide ${index + 1}`}
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => {
        if (!useFullImage && thumbnail && fullImage) setUseFullImage(true);
        else setFailed(true);
      }}
    />
  );
}

export default function AllProductsBannerSettings() {
  const [savedIds, setSavedIds] = useState(null);
  const [draftIds, setDraftIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);
  const pendingUploads = useRef(new Set());

  useEffect(() => {
    let active = true;
    siteLayoutService.getAllProductsBanner().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(`Could not load banner settings: ${result.message}`);
        setSavedIds([]);
        setDraftIds([]);
        return;
      }
      const ids = Array.isArray(result.row?.imageIds) ? result.row.imageIds : [];
      setSavedIds(ids);
      setDraftIds(ids);
    });
    return () => {
      active = false;
    };
  }, []);

  const changed = savedIds !== null && JSON.stringify(savedIds) !== JSON.stringify(draftIds);
  const busy = uploading || saving;

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setUploading(true);
    setError('');
    setNotice('');
    const uploadedIds = [];

    try {
      for (const file of files) {
        if (!ACCEPTED_TYPES.has(file.type)) {
          throw new Error('Choose JPG, PNG, or WebP images.');
        }
        const optimized = await optimizeImage(file, ALL_PRODUCTS_BANNER_IMAGE_OPTIONS);
        if (optimized.type !== 'image/webp') {
          throw new Error(`${file.name} could not be converted to WebP in this browser.`);
        }
        const uploaded = await productService.uploadImage(optimized, ALL_PRODUCTS_BANNER_IMAGE_OPTIONS);
        if (!uploaded?.$id) throw new Error(`Could not upload ${file.name}.`);
        uploadedIds.push(uploaded.$id);
      }

      uploadedIds.forEach((id) => pendingUploads.current.add(id));
      setDraftIds((ids) => [...ids, ...uploadedIds]);
    } catch (uploadError) {
      const cleanup = await siteLayoutService.deleteImagesIfUnused(uploadedIds);
      setError(
        cleanup.ok
          ? uploadError.message
          : `${uploadError.message} Some uploaded images could not be removed from storage.`
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    const result = await siteLayoutService.saveAllProductsBanner(draftIds);
    if (!result.ok) {
      setError(`Could not save banner images: ${result.message}`);
      setSaving(false);
      return;
    }

    const removedIds = [
      ...savedIds.filter((id) => !draftIds.includes(id)),
      ...[...pendingUploads.current].filter((id) => !draftIds.includes(id)),
    ];
    setSavedIds([...draftIds]);
    pendingUploads.current.clear();
    setNotice('Banner images saved.');

    const cleanup = await siteLayoutService.deleteImagesIfUnused(removedIds);
    if (!cleanup.ok) setError(`Banner saved, but removed images could not be fully cleaned up: ${cleanup.message}`);
    setSaving(false);
  };

  const discard = async () => {
    setSaving(true);
    const unsavedIds = [...pendingUploads.current].filter((id) => !savedIds.includes(id));
    setDraftIds([...savedIds]);
    pendingUploads.current.clear();
    setError('');
    setNotice('');
    const cleanup = await siteLayoutService.deleteImagesIfUnused(unsavedIds);
    if (!cleanup.ok) setError(`Changes discarded, but uploaded images could not be fully cleaned up: ${cleanup.message}`);
    setSaving(false);
  };

  const move = (index, direction) => {
    setDraftIds((ids) => {
      const target = index + direction;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (imageId) => setDraftIds((ids) => ids.filter((id) => id !== imageId));

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
      {error && <Banner kind="error" onDismiss={() => setError('')}>{error}</Banner>}
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-text">All Products image banner</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Add images that slide across the top of the All Products page. Images are converted to WebP with a 600 KB cap to preserve detail.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={uploadFiles}
            disabled={busy || savedIds === null}
            className="sr-only"
          />
          <ActionButton
            variant="secondary"
            icon={ImagePlus}
            onClick={() => fileInput.current?.click()}
            disabled={busy || savedIds === null}
            loading={uploading}
          >
            Add images
          </ActionButton>
          {changed && (
            <ActionButton variant="secondary" onClick={discard} disabled={busy}>
              Discard
            </ActionButton>
          )}
          <ActionButton variant="primary" onClick={save} disabled={!changed || busy} loading={saving}>
            Save banner
          </ActionButton>
        </div>
      </div>

      {savedIds === null ? (
        <p className="text-sm text-muted">Loading banner settings…</p>
      ) : draftIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-alt/40 px-4 py-8 text-center">
          <p className="font-medium text-text">No banner images yet</p>
          <p className="mt-1 text-sm text-muted">Add one or more images to show the banner below the site header.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {draftIds.map((id, index) => (
            <li key={id} className="overflow-hidden rounded-xl border border-border bg-surface-alt/40">
              <div className="aspect-[16/8] overflow-hidden bg-surface-alt">
                <BannerImagePreview id={id} index={index} />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm font-medium text-text">Slide {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={busy || index === 0}
                    aria-label={`Move slide ${index + 1} up`}
                    className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:text-text disabled:opacity-40"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={busy || index === draftIds.length - 1}
                    aria-label={`Move slide ${index + 1} down`}
                    className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:text-text disabled:opacity-40"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    disabled={busy}
                    aria-label={`Remove slide ${index + 1}`}
                    className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:border-error/50 hover:text-error disabled:opacity-40"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
