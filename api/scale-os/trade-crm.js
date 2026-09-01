import { requireAuth } from '../../scale-os/lib/auth.js';
import { renderComingSoon } from '../../scale-os/lib/layout.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const html = renderComingSoon({
    title: 'Trade CRM',
    activeKey: 'trade-crm',
    blurb: 'Designers, architects, plumbers, builders, showrooms and specifiers — tracked from prospect through to active trade account. Contains trade contacts, so it stays inside this authenticated area only.',
    fields: ['Business', 'Contact', 'Type', 'Email', 'Instagram', 'Location', 'Status', 'Products interested in', 'Last contacted', 'Next follow-up', 'Notes', 'Estimated opportunity'],
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
