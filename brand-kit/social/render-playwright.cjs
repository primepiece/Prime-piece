// Same as render.cjs, using the pre-installed Playwright instead of puppeteer-core.
// node render-playwright.cjs src/<file>.html [...]
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  for (const f of process.argv.slice(2)) {
    await page.goto('file://' + path.resolve(f), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const { w, h } = await page.evaluate(() => {
      const r = (document.querySelector('.page') || document.documentElement).getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(__dirname, 'out', path.basename(f, '.html') + '.png');
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(out, w + 'x' + h);
  }
  await browser.close();
})();
