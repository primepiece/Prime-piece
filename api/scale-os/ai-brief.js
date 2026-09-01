import { requireAuth } from '../../scale-os/lib/auth.js';
import { renderComingSoon } from '../../scale-os/lib/layout.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const html = renderComingSoon({
    title: 'AI Brief',
    activeKey: 'ai-brief',
    blurb: 'A short, copy-pasteable text brief generated from the app’s own data — revenue, margin, best/worst products, experiments, trade pipeline, bottlenecks and decisions required — for handing to an AI strategist. Built last, once the other pages have real data to summarise.',
    fields: ['Revenue', 'Orders', 'Gross margin', 'Ad spend', 'CAC', 'ROAS', 'Conversion', 'Best product', 'Worst product', 'Best experiment', 'Failed experiments', 'Current bottleneck', 'Active product tests', 'Trade pipeline', 'Biggest problems', 'Decisions required'],
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
