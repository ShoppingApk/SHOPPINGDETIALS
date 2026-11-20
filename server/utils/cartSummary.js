// Shared pricing rules for the bag and checkout.
const FREE_SHIPPING_ABOVE = 499;
const SHIPPING_FEE = 49;

const CART_POPULATE = { path: 'items.product', select: 'title brand images price mrp discountPercent sizes stock isActive' };

// Turns a populated cart into the response shape + price summary.
// Items whose product was deleted or deactivated are listed in `unavailable`.
function buildCart(cart) {
  const items = [];
  const unavailable = [];

  for (const item of cart?.items || []) {
    const p = item.product;
    if (!p || !p.isActive) {
      unavailable.push(String(item._id));
      continue;
    }
    items.push({
      _id: item._id,
      size: item.size,
      color: item.color || '',
      quantity: item.quantity,
      inStock: p.stock >= item.quantity,
      product: {
        _id: p._id,
        title: p.title,
        brand: p.brand,
        image: p.images?.[0]?.url || '',
        price: p.price,
        mrp: p.mrp,
        discountPercent: p.discountPercent,
        sizes: p.sizes,
        stock: p.stock,
      },
    });
  }

  const mrpTotal = items.reduce((s, i) => s + i.product.mrp * i.quantity, 0);
  const itemsTotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shippingFee = itemsTotal === 0 || itemsTotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;

  return {
    items,
    unavailable,
    summary: {
      count: items.reduce((s, i) => s + i.quantity, 0),
      mrpTotal,
      discount: mrpTotal - itemsTotal,
      itemsTotal,
      shippingFee,
      total: itemsTotal + shippingFee,
      freeShippingAbove: FREE_SHIPPING_ABOVE,
    },
  };
}

module.exports = { buildCart, CART_POPULATE, FREE_SHIPPING_ABOVE, SHIPPING_FEE };
