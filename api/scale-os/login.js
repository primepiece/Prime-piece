import { checkPassword, sessionCookie, isConfigured, isAuthenticated } from '../../scale-os/lib/auth.js';
import { escapeHtml } from '../../scale-os/lib/layout.js';

function safeNext(next) {
  if (typeof next !== 'string') return '/scale-os';
  if (!next.startsWith('/scale-os')) return '/scale-os';
  return next;
}

function renderLogin({ error, next }) {
  const notConfigured = !isConfigured();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Log in · Prime Piece Scale OS</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #111111; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .box { width: 320px; padding: 8px; }
  .brand { color: #7BA5A8; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; text-align: center; }
  .title { color: #fff; font-size: 20px; font-weight: 600; text-align: center; margin: 0 0 24px; }
  input[type=password] {
    width: 100%; padding: 12px 14px; border-radius: 4px; border: 1px solid #333;
    background: #1a1a1a; color: #fff; font-size: 14px; margin-bottom: 12px;
  }
  input[type=password]:focus { outline: none; border-color: #7BA5A8; }
  button {
    width: 100%; padding: 12px; border-radius: 4px; border: none; background: #7BA5A8;
    color: #111; font-weight: 600; font-size: 13px; letter-spacing: 0.03em; cursor: pointer;
  }
  button:hover { background: #8fb7ba; }
  .error { color: #E08A6E; font-size: 12.5px; margin-bottom: 12px; text-align: center; }
  .note { color: #6b6b6b; font-size: 11.5px; margin-top: 18px; text-align: center; line-height: 1.6; }
</style>
</head>
<body>
  <div class="box">
    <div class="brand">Prime Piece</div>
    <h1 class="title">Scale OS</h1>
    ${notConfigured ? `<div class="error">SCALE_OS_PASSWORD is not set in the environment. Set it in Vercel project settings, then redeploy.</div>` : ''}
    ${error && !notConfigured ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/scale-os/login">
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <input type="password" name="password" placeholder="Password" autofocus ${notConfigured ? 'disabled' : ''}>
      <button type="submit" ${notConfigured ? 'disabled' : ''}>Enter</button>
    </form>
    <div class="note">Internal use only. Not part of the public Prime Piece website.</div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  const next = safeNext(req.query?.next);

  if (req.method === 'GET') {
    if (isAuthenticated(req)) {
      res.writeHead(302, { Location: next });
      return res.end();
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderLogin({ next }));
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const postedNext = safeNext(body.next || next);

    if (!isConfigured()) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(renderLogin({ next: postedNext }));
    }

    if (checkPassword(body.password)) {
      res.setHeader('Set-Cookie', sessionCookie());
      res.writeHead(302, { Location: postedNext });
      return res.end();
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(401).send(renderLogin({ error: 'Incorrect password.', next: postedNext }));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method not allowed');
}
