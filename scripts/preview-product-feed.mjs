// Prints the product feed exactly as /products.xml serves it, from the files in this checkout.
//   node scripts/preview-product-feed.mjs > /tmp/feed.xml
// Warnings (pieces left out and why) go to stderr. The Christmas Release is included only if
// it's open to everyone (lib/release.js), and then needs STRIPE_SECRET_KEY to check which boards have sold.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductFeed } from '../lib/product-feed.js';
import { CATALOG, NOT_SOLD_ONLINE, DELIVERY_FLAT_FEE, FREE_DELIVERY_THRESHOLD } from '../api/checkout.js';
import { isReleasePublic, soldItems } from '../lib/release.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { xml, items } = await buildProductFeed({
  root,
  catalog: CATALOG,
  notSoldOnline: NOT_SOLD_ONLINE,
  delivery: { fee: DELIVERY_FLAT_FEE, threshold: FREE_DELIVERY_THRESHOLD },
  releaseLive: isReleasePublic(),
  soldItems,
});
process.stdout.write(xml);
console.error(`${items.length} products`);
