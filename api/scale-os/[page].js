// Single dynamic handler for every authenticated Scale OS page except login/logout.
// Consolidated into one function (rather than one file per page) to stay under the
// Vercel Hobby plan's 12-serverless-function-per-deployment limit alongside the
// existing storefront api/*.js functions.
import { requireAuth, isAuthenticated } from '../../scale-os/lib/auth.js';
import { renderShell, renderComingSoon } from '../../scale-os/lib/layout.js';
import { PRODUCT_LAB_STYLE, PRODUCT_LAB_BODY, PRODUCT_LAB_SCRIPT } from '../../scale-os/lib/product-lab.js';
import { MARKET_RADAR_STYLE, MARKET_RADAR_BODY, MARKET_RADAR_SCRIPT } from '../../scale-os/lib/market-radar.js';
import { getProducts, saveProducts, getRadarOpportunities, promoteRadarItem, isStoreConfigured } from '../../scale-os/lib/store.js';

const STAGES = ['Find Winner', 'Validate', 'Scale', 'Systemise', 'Expand'];
const CURRENT_STAGE = 'Find Winner';

function renderDashboard() {
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

  return renderShell({ title: 'Dashboard', activeKey: 'dashboard', bodyHtml: body });
}

function renderProductLab() {
  return renderShell({
    title: 'Product Lab',
    activeKey: 'product-lab',
    bodyHtml: PRODUCT_LAB_BODY,
    extraStyle: PRODUCT_LAB_STYLE,
    extraScript: PRODUCT_LAB_SCRIPT,
  });
}

function renderMarketRadar() {
  return renderShell({
    title: 'Market Radar',
    activeKey: 'radar',
    bodyHtml: MARKET_RADAR_BODY,
    extraStyle: MARKET_RADAR_STYLE,
    extraScript: MARKET_RADAR_SCRIPT,
  });
}

const COMING_SOON = {
  experiments: {
    title: 'Experiment Tracker',
    blurb: 'Every marketing and product experiment, logged with a hypothesis, spend, results and a learning — so Prime Piece operates on evidence instead of opinions. Built next, after Product Lab.',
    fields: ['Experiment', 'Product', 'Hypothesis', 'Channel', 'Audience', 'Creative', 'Start date', 'End date', 'Spend', 'Sessions', 'Add to carts', 'Purchases', 'Revenue', 'CAC', 'ROAS', 'Result', 'Learning', 'Next action'],
  },
  'trade-crm': {
    title: 'Trade CRM',
    blurb: 'Designers, architects, plumbers, builders, showrooms and specifiers — tracked from prospect through to active trade account. Contains trade contacts, so it stays inside this authenticated area only.',
    fields: ['Business', 'Contact', 'Type', 'Email', 'Instagram', 'Location', 'Status', 'Products interested in', 'Last contacted', 'Next follow-up', 'Notes', 'Estimated opportunity'],
  },
  weekly: {
    title: 'Weekly Operating Page',
    blurb: 'The current bottleneck, this week’s goal, and the top 3 scale actions across Product, Traffic, Conversion, Margin and Systems — plus a short weekly review. Built after Experiment Tracker and Dashboard.',
    fields: ['Current bottleneck', "This week's goal", 'Top 3 scale actions', 'What worked?', 'What failed?', 'What did we learn?', 'What should we stop doing?', 'What should we double down on?', "Next week's bottleneck"],
  },
  'ai-brief': {
    title: 'AI Brief',
    blurb: 'A short, copy-pasteable text brief generated from the app’s own data — revenue, margin, best/worst products, experiments, trade pipeline, bottlenecks and decisions required — for handing to an AI strategist. Built last, once the other pages have real data to summarise.',
    fields: ['Revenue', 'Orders', 'Gross margin', 'Ad spend', 'CAC', 'ROAS', 'Conversion', 'Best product', 'Worst product', 'Best experiment', 'Failed experiments', 'Current bottleneck', 'Active product tests', 'Trade pipeline', 'Biggest problems', 'Decisions required'],
  },
};

// JSON data API for Product Lab (GET/PUT/POST), reached at /api/scale-os/products.
// Kept in this same file rather than its own api/scale-os/products.js — this project is
// already at Vercel's Hobby-plan cap of 12 serverless functions, so new endpoints have to
// share the existing dynamic handler rather than add a 13th function.
async function handleProducts(req, res) {
  if (!isStoreConfigured()) {
    return res.status(500).json({
      error: 'No database connected yet. In Vercel: Project → Storage → connect a Redis database (Marketplace → Redis), then redeploy.',
    });
  }

  if (req.method === 'GET') {
    try {
      const products = await getProducts();
      return res.status(200).json({ products });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const products = req.body?.products;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'Expected { products: [...] }' });
    try {
      await saveProducts(products);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, PUT, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

// JSON data API for Market Radar (GET only for V1 — written by the GitHub Actions
// research worker directly via the same Redis REST API, not through this endpoint).
async function handleRadarData(req, res) {
  if (!isStoreConfigured()) {
    return res.status(500).json({
      error: 'No database connected yet. In Vercel: Project → Storage → connect a Redis database (Marketplace → Redis), then redeploy.',
    });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const opportunities = await getRadarOpportunities();
    return res.status(200).json({ opportunities });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Promotes one Market Radar opportunity into Product Lab.
async function handleRadarPromote(req, res) {
  if (!isStoreConfigured()) {
    return res.status(500).json({ error: 'No database connected yet.' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const id = req.body?.id;
  if (!id) return res.status(400).json({ error: 'Expected { id: <opportunity id> }' });
  try {
    const productId = await promoteRadarItem(id);
    return res.status(200).json({ success: true, productId });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  const page = req.query?.page;

  if (page === 'products') {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
    return handleProducts(req, res);
  }
  if (page === 'radar-data') {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
    return handleRadarData(req, res);
  }
  if (page === 'radar-promote') {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
    return handleRadarPromote(req, res);
  }

  if (!requireAuth(req, res)) return;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (page === 'dashboard') return res.status(200).send(renderDashboard());
  if (page === 'product-lab') return res.status(200).send(renderProductLab());
  if (page === 'radar') return res.status(200).send(renderMarketRadar());
  if (page && COMING_SOON[page]) {
    return res.status(200).send(renderComingSoon({ activeKey: page, ...COMING_SOON[page] }));
  }

  return res.status(404).send(renderShell({
    title: 'Not found',
    activeKey: '',
    bodyHtml: '<h1>Not found</h1><p class="page-sub">That Scale OS page does not exist.</p>',
  }));
}
