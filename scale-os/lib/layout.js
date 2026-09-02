// Shared HTML shell for every Scale OS page: nav, design tokens, base styles.
// Deliberately plain server-rendered HTML + inline CSS/JS — no build step, no framework,
// consistent with the rest of the (static) Prime Piece site.

const NAV_ITEMS = [
  { href: '/scale-os', label: 'Dashboard', key: 'dashboard' },
  { href: '/scale-os/product-lab', label: 'Product Lab', key: 'product-lab' },
  { href: '/scale-os/experiments', label: 'Experiments', key: 'experiments' },
  { href: '/scale-os/trade-crm', label: 'Trade CRM', key: 'trade-crm' },
  { href: '/scale-os/weekly', label: 'Weekly', key: 'weekly' },
  { href: '/scale-os/ai-brief', label: 'AI Brief', key: 'ai-brief' },
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderShell({ title, activeKey, bodyHtml, extraStyle = '', extraScript = '' }) {
  const navHtml = NAV_ITEMS.map((item) => {
    const active = item.key === activeKey;
    return `<a href="${item.href}" class="nav-link${active ? ' nav-link--active' : ''}">${item.label}</a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} · Prime Piece Scale OS</title>
<style>
  :root {
    --black: #111111;
    --white: #ffffff;
    --paper: #FAFAF8;
    --line: #E4E2DD;
    --muted: #8A8577;
    --teal: #7BA5A8;
    --teal-dark: #5E8689;
    --red: #B5533C;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: var(--paper);
    color: var(--black);
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 56px;
    background: var(--black);
    color: var(--white);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .brand {
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    white-space: nowrap;
  }
  .brand span { color: var(--teal); }
  .nav {
    display: flex;
    gap: 4px;
    overflow-x: auto;
  }
  .nav-link {
    text-decoration: none;
    font-size: 12.5px;
    letter-spacing: 0.04em;
    color: #B9B6AD;
    padding: 8px 12px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .nav-link:hover { color: var(--white); }
  .nav-link--active { color: var(--white); background: rgba(123,165,168,0.22); }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .logout-link { font-size: 12px; color: #B9B6AD; text-decoration: none; letter-spacing: 0.04em; }
  .logout-link:hover { color: var(--white); }
  main { max-width: 1400px; margin: 0 auto; padding: 32px 24px 80px; }
  h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 4px; }
  .page-sub { color: var(--muted); font-size: 13.5px; margin: 0 0 28px; }
  .card {
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 22px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--black);
    color: var(--white);
    border: none;
    padding: 9px 16px;
    font-size: 12.5px;
    letter-spacing: 0.03em;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
  }
  .btn:hover { background: #2b2b2b; }
  .btn--teal { background: var(--teal-dark); }
  .btn--teal:hover { background: var(--teal); }
  .btn--ghost { background: transparent; color: var(--black); border: 1px solid var(--line); }
  .btn--ghost:hover { border-color: var(--black); }
  .btn--small { padding: 5px 10px; font-size: 11.5px; }
  .tag {
    display: inline-block;
    font-size: 10.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 20px;
    background: #EEECE6;
    color: var(--muted);
  }
  .muted { color: var(--muted); }
  .stage-track { display: flex; gap: 0; margin: 4px 0 0; }
  .stage-step {
    flex: 1;
    text-align: center;
    padding: 10px 6px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    border-bottom: 3px solid var(--line);
  }
  .stage-step--active { color: var(--black); font-weight: 700; border-bottom-color: var(--teal); }
  ::-webkit-scrollbar { height: 10px; width: 10px; }
  ::-webkit-scrollbar-thumb { background: #D8D5CD; border-radius: 6px; }
  ${extraStyle}
</style>
</head>
<body>
  <div class="topbar">
    <div class="brand">PRIME PIECE <span>SCALE OS</span></div>
    <nav class="nav">${navHtml}</nav>
    <div class="topbar-right">
      <a href="/scale-os/logout" class="logout-link">Log out</a>
    </div>
  </div>
  <main>
    ${bodyHtml}
  </main>
  ${extraScript}
</body>
</html>`;
}

export function renderComingSoon({ title, activeKey, blurb, fields }) {
  const fieldsHtml = fields && fields.length
    ? `<div class="card" style="margin-top:16px;">
        <div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Planned fields</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${fields.map((f) => `<span class="tag">${escapeHtml(f)}</span>`).join('')}
        </div>
      </div>`
    : '';

  const body = `
    <h1>${escapeHtml(title)}</h1>
    <p class="page-sub">Coming soon — built after Product Lab is validated.</p>
    <div class="card">
      <p style="margin:0;font-size:14px;line-height:1.6;">${escapeHtml(blurb)}</p>
    </div>
    ${fieldsHtml}
  `;

  return renderShell({ title, activeKey, bodyHtml: body });
}

export { escapeHtml };
