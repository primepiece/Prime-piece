import { requireAuth } from '../../scale-os/lib/auth.js';
import { renderComingSoon } from '../../scale-os/lib/layout.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const html = renderComingSoon({
    title: 'Experiment Tracker',
    activeKey: 'experiments',
    blurb: 'Every marketing and product experiment, logged with a hypothesis, spend, results and a learning — so Prime Piece operates on evidence instead of opinions. Built next, after Product Lab.',
    fields: ['Experiment', 'Product', 'Hypothesis', 'Channel', 'Audience', 'Creative', 'Start date', 'End date', 'Spend', 'Sessions', 'Add to carts', 'Purchases', 'Revenue', 'CAC', 'ROAS', 'Result', 'Learning', 'Next action'],
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
