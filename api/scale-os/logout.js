import { clearedCookie } from '../../scale-os/lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', clearedCookie());
  res.writeHead(302, { Location: '/scale-os/login' });
  res.end();
}
