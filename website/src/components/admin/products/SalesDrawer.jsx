import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays, Pencil, Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';

import { alertService } from '../../../lib/appwrite';
import productService from '../../../lib/appwrite/product';
import { addToast } from '../../../store/slices/uiSlice';
import {
  deleteSale,
  fetchSales,
  selectSalesError,
  selectSalesList,
  selectSalesStatus,
} from '../../../store/slices/saleSlice';
import { getSaleStatus } from '../../../lib/saleMath';
import ActionButton from '../../../ui/custom/button/ActionButton';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Modal from '../../../ui/custom/modal/Modal';
import SaleForm from './SaleForm';

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : DATE_FORMAT.format(date);
}

function StatusBadge({ sale }) {
  const status = getSaleStatus(sale);
  const style = {
    active: 'bg-accent-tone-7/10 text-accent-tone-7',
    upcoming: 'bg-accent-tone-3/10 text-accent-tone-3',
    ended: 'bg-surface-alt text-muted',
  }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style}`}>{status}</span>;
}

export default function SalesDrawer({ open, onClose }) {
  const dispatch = useDispatch();
  const sales = useSelector(selectSalesList);
  const status = useSelector(selectSalesStatus);
  const error = useSelector(selectSalesError);
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!open) return;
    setView('list');
    setEditing(null);
    dispatch(fetchSales());
  }, [dispatch, open]);

  const startAdd = () => {
    setEditing(null);
    setView('form');
  };
  const startEdit = (sale) => {
    setEditing(sale);
    setView('form');
  };
  const onSaved = () => {
    setView('list');
    setEditing(null);
    dispatch(fetchSales());
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const products = await productService.getProducts({ saleId: toDelete.$id });
      if (products === false) throw new Error('Could not load products using this sale.');

      const updates = products.map((product) => ({
        id: product.$id,
        data: {
          saleId: null,
          discountName: null,
          discountPercentage: 0,
          price: Number(product.originalPrice) || 0,
          priceFormat: productService.formatPrice(product.originalPrice),
        },
      }));
      if (!(await productService.updateProducts(updates))) {
        throw new Error('Could not clear this sale from every product.');
      }

      if (toDelete.alertId && !(await alertService.deleteAlert(toDelete.alertId))) {
        throw new Error('Could not delete the sale’s linked alert.');
      }
      await dispatch(deleteSale(toDelete.$id)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Sale deleted' }));
      setDeleteOpen(false);
      setToDelete(null);
    } catch (error) {
      setDeleteError(typeof error === 'string' ? error : error?.message || 'Could not delete the sale.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        busy={deleting}
        variant="drawer"
        title={view === 'form' ? (editing ? 'Edit sale' : 'Add sale') : 'Sales'}
        description={view === 'form' ? 'Set the sale period and discount.' : 'Manage product sales and their dates.'}
      >
        {view === 'form' ? (
          <SaleForm sale={editing} onCancel={() => setView('list')} onSaved={onSaved} />
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <ActionButton icon={Plus} onClick={startAdd}>Add sale</ActionButton>
            </div>

            {status === 'loading' && (
              <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
                <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                Loading sales…
              </div>
            )}
            {status === 'failed' && (
              <div role="alert" className="rounded-md border border-error/40 bg-error/10 p-4 text-sm text-error">
                {error || 'Could not load sales.'}
                <button type="button" onClick={() => dispatch(fetchSales())} className="ml-2 underline">Try again</button>
              </div>
            )}
            {status !== 'loading' && status !== 'failed' && sales.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Tag size={24} className="mx-auto text-muted" aria-hidden="true" />
                <p className="mt-3 font-medium text-text">No sales yet</p>
                <p className="mt-1 text-sm text-muted">Create a sale to apply a discount to products.</p>
              </div>
            )}
            <ul className="space-y-3">
              {sales.map((sale) => (
                <li key={sale.$id} className="rounded-lg border border-border bg-bg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-text">{sale.name}</h3>
                        <StatusBadge sale={sale} />
                      </div>
                      <p className="mt-1 text-sm font-medium text-accent">
                        {Number(sale.discountPercentage) || 0}% off
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(sale)}
                        aria-label={`Edit ${sale.name}`}
                        className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setToDelete(sale); setDeleteError(''); setDeleteOpen(true); }}
                        aria-label={`Delete ${sale.name}`}
                        className="grid size-9 place-items-center rounded-md text-muted hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-error"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
                    <CalendarDays size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{dateLabel(sale.startsAt)} – {dateLabel(sale.endsAt)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        danger
        busy={deleting}
        error={deleteError}
        title="Delete sale?"
        message={toDelete ? `Delete “${toDelete.name}”, remove it from its products, and delete its linked alert?` : ''}
        confirmLabel="Delete sale"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
