// Screenshots each .g block in graphics.html to a JPG next to it. Run: node stills/render.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 2000 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'graphics.html'), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  for (const id of await p.$$eval('.g', els => els.map(e => e.id))) {
    await p.locator('#' + id).screenshot({ path: path.join(__dirname, id + '.jpg'), type: 'jpeg', quality: 92 });
    console.log('wrote', id + '.jpg');
  }
  await b.close();
})();
