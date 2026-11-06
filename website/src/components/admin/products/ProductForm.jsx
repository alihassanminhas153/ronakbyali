import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AlertCircle } from 'lucide-react';

import { addProduct, updateProduct } from '../../../store/slices/productsSlice';
import productService from '../../../lib/appwrite/product';
import ActionButton from '../../../ui/custom/button/ActionButton';
import ImageUploader from '../../../ui/custom/input/ImageUploader';
import SelectInput from '../../../ui/custom/input/SelectInput';
import SwitchInput from '../../../ui/custom/input/SwitchInput';
import TagInput from '../../../ui/custom/input/TagInput';
import TextInput from '../../../ui/custom/input/TextInput';
import Modal from '../../../ui/custom/modal/Modal';
import { buildPayload, emptyForm, finalPrice, productToForm, slugify, validateForm } from './productFields';

// Add / edit drawer. The parent mounts it with a new `key` for every opening (fresh state)
// and keeps it mounted so the closing animation can play: <ProductForm key={n} open={isOpen} />
//   product    : null = add a new product, a row = edit it
//   categories : string[] for the category dropdown
//   groups     : string[] for the group dropdown
//   onSaved    : called with the saved row after Appwrite accepted it
export default function ProductForm({ open = true, product = null, categories = [], groups = [], onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(product);

  const [form, setForm] = useState(() => (product ? productToForm(product) : emptyForm));
  const [images, setImages] = useState(() =>
    (product?.imageIds || []).map((id) => ({
      key: id,
      kind: 'existing',
      id,
      url: productService.getImageUrl(id),
    }))
  );
  const [slugAuto, setSlugAuto] = useState(!isEdit);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setText = (key) => (e) => set(key)(e.target.value);

  const onName = (e) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, ...(slugAuto ? { slug: slugify(name) } : {}) }));
    setErrors((er) => ({ ...er, name: undefined }));
  };

  const shownPrice = finalPrice(form.originalPrice, form.discountPercentage);
  const hasDiscount = Number(form.discountPercentage) > 0 && Number(form.originalPrice) > 0;

  const save = async (e) => {
    e.preventDefault();
    const found = validateForm(form, images.length);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setSaving(true);
    let uploadedIds = [];
    try {
      // 1. slug: typed slug must be free, empty slug is generated from the name
      const wanted = slugify(form.slug) || slugify(form.name);
      const rowId = product?.$id;
      let slug = wanted;
      if (!(await productService.isSlugAvailable(wanted, rowId))) {
        if (form.slug.trim() && !slugAuto) {
          setErrors({ slug: 'This slug is already used by another product.' });
          return;
        }
        slug = await productService.generateUniqueSlug(form.name, rowId);
        if (!slug) throw new Error('Could not create a unique slug.');
      }

      // 2. upload the new image files to the bucket
      const newItems = images.filter((i) => i.kind === 'new');
      if (newItems.length) {
        const uploaded = await productService.uploadImages(newItems.map((i) => i.file));
        if (!uploaded) throw new Error('Image upload failed. Please try again.');
        uploadedIds = uploaded.map((f) => f.$id);
      }

      // 3. final id list keeps the order shown in the uploader (first = main image)
      let next = 0;
      const imageIds = images.map((i) => (i.kind === 'existing' ? i.id : uploadedIds[next++]));

      // 4. write the row
      const payload = buildPayload(form, { slug, imageIds, sold: product?.sold ?? 0 });
      const saved = isEdit
        ? await dispatch(updateProduct([rowId, payload])).unwrap()
        : await dispatch(addProduct([payload])).unwrap();
      if (!saved) throw new Error('The product could not be saved.');

      // 5. edit only: delete files that were removed in the form from the bucket
      if (isEdit) {
        const removed = (product.imageIds || []).filter((id) => !imageIds.includes(id));
        if (removed.length) await productService.deleteImages(removed);
      }

      onSaved?.(saved);
    } catch (err) {
      // nothing was saved, so do not leave orphan files in the bucket
      if (uploadedIds.length) await productService.deleteImages(uploadedIds);
      setFormError(typeof err === 'string' ? err : err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      variant="drawer"
      busy={saving}
      onClose={onClose}
      title={isEdit ? 'Edit product' : 'Add product'}
      description={isEdit ? product.name : 'Fill in the details, then save to add it to the store.'}
      footer={
        <div className="flex justify-end gap-3">
          <ActionButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </ActionButton>
          <ActionButton type="submit" form="product-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add product'}
          </ActionButton>
        </div>
      }
    >
      <form id="product-form" onSubmit={save} noValidate className="space-y-8">
        {formError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-error">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <section className="space-y-5">
          <h3 className="font-display text-xl font-semibold tracking-wide text-text">Images</h3>
          <ImageUploader
            label="Product images"
            items={images}
            onChange={(next) => {
              setImages(next);
              setErrors((er) => ({ ...er, images: undefined }));
            }}
            error={errors.images}
            hint="The first image is the main one. Use the star to change it."
            disabled={saving}
          />
        </section>

        <section className="space-y-5">
          <h3 className="font-display text-xl font-semibold tracking-wide text-text">Details</h3>
          <TextInput label="Name" required value={form.name} onChange={onName} error={errors.name} maxLength={120} disabled={saving} />
          <TextInput
            label="Slug"
            value={form.slug}
            onChange={(e) => {
              setSlugAuto(false);
              set('slug')(slugify(e.target.value));
            }}
            error={errors.slug}
            hint="Used in the product link. Left empty, it is made from the name."
            disabled={saving}
          />
          <TextInput
            as="textarea"
            rows={4}
            label="Description"
            value={form.description}
            onChange={setText('description')}
            maxLength={1000}
            showCount
            disabled={saving}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectInput
              label="Category"
              required
              creatable
              options={categories}
              value={form.category}
              onChange={set('category')}
              error={errors.category}
              placeholder="Choose or add"
              disabled={saving}
            />
            <SelectInput
              label="Group"
              required
              creatable
              options={groups}
              value={form.group}
              onChange={set('group')}
              error={errors.group}
              placeholder="Choose or add"
              disabled={saving}
            />
          </div>
          <TagInput label="Tags" value={form.tags} onChange={set('tags')} hint="Press Enter or comma after each tag." disabled={saving} />
        </section>

        <section className="space-y-5">
          <h3 className="font-display text-xl font-semibold tracking-wide text-text">Price</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              label="Original price"
              required
              type="number"
              inputMode="numeric"
              min="0"
              prefix="Rs"
              value={form.originalPrice}
              onChange={setText('originalPrice')}
              error={errors.originalPrice}
              disabled={saving}
            />
            <TextInput
              label="Discount"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              suffix="%"
              value={form.discountPercentage}
              onChange={setText('discountPercentage')}
              error={errors.discountPercentage}
              disabled={saving}
            />
          </div>
          <div className="flex items-baseline justify-between gap-3 rounded-md border border-border bg-bg px-4 py-3">
            <span className="text-sm text-muted">Customers pay</span>
            <span className="text-right">
              {hasDiscount && (
                <span className="mr-2 text-sm text-muted line-through">{productService.formatPrice(form.originalPrice)}</span>
              )}
              <span className="font-display text-2xl font-bold text-text">{productService.formatPrice(shownPrice)}</span>
            </span>
          </div>
          <TextInput
            label="Cost price"
            type="number"
            inputMode="numeric"
            min="0"
            prefix="Rs"
            value={form.costPrice}
            onChange={setText('costPrice')}
            error={errors.costPrice}
            hint="Only visible here in the admin panel, never in the store."
            disabled={saving}
          />
        </section>

        <section className="space-y-5">
          <h3 className="font-display text-xl font-semibold tracking-wide text-text">Stock</h3>
          <TextInput
            label="Total available"
            required
            type="number"
            inputMode="numeric"
            min="0"
            value={form.totalAvailable}
            onChange={setText('totalAvailable')}
            error={errors.totalAvailable}
            hint={
              isEdit
                ? `${product.sold || 0} sold so far. Remaining and status update automatically.`
                : 'Remaining and status are worked out automatically.'
            }
            disabled={saving}
          />
          <SwitchInput
            label="Featured"
            description="Show this product in the featured section on the home page."
            checked={form.featured}
            onChange={set('featured')}
            disabled={saving}
          />
        </section>
      </form>
    </Modal>
  );
}
