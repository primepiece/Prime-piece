// Persistent storage for Scale OS data — a Redis/KV database (Vercel Marketplace → Redis,
// Upstash-backed) accessed via its plain REST API, no SDK. The whole Product Lab product
// list is stored as a single JSON value under one key: this is a "which product should we
// test next" tool for one founder, not a system with concurrent writers or complex queries,
// so one key holding one JSON array is the right amount of database for the job.
//
// Set up once in the Vercel dashboard: Project → Storage → connect a Redis database (Marketplace
// → Redis / Upstash). That automatically injects KV_REST_API_URL + KV_REST_API_TOKEN (or, if
// Upstash was connected directly rather than through Vercel's own integration card,
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) — either naming is supported below.

const PRODUCTS_KEY = 'scale_os:products:v1';

function credentials() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export function isStoreConfigured() {
  const { url, token } = credentials();
  return Boolean(url && token);
}

async function redisCommand(command) {
  const { url, token } = credentials();
  if (!url || !token) throw new Error('No Redis/KV database connected to this project yet.');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new Error(`Storage request failed: ${data?.error || res.status}`);
  }
  return data.result;
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function seedProducts() {
  return [
    { id: uid(), name: 'Carrara Natural Stone Basin', category: 'Vessel Basin', status: 'Idea' },
    { id: uid(), name: 'Beige Travertine Basin', category: 'Vessel Basin', status: 'Idea' },
    { id: uid(), name: '#41 Fluted Round Basin', category: 'Vessel Basin', status: 'Idea' },
  ];
}

export async function getProducts() {
  const raw = await redisCommand(['GET', PRODUCTS_KEY]);
  if (raw === null || raw === undefined) {
    const seeded = seedProducts();
    await saveProducts(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedProducts();
  } catch {
    return seedProducts();
  }
}

export async function saveProducts(products) {
  await redisCommand(['SET', PRODUCTS_KEY, JSON.stringify(products)]);
}
