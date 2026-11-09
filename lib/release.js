// Christmas Release 2026: three one-off grazing boards, sold singly or as the set of three.
//
// Going live happens on its own, on a timer (no deploy needed at 7pm):
//   - from FIRST_LOOK_OPENS (Sat 14 Nov, 7pm NZ) people with the first-look link can buy. The
//     link is https://www.primepiece.co.nz/christmas.html?early=<FIRST_LOOK_KEY>; the page keeps
//     the key and checkout sends it back.
//   - from RELEASE_OPENS (Sun 15 Nov, 7pm NZ) everyone can buy, and the boards join the
//     product feed.
// Before that, christmas.html shows the "first look" teaser and checkout refuses these items.
// RELEASE_OVERRIDE overrides the timer: 'off' pauses the release, 'on' opens it to everyone
// now, null follows the timer.
//
// Sold tracking lives in Stripe, like the vouchers: when a release board sells, the webhook
// (or a voucher-paid order) creates a Stripe product called "SOLD — Christmas Release …".
// Checkout and christmas.html check for it, so a board shows Sold the moment it's bought.
// To put a board back on sale (say after a refund), delete or archive that product in
// Stripe → Product catalogue.
//
// Lives outside /api so it isn't deployed as its own serverless function (Hobby plan limit).

// New Zealand is on daylight time (UTC+13) in November.
export const FIRST_LOOK_OPENS = Date.parse('2026-11-14T19:00:00+13:00');
export const RELEASE_OPENS = Date.parse('2026-11-15T19:00:00+13:00');
// Goes in the first-look email link. Not a password, it just keeps the day-early window to the list.
export const FIRST_LOOK_KEY = 'fl-7JveWHQ3pqJZ';
export const RELEASE_OVERRIDE = null; // null | 'on' | 'off'

// Who can buy right now: 'everyone', 'first-look' (this visitor has the first-look key and it's
// the day before), or null (not on sale to them).
export function releaseOpenTo(earlyKey, now = Date.now()) {
  if (RELEASE_OVERRIDE === 'off') return null;
  if (RELEASE_OVERRIDE === 'on' || now >= RELEASE_OPENS) return 'everyone';
  if (now >= FIRST_LOOK_OPENS && earlyKey === FIRST_LOOK_KEY) return 'first-look';
  return null;
}
export const isReleasePublic = (now = Date.now()) => releaseOpenTo(null, now) === 'everyone';

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
