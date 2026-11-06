// Does  /:slug  point at a real product?  (short product link, see SlugRoute)
//
// SlugRoute calls this for any single-segment URL that is not the visitor's own
// username. When it resolves to false the visitor is redirected (logged in -> their
// panel, logged out -> /welcome-back) instead of seeing an empty product page.
//
// It is not connected to the product service yet, so it answers true and the
// Product page behaves exactly as before. Connect it to your product lookup,
// e.g.  return Boolean(await productService.getProduct({ productId: slug }));
export async function productExists(slug) { // eslint-disable-line no-unused-vars
  return true;
}