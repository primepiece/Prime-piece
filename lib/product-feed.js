// Google Merchant Center / Pinterest product feed, built from the live product pages.
//
// Served at /products.xml (vercel.json rewrites it to /api/checkout?feed=products; it lives in
// the checkout function because the Hobby plan is at its 12-function cap). Nothing to update by
// hand: a piece is in the feed exactly when the site sells it online, i.e. when
//   - its page has an Add to Cart for it (a literal Cart.add({...}) on tables, plinths, boards
//     or gift vouchers, or a basin with a cartId on the basins page),
//   - its card isn't marked Sold,
//   - it's in CATALOG and not in NOT_SOLD_ONLINE (api/checkout.js), and the page price matches
//     the CATALOG price (a mismatch would get the listing disapproved, so it's left out and logged),
//   - Christmas Release boards: only once the release is open to everyone (lib/release.js) and
//     not sold in Stripe.
// Mark a piece Sold on its page (or remove its Add to Cart) and it drops out of the feed on the
// next fetch. Titles, descriptions and categories are generated from the card's name, stone,
// size and description.
//
// Lives outside /api so it isn't deployed as its own serverless function.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://www.primepiece.co.nz';

// Pages whose cards carry a literal Cart.add({id:'…',…}) and an openModal(…) with the details.
const CARD_PAGES = ['tables.html', 'plinths.html', 'boards.html', 'gift-vouchers.html'];

const COFFEE = 'Furniture > Tables > Accent Tables > Coffee Tables';
const END = 'Furniture > Tables > Accent Tables > End Tables';
const SERVING = 'Home & Garden > Kitchen & Dining > Tableware > Serveware > Serving Platters';
// Cart type → [Google product category, our own product type]
const TYPES = {
  'Coffee Table':         [COFFEE, 'Coffee Tables > Round Stone Coffee Tables'],
  'Lounge Table':         [COFFEE, 'Coffee Tables > Stone Lounge Tables'],
  'Coffee Table Plinth':  [COFFEE, 'Plinths > Coffee Table Plinths'],
  'Side Table':           [END, 'Side Tables > Stone Side Tables'],
  'Side Plinth':          [END, 'Plinths > Side Plinths'],
  'Bedside Table':        ['Furniture > Tables > Nightstands', 'Bedside Tables > Stone Bedside Tables'],
  'Plinth':               ['Home & Garden > Decor', 'Plinths > Stone Plinths'],
  'Serving Board':        [SERVING, 'Serving Boards > Marble Serving Boards'],
  'Entertaining Platter': [SERVING, 'Serving Boards > Entertaining Platters'],
  'Grazing Board':        [SERVING, 'Serving Boards > Christmas Release'],
  'Vessel Basin':         ['Hardware > Plumbing > Plumbing Fixtures > Sinks > Bathroom Sinks', 'Vessel Basins > Stone Vessel Basins'],
  'Gift Voucher':         ['Arts & Entertainment > Party & Celebration > Gift Giving > Gift Cards & Certificates', 'Gifts > Gift Vouchers'],
};

const SOLD_MARK = /sold-out|badge[^>]*>\s*sold\b|>\s*sold(?: out)?\s*</i;

// Reads the JS values in an argument list or object literal: quoted strings, numbers and booleans,
// in order. Anything else (identifiers, expressions) is skipped. Stops at the closing bracket.
function readValues(src, start) {
  const out = [];
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      let s = '';
      for (i++; i < src.length && src[i] !== c; i++) {
        if (src[i] === '\\') { i++; s += src[i] === 'n' ? '\n' : src[i]; } else s += src[i];
      }
      out.push(s);
    } else if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') { if (depth === 0) return out; depth--; }
    else if (/[\d.]/.test(c) && !/[\w$]/.test(src[i - 1] || '')) {
      const m = /^\d+(?:\.\d+)?/.exec(src.slice(i));
      if (m) { out.push(Number(m[0])); i += m[0].length - 1; }
    } else if (src.startsWith('true', i) && !/[\w$]/.test(src[i - 1] || '')) { out.push(true); i += 3; }
  }
  return out;
}

// { key: value } pairs of an object literal's quoted-string, number and boolean properties.
function readObject(src, start) {
  const obj = {};
  const re = /([A-Za-z_$][\w$]*)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\d+(?:\.\d+)?|true|false)/g;
  const end = matchingBrace(src, start);
  re.lastIndex = start;
  let m;
  while ((m = re.exec(src)) && m.index < end) {
    const v = m[2];
    obj[m[1]] = /^['"]/.test(v) ? v.slice(1, -1).replace(/\\(.)/g, '$1') : v === 'true' ? true : v === 'false' ? false : Number(v);
  }
  return obj;
}

function matchingBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"') { for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return src.length;
}

const decode = s => String(s).replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' }[e]));
const sentence = s => { s = String(s || '').trim(); return !s ? '' : /[.!?]$/.test(s) ? s : s + '.'; };
const money = n => Number(n).toLocaleString('en-NZ');
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const imageUrl = file => `${BASE}/${file.split('/').map(encodeURIComponent).join('/')}`;

// Card details from openModal(…): the stone is the second argument, the size is the argument
// with millimetres in it, and the description is the longest remaining text.
// A piece shown in its own section rather than a card (like the Lunar River bedside table) has
// no openModal, so its details come from the text in elements whose class ends -stone / -desc
// and a "Size" spec row.
function cardDetails(card, name) {
  const at = card.indexOf('openModal(');
  if (at < 0) {
    const text = re => decode(((re.exec(card) || [])[1] || '').replace(/<[^>]+>/g, '').trim());
    const stone = text(/class="[\w-]*-stone"[^>]*>([^<]+)</);
    return {
      stone: stone !== name ? stone : '',
      dims: text(/<span>\s*Size\s*<\/span>\s*<span>([^<]+)</),
      desc: text(/class="[\w-]*-desc"[^>]*>([\s\S]*?)<\/div>/),
    };
  }
  const args = readValues(card, at + 'openModal('.length).filter(v => typeof v === 'string').map(decode);
  const stone = args[1] && args[1] !== name ? args[1] : '';
  const dims = args.find(a => /\d\s*mm/.test(a) && a.length < 80) || '';
  const desc = args
    .filter(a => a !== name && a !== stone && a !== dims && a.length >= 30 && !/\.(jpe?g|png|webp)$/i.test(a))
    .sort((a, b) => b.length - a.length)[0] || '';
  return { stone, dims, desc };
}

// Index just past the element that opens at `start` (matching open/close tags of the same name).
function elementEnd(src, start) {
  const tag = /^<([a-z0-9]+)/i.exec(src.slice(start, start + 20))[1];
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(src))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return src.length;
}

// The HTML of the card an Add to Cart button at `at` belongs to: the element carrying the
// nearest data-product-id, if the button is inside it. Otherwise the piece has a block of its
// own (like the Lunar River bedside table), whose elements share the button's class prefix
// ("bh-btn" → every "bh-…" element), so the card is that block.
function cardFor(src, at) {
  const attr = src.lastIndexOf('data-product-id="', at);
  let after = 0;
  if (attr >= 0) {
    const open = src.lastIndexOf('<', attr);
    const end = elementEnd(src, open);
    if (end > at) return src.slice(open, at);
    after = end;
  }
  const button = src.lastIndexOf('<button', at);
  const prefix = (/^<button[^>]*class="([a-z0-9]+)-/i.exec(src.slice(button, at)) || [])[1];
  const start = prefix ? src.indexOf(`class="${prefix}-`, after) : -1;
  return start >= 0 && start < at ? src.slice(start, at) : '';
}

// "Rosso Africano Marble Table" + "Coffee Table Plinth" → "Rosso Africano Marble Coffee Table Plinth".
function withType(label, type) {
  const words = label.split(' ');
  const typeWords = type.toLowerCase().split(' ');
  while (words.length > 1 && typeWords.includes(words[words.length - 1].toLowerCase())) words.pop();
  return `${words.join(' ')} ${type}`;
}

function title({ name, type, stone, dims }) {
  if (type === 'Gift Voucher') return `${name.replace(/\s*—\s*/, ' ')} — Emailed Instantly | Stone Furniture Gift NZ`;
  if (type === 'Grazing Board') return `${name} | Prime Piece NZ`;
  const round = /Dia|Ø/.test(dims) && / Table$/.test(type) && type !== 'Lounge Table' ? 'Round ' : '';
  // Drop a repeated type ("Rosa Cloud — Entertaining Platter") and a (Single) / (Set of 2)
  // suffix from the name; the suffix goes back on the end.
  let label = name.endsWith(` — ${type}`) ? name.slice(0, -(type.length + 3))
    : name.endsWith(` ${type}`) ? name.slice(0, -(type.length + 1)) : name;
  const suffix = (/\((?:Single|Set of \d+)\)$/.exec(label) || [''])[0];
  label = label.slice(0, label.length - suffix.length).trim();
  const stoneMain = (stone || '').split(' — ')[0].trim();
  const has = (a, b) => a.toLowerCase().includes(b.toLowerCase());
  let t;
  if (!stoneMain || has(label, stoneMain)) t = withType(label, type);   // the name already says the stone
  else if (has(stoneMain, label)) t = withType(stoneMain, type);         // "Lunar River" → "Lunar River Marble"
  else t = `${withType(stoneMain, type)} — ${label}`;                    // stone and type, then the piece's name
  return `${round}${t}${suffix ? ` ${suffix}` : ''} | Prime Piece NZ`;
}

function itemXml(p, delivery) {
  const [category, productType] = TYPES[p.type] || [null, p.type];
  const ship = p.type === 'Gift Voucher' || p.price >= delivery.threshold ? 0 : delivery.fee;
  return `
    <item>
      <g:id>${xml(p.id)}</g:id>
      <title>${xml(p.title.slice(0, 150))}</title>
      <description>${xml(p.description.slice(0, 5000))}</description>
      <link>${xml(p.link)}</link>
      <g:image_link>${xml(imageUrl(p.image))}</g:image_link>
      <g:price>${p.price.toFixed(2)} NZD</g:price>
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>Prime Piece</g:brand>${category ? `
      <g:google_product_category>${xml(category)}</g:google_product_category>` : ''}
      <g:product_type>${xml(productType)}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping><g:country>NZ</g:country><g:service>${p.type === 'Gift Voucher' ? 'Email' : 'Standard'}</g:service><g:price>${ship.toFixed(2)} NZD</g:price></g:shipping>
    </item>`;
}

// Everything the site currently shows with an Add to Cart, before the catalogue checks.
export async function pageProducts(root) {
  const read = f => readFile(path.join(root, f), 'utf8');
  const found = [];

  for (const page of CARD_PAGES) {
    const src = await read(page);
    const re = /Cart\.add\(\s*\{/g;
    let m;
    while ((m = re.exec(src))) {
      const o = readObject(src, m.index + m[0].length - 1);
      if (typeof o.id !== 'string' || typeof o.price !== 'number' || !o.name) continue;
      // The card is everything from its data-product-id up to this button.
      const card = cardFor(src, m.index);
      const sold = SOLD_MARK.test(card.slice(card.indexOf('>')));
      const d = cardDetails(card, o.name);
      const hasCard = page !== 'gift-vouchers.html';
      found.push({
        id: o.id, name: o.name, type: o.type || '', price: o.price, image: o.image, sold, page,
        link: hasCard ? `${BASE}/${page}?p=${encodeURIComponent(o.id)}` : `${BASE}/${page}`,
        ...d,
      });
    }
  }

  // Basins: entries in the page's basins data object; only in-stock ones have a cartId.
  const basins = await read('basins.html');
  const re = /'([a-z0-9-]+)'\s*:\s*\{\s*name\s*:/g;
  let m;
  while ((m = re.exec(basins))) {
    const b = readObject(basins, basins.indexOf('{', m.index));
    if (!b.cartId || typeof b.price !== 'number' || !b.price) continue;
    found.push({
      id: b.cartId, name: b.name, type: 'Vessel Basin', price: b.price, image: b.img, page: 'basins.html',
      sold: /sold/i.test(b.badge || ''), stone: b.material || '', dims: b.dims || '', desc: b.desc || '',
      link: `${BASE}/basins.html?p=${encodeURIComponent(m[1])}`,
    });
  }
  return found;
}

// Christmas Release items from christmas.html's RELEASE block.
async function releaseProducts(root) {
  const src = await readFile(path.join(root, 'christmas.html'), 'utf8');
  const at = src.indexOf('var RELEASE = {');
  if (at < 0) return [];
  const out = [];
  const re = /\{\s*id\s*:\s*'(release-[a-z]+)'/g;
  re.lastIndex = at;
  let m;
  while ((m = re.exec(src)) && m.index < matchingBrace(src, at + 'var RELEASE = '.length)) {
    const r = readObject(src, m.index);
    const set = r.id === 'release-set';
    out.push({
      id: r.id, price: r.price, image: r.image, page: 'christmas.html', type: 'Grazing Board', stone: '',
      name: set ? 'Christmas Release 2026 — Set of Three Stone Grazing Boards' : `Christmas Release 2026 Grazing Board — ${r.name}`,
      dims: '600 × 250mm', desc: r.blurb || '', link: `${BASE}/christmas.html`, sold: false,
    });
  }
  return out;
}

function describe(p) {
  if (p.type === 'Gift Voucher') {
    return `A $${money(p.price)} Prime Piece gift voucher, emailed instantly so it works as a last-minute gift. Spend it on any handcrafted marble coffee table, plinth, serving board or stone basin, online or at our Wairau Valley showroom in Auckland. Valid for 3 years.`;
  }
  if (p.type === 'Grazing Board') {
    return `${sentence(p.desc)} Natural stone grazing board, 600 × 250mm with rounded corners and polished edges, signed and numbered on the back. Cut and finished by hand in Wairau Valley, Auckland. One of each, never repeated. NZD $${money(p.price)}.`;
  }
  const stone = (p.stone || '').split(' — ')[0].split(' · ')[0].trim();
  const made = p.type === 'Vessel Basin'
    ? 'One of one, delivered anywhere in New Zealand.'
    : 'One of one, handcrafted in Auckland, New Zealand.';
  return [
    sentence(p.desc),
    stone ? `Stone: ${stone}.` : '',
    TYPE_LINE[p.type] || '',
    made,
    p.dims ? `Size: ${sentence(p.dims)}` : '',
    `NZD $${money(p.price)}.`,
  ].filter(Boolean).join(' ');
}

// What the piece is, for the description. Kept to what every piece of that type has in common.
const TYPE_LINE = {
  'Coffee Table': 'A natural stone coffee table top on a steel frame.',
  'Side Table': 'A natural stone side table, sized to sit beside a sofa, chair or bed.',
  'Bedside Table': 'A solid natural stone bedside table.',
  'Lounge Table': 'A low natural stone lounge table for the centre of a living room.',
  'Coffee Table Plinth': 'A solid block of natural stone used as a low coffee table.',
  'Plinth': 'A solid natural stone plinth for displaying art, plants or sculpture, or for use as a side table.',
  'Side Plinth': 'A natural stone plinth sized for use as a side table or display stand.',
  'Serving Board': 'A natural stone serving board with a carved handle, food safe once sealed and naturally cool for cheese and charcuterie.',
  'Entertaining Platter': 'A generous natural stone entertaining platter with a carved handle, food safe once sealed and naturally cool.',
  'Vessel Basin': 'A natural stone vessel basin that sits on top of the vanity.',
};

/**
 * Build the feed XML.
 * @param {object} o
 * @param {string} o.root           folder holding the site's .html files
 * @param {object} o.catalog        CATALOG from api/checkout.js (id → { name, price })
 * @param {Set}    o.notSoldOnline  NOT_SOLD_ONLINE from api/checkout.js
 * @param {{fee:number, threshold:number}} o.delivery
 * @param {boolean} o.releaseLive
 * @param {() => Promise<object>} o.soldItems  release item id → sold
 * @param {(msg:string) => void} [o.warn]
 */
export async function buildProductFeed({ root, catalog, notSoldOnline, delivery, releaseLive, soldItems, warn = console.warn }) {
  let candidates = await pageProducts(root);

  if (releaseLive) {
    try {
      const sold = await soldItems();
      candidates = candidates.concat((await releaseProducts(root)).filter(r => !sold[r.id]));
    } catch (err) {
      warn(`product feed: Christmas Release left out, sold check failed: ${err.message}`);
    }
  }

  const seen = new Set();
  const items = [];
  for (const p of candidates) {
    if (seen.has(p.id) || p.sold || p.type === 'Bundle') continue;
    const entry = catalog[p.id];
    if (!entry || notSoldOnline.has(p.id)) { warn(`product feed: ${p.id} has Add to Cart on ${p.page} but checkout won't sell it; left out`); continue; }
    if (entry.price !== p.price) { warn(`product feed: ${p.id} is $${p.price} on ${p.page} but $${entry.price} at checkout; left out`); continue; }
    seen.add(p.id);
    items.push({ ...p, title: title(p), description: describe(p) });
  }

  const body = items.map(p => itemXml(p, delivery)).join('\n');
  return {
    items,
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Prime Piece</title>
    <link>${BASE}</link>
    <description>Handcrafted one-of-one stone furniture made in Auckland, New Zealand. Marble tables, plinths, serving boards and stone basins. Built automatically from the live product pages.</description>
${body}
  </channel>
</rss>
`,
  };
}
