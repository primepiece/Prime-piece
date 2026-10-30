// Renders print designs (src/*.html with an @page size) to out/<name>.pdf, plus a 150 dpi PNG preview.
// Usage: node render-pdf.cjs src/09-counter-flyer-a4.html
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  for (const f of process.argv.slice(2)) {
    const p = await (await b.newContext({ deviceScaleFactor: 150 / 96 })).newPage();
    await p.goto('file://' + path.resolve(f), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const name = path.basename(f, '.html');
    await p.pdf({ path: path.join(__dirname, 'out', name + '.pdf'), preferCSSPageSize: true, printBackground: true });
    const r = await p.evaluate(() => { const e = document.querySelector('.page').getBoundingClientRect(); return { w: Math.round(e.width), h: Math.round(e.height) }; });
    await p.setViewportSize({ width: r.w, height: r.h });
    await p.screenshot({ path: path.join(__dirname, 'out', name + '.png'), scale: 'device' });
    console.log(name, 'pdf + png');
  }
  await b.close();
})();
