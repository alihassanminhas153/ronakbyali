import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';

import { placeDirectOrder } from '../../store/slices/ordersSlice';
import { selectProfile } from '../../store/slices/authSlice';
import { openLoginModal } from '../../store/slices/uiSlice';
import { PATHS } from '../../router/path';
import productService from '../../lib/appwrite/product';
import Modal from '../../ui/custom/modal/Modal';
import TextInput from '../../ui/custom/input/TextInput';
import SelectInput from '../../ui/custom/input/SelectInput';
import SelectionGrid from '../../ui/custom/input/SelectionGrid';
import ImageUploader from '../../ui/custom/input/ImageUploader';

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on delivery' },
  { value: 'advance', label: 'Advance payment' },
];
const DELIVERY_OPTIONS = [
  { value: 'regular', label: 'Regular delivery' },
  { value: 'fast', label: 'Fast delivery' },
  { value: 'pickup', label: 'Pickup' },
];

export default function CustomOrderDrawer({ open, onClose, product }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const profile = useSelector(selectProfile);
  const [form, setForm] = useState({
    customerName: profile?.name || '',
    customerPhone: profile?.phone || '',
    customerEmail: profile?.email || '',
    city: profile?.lastCity || '',
    address: profile?.lastAddress || '',
    notes: '',
    paymentType: 'cod',
    deliveryType: 'regular',
    customDetails: '',
  });
  const [referenceImages, setReferenceImages] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && !profile) {
      dispatch(openLoginModal());
      onClose();
    }
  }, [dispatch, onClose, open, profile]);

  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || profile.name || '',
      customerPhone: current.customerPhone || profile.phone || '',
      customerEmail: current.customerEmail || profile.email || '',
      city: current.city || profile.lastCity || '',
      address: current.address || profile.lastAddress || '',
    }));
  }, [profile]);

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!profile) {
      dispatch(openLoginModal());
      return;
    }
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.city.trim() || !form.address.trim()) {
      setError('Enter your name, phone, city, and delivery address.');
      return;
    }
    if (!form.customDetails.trim()) {
      setError('Describe the customization you want.');
      return;
    }

    setSaving(true);
    let uploadedFileId = null;
    try {
      if (referenceImages[0]?.kind === 'new') {
        const uploaded = await productService.uploadImage(referenceImages[0].file);
        if (!uploaded) throw new Error('Could not upload the reference image.');
        uploadedFileId = uploaded.$id;
      } else {
        uploadedFileId = referenceImages[0]?.id || null;
      }

      const result = await dispatch(placeDirectOrder({
        product,
        quantity: 1,
        form: {
          ...form,
          isCustom: true,
          customDetails: form.customDetails.trim(),
          customFileId: uploadedFileId,
          toast: true,
        },
        toast: true,
      }));
      if (!placeDirectOrder.fulfilled.match(result)) {
        throw new Error(String(result.payload || result.error?.message || 'Could not place your custom order.'));
      }

      onClose();
      const username = result.payload?.username || profile.username;
      if (username) navigate(PATHS.user.orders(username));
    } catch (submitError) {
      if (uploadedFileId && referenceImages[0]?.kind === 'new') await productService.deleteImage(uploadedFileId);
      setError(submitError instanceof Error ? submitError.message : 'Could not place your custom order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open && Boolean(profile)}
      onClose={onClose}
      title={`Customize ${product?.name || 'product'}`}
      description="Tell us what you would like and we’ll prepare a custom order."
      variant="drawer"
      busy={saving}
      footer={(
        <button form="custom-order-form" type="submit" disabled={saving} className="btn btn-primary w-full">
          {saving ? 'Submitting…' : 'Place custom order'}
        </button>
      )}
    >
      <form id="custom-order-form" onSubmit={submit} className="space-y-5">
        {product?.customDetails && (
          <section className="rounded-lg border border-border bg-surface-alt p-4">
            <h3 className="text-sm font-semibold text-text">Customization guidance</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-muted">{product.customDetails}</p>
          </section>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Name" required value={form.customerName} onChange={set('customerName')} maxLength={128} autoComplete="name" />
          <TextInput label="Phone" required type="tel" value={form.customerPhone} onChange={set('customerPhone')} maxLength={20} autoComplete="tel" />
          <TextInput label="City" required value={form.city} onChange={set('city')} maxLength={100} autoComplete="address-level2" />
          <TextInput label="Email" type="email" value={form.customerEmail} onChange={set('customerEmail')} maxLength={320} autoComplete="email" />
          <TextInput className="sm:col-span-2" label="Address" required as="textarea" rows={2} value={form.address} onChange={set('address')} maxLength={500} autoComplete="street-address" />
          <TextInput className="sm:col-span-2" label="Your customization" required as="textarea" rows={4} value={form.customDetails} onChange={set('customDetails')} maxLength={1000} showCount hint="Describe the colors, size, or changes you need." />
          <div className="sm:col-span-2">
            <SelectionGrid>
              <SelectInput className="min-w-0" label="Payment method" value={form.paymentType} onChange={(paymentType) => setForm((current) => ({ ...current, paymentType }))} options={PAYMENT_OPTIONS} size="md" />
              <SelectInput className="min-w-0" label="Delivery type" value={form.deliveryType} onChange={(deliveryType) => setForm((current) => ({ ...current, deliveryType }))} options={DELIVERY_OPTIONS} size="md" />
            </SelectionGrid>
          </div>
          <TextInput className="sm:col-span-2" label="Order notes" as="textarea" rows={2} value={form.notes} onChange={set('notes')} maxLength={1000} />
          <div className="sm:col-span-2">
            <ImageUploader items={referenceImages} onChange={setReferenceImages} label="Reference image" hint="Optional image showing what you have in mind." max={1} maxSizeMB={5} disabled={saving} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
      </form>
    </Modal>
  );
}
