// Renders each src/*.html at its page size to out/<name>.png, waiting for fonts to load.
const path = require('path'), fs = require('fs');
const puppeteer = require(process.env.PUPPETEER_CORE);
(async () => {
  const files = process.argv.slice(2);
  const browser = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  for (const f of files) {
    const abs = path.resolve(f);
    await page.goto('file://' + abs, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // Size from the design's own .page box (the document's scroll size would keep the last viewport).
    const { w, h } = await page.evaluate(() => {
      const el = document.querySelector('.page') || document.documentElement;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(__dirname, 'out', path.basename(f, '.html') + '.png');
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
    const fams = await page.evaluate(() => [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family + ' ' + x.weight));
    console.log(out, w + 'x' + h, fams.join(', '));
  }
  await browser.close();
})();
