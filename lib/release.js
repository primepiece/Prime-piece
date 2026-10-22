// Christmas Release 2026: three one-off grazing boards, sold singly or as the set of three.
//
// Going live: set RELEASE_LIVE to true and confirm the names/prices in CATALOG
// (api/checkout.js) and the RELEASE content block in gifts.html. Until then the gifts page
// shows the "first look" teaser and checkout refuses these items.
//
// Sold tracking lives in Stripe, like the vouchers: when a release board sells, the webhook
// (or a voucher-paid order) creates a Stripe product called "SOLD — Christmas Release …".
// Checkout and the gifts page check for it, so a board shows Sold the moment it's bought.
// To put a board back on sale (say after a refund), delete or archive that product in
// Stripe → Product catalogue.
//
// Lives outside /api so it isn't deployed as its own serverless function (Hobby plan limit).

export const RELEASE_LIVE = false;

// Each sellable item and the physical boards it uses up. The set uses all three, so it's
// unavailable once any board sells, and buying the set marks every board sold.
export const RELEASE_ITEMS = {
  'release-red':   ['release-red'],
  'release-green': ['release-green'],
  'release-white': ['release-white'],
  'release-set':   ['release-red', 'release-green', 'release-white'],
};
export const isRelease = id => Object.prototype.hasOwnProperty.call(RELEASE_ITEMS, id);

const STRIPE_VERSION = '2024-06-20';
const soldProductId = board => `pp_sold_${board.replace(/-/g, '_')}`;

async function stripe(path, { method = 'GET', params } = {}) {
  const headers = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Stripe-Version': STRIPE_VERSION };
  let body;
  if (params) { body = new URLSearchParams(params).toString(); headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body });
  return { status: r.status, data: await r.json() };
}

// { 'release-red': true, ... } for each physical board.
export async function soldBoards() {
  const boards = [...new Set(Object.values(RELEASE_ITEMS).flat())];
  const results = await Promise.all(boards.map(async b => {
    const { status, data } = await stripe(`products/${soldProductId(b)}`);
    if (status === 404) return [b, false];
    if (data.error) throw new Error(data.error.message);
    return [b, data.active !== false && !data.deleted];
  }));
  return Object.fromEntries(results);
}

// { 'release-red': true, 'release-set': true, ... } for each sellable item.
export async function soldItems() {
  const boards = await soldBoards();
  return Object.fromEntries(Object.entries(RELEASE_ITEMS).map(([id, parts]) => [id, parts.some(p => boards[p])]));
}

// Record a sale. Safe to call twice for the same order (a retried webhook).
export async function markSold(itemIds, order) {
  const boards = [...new Set(itemIds.filter(isRelease).flatMap(id => RELEASE_ITEMS[id]))];
  for (const b of boards) {
    const { data } = await stripe('products', {
      method: 'POST',
      params: { id: soldProductId(b), name: `SOLD — Christmas Release ${b.replace('release-', '')}`, 'metadata[order]': order || '' },
    });
    if (data.error && data.error.code !== 'resource_already_exists') throw new Error(data.error.message);
    // Already there from an earlier sale that James archived to re-list it: switch it back on.
    if (data.error) await stripe(`products/${soldProductId(b)}`, { method: 'POST', params: { active: 'true', 'metadata[order]': order || '' } });
  }
  return boards;
}
