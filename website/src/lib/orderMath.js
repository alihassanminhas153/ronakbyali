const amount = (value) => Number(value) || 0;

export function paidAmountForOrder(order) {
  const total = Math.max(0, amount(order?.total));
  if (order?.paymentStatus === 'paid') return total;
  if (order?.paymentStatus === 'partial') {
    return Math.min(total, Math.max(0, amount(order.advanceAmount)));
  }
  return 0;
}
