// Session auth for Scale OS — a single shared internal password (SCALE_OS_PASSWORD env var),
// signed with an HMAC derived from that same password so no second secret needs configuring.
// Set SCALE_OS_PASSWORD in the Vercel project's Environment Variables before this area is usable.
import crypto from 'node:crypto';

const COOKIE_NAME = 'pp_scaleos';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const password = process.env.SCALE_OS_PASSWORD;
  if (!password) return null;
  return crypto.createHash('sha256').update(`${password}:scale-os-session`).digest();
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

export function isConfigured() {
  return Boolean(process.env.SCALE_OS_PASSWORD);
}

export function checkPassword(candidate) {
  const expected = process.env.SCALE_OS_PASSWORD;
  if (!expected || typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
  const secret = getSecret();
  if (!secret) throw new Error('SCALE_OS_PASSWORD not configured');
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = sign(payload, secret);
  return `${COOKIE_NAME}=${payload}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearedCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isAuthenticated(req) {
  const secret = getSecret();
  if (!secret) return false;
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;
  const dot = raw.indexOf('.');
  if (dot === -1) return false;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expectedSig = sign(payload, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

// Returns true if the request is authenticated. Otherwise redirects to login and returns false —
// callers should `return` immediately when this returns false.
export function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  const next = encodeURIComponent(req.url || '/scale-os');
  res.writeHead(302, { Location: `/scale-os/login?next=${next}` });
  res.end();
  return false;
}
