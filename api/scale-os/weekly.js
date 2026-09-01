import { requireAuth } from '../../scale-os/lib/auth.js';
import { renderComingSoon } from '../../scale-os/lib/layout.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const html = renderComingSoon({
    title: 'Weekly Operating Page',
    activeKey: 'weekly',
    blurb: 'The current bottleneck, this week’s goal, and the top 3 scale actions across Product, Traffic, Conversion, Margin and Systems — plus a short weekly review. Built after Experiment Tracker and Dashboard.',
    fields: ['Current bottleneck', "This week's goal", 'Top 3 scale actions', 'What worked?', 'What failed?', 'What did we learn?', 'What should we stop doing?', 'What should we double down on?', "Next week's bottleneck"],
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
