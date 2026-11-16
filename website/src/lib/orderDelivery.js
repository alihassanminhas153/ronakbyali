import settingsService from './appwrite/settings';

export async function getDeliveryChargesForLines(lines, subtotal) {
  if (!lines.length) return 0;
  if (lines.every((line) => line.product?.deliveryCharges != null)) {
    return lines.reduce(
      (total, line) => total + (Number(line.product.deliveryCharges) || 0) * (Number(line.quantity) || 0),
      0,
    );
  }
  return settingsService.getDeliveryCharges(subtotal);
}
