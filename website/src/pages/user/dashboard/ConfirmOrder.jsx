import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import orderService from '../../../lib/appwrite/order';
import orderConfirmService from '../../../lib/appwrite/orderConfirm';

// The signed-in customer route accepts links like /@username/confirm-order?orderId=<id>.
export default function ConfirmOrder() {
    const [params] = useSearchParams();
    const orderId = params.get('orderId');

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null); // { ok, text }

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }
            const row = await orderService.getOrder(orderId); // the customer can read their own order
            if (alive) {
                setOrder(row || null);
                setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [orderId]);

    async function onConfirm() {
        setBusy(true);
        const res = await orderConfirmService.confirm({ orderId });
        setBusy(false);
        setMessage({ ok: res.ok, text: res.message || (res.ok ? 'Your order is confirmed.' : 'Could not confirm the order.') });
        if (res.ok) setOrder((o) => (o ? { ...o, isConfirmed: true } : o));
    }

    if (loading) return <p className="p-6">Loading your order...</p>;
    if (!orderId || !order) return <p className="p-6">We could not find this order. Please open the link from your e-mail again while signed in.</p>;

    const items = orderService.parseItems(order);
    const canConfirm = order.status === 'processing' && !order.isConfirmed;

    return (
        <div className="mx-auto max-w-lg p-6">
            <h1 className="mb-1 text-xl font-semibold">Confirm order {order.orderNumber}</h1>
            <p className="mb-4 text-sm opacity-70">Please check the details, then confirm.</p>

            <ul className="mb-4 divide-y rounded border">
                {items.map((i) => (
                    <li key={orderService.itemKey(i)} className="flex justify-between p-3 text-sm">
                        <span>{i.name} x {i.quantity}</span>
                        <span>Rs. {Math.round(i.price * i.quantity).toLocaleString()}</span>
                    </li>
                ))}
                <li className="flex justify-between p-3 font-semibold">
                    <span>Total</span>
                    <span>Rs. {Math.round(order.total).toLocaleString()}</span>
                </li>
            </ul>

            <p className="mb-4 text-sm">
                {order.customerName}, {order.customerPhone}<br />
                {order.address}, {order.city}
            </p>

            {message && (
                <p className={`mb-4 rounded p-3 text-sm ${message.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</p>
            )}

            {order.isConfirmed ? (
                <p className="font-medium">This order is confirmed. Thank you!</p>
            ) : canConfirm ? (
                <button onClick={onConfirm} disabled={busy} className="rounded bg-black px-5 py-2 text-white disabled:opacity-60">
                    {busy ? 'Confirming...' : 'Confirm my order'}
                </button>
            ) : (
                <p className="text-sm">This order is {order.status}, so it cannot be confirmed right now.</p>
            )}
        </div>
    );
}