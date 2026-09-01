import { requireAuth } from '../../scale-os/lib/auth.js';
import { renderShell } from '../../scale-os/lib/layout.js';

const STAGES = ['Find Winner', 'Validate', 'Scale', 'Systemise', 'Expand'];
const CURRENT_STAGE = 'Find Winner';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const stageHtml = STAGES.map((s) => {
    const active = s === CURRENT_STAGE ? ' stage-step--active' : '';
    return `<div class="stage-step${active}">${s}</div>`;
  }).join('');

  const body = `
    <h1>Dashboard</h1>
    <p class="page-sub">Not fully built yet — Product Lab comes first. This shows where Prime Piece is right now.</p>

    <div class="card">
      <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Current stage</div>
      <div class="stage-track">${stageHtml}</div>
    </div>

    <div class="card" style="margin-top:16px;">
      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;">
        Revenue, orders, margin, sessions, conversion, ad spend, CAC and ROAS will appear here once
        Prime Piece has connected data sources (Shopify, ad accounts) and enough test activity to report on.
        Until then, work happens in <a href="/scale-os/product-lab" style="color:var(--teal-dark);text-decoration:underline;">Product Lab</a> —
        finding and validating the first winning SKU.
      </p>
    </div>
  `;

  const html = renderShell({ title: 'Dashboard', activeKey: 'dashboard', bodyHtml: body });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
