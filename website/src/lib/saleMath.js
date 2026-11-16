export function getSaleStatus(sale, now = new Date()) {
    if (!sale) return 'ended';

    const toTime = (value) => (value == null || value === '' ? Number.NaN : new Date(value).getTime());
    const currentTime = toTime(now);
    const startsAt = toTime(sale.startsAt);
    const endsAt = toTime(sale.endsAt);
    if (![currentTime, startsAt, endsAt].every(Number.isFinite) || endsAt <= startsAt) {
        return 'ended';
    }
    if (currentTime < startsAt) return 'upcoming';
    if (currentTime >= endsAt) return 'ended';
    return 'active';
}

export function getEffectivePricing(product, sales, now = new Date()) {
    const originalPrice = Number(product?.originalPrice) || 0;
    const storedPrice = product?.price == null || product.price === '' ? Number.NaN : Number(product.price);
    const storedDiscount = Number(product?.discountPercentage) || 0;
    const sale = (sales || []).find((item) => item?.$id === product?.saleId);

    if (sale && getSaleStatus(sale, now) === 'active') {
        const discountPercentage = Number(sale.discountPercentage) || 0;
        return {
            price: Math.round(originalPrice * (1 - discountPercentage / 100)),
            originalPrice,
            discountPercentage,
            discountName: sale.name || null,
            sale,
        };
    }

    if (sale) {
        return {
            price: originalPrice,
            originalPrice,
            discountPercentage: 0,
            discountName: null,
            sale: null,
        };
    }

    return {
        price: Number.isFinite(storedPrice) ? storedPrice : originalPrice,
        originalPrice,
        discountPercentage: storedDiscount,
        discountName: product?.discountName || null,
        sale: null,
    };
}
