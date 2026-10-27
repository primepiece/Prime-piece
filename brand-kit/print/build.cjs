// Renders each src/*.html to out/<name>.pdf (print file at its exact page size, vector text in the
// real fonts) and out/<name>_preview.png. Run after fronts.py: node build.cjs
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ deviceScaleFactor: 4 })).newPage();
  const src = path.join(__dirname, 'src');
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.html'))) {
    await p.goto('file://' + path.join(src, f), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const name = path.basename(f, '.html');
    await p.pdf({ path: path.join(__dirname, 'out', name + '.pdf'), preferCSSPageSize: true, printBackground: true });
    const { w, h } = await p.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
    await p.setViewportSize({ width: w, height: h });
    await p.screenshot({ path: path.join(__dirname, 'out', name + '_preview.png'), scale: 'device' });
    const fonts = await p.evaluate(() => [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family).join(', '));
    console.log(name, `${w}x${h}`, fonts || '(no text)');
  }
  await b.close();
})();
