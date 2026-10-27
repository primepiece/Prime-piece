// Renders src-spec.html to PRINT-SPEC.pdf (A4, one page) and PRINT-SPEC_preview.png. Run after build.cjs.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ deviceScaleFactor: 2, viewport: { width: 794, height: 1123 } })).newPage();
  await p.goto('file://' + path.join(__dirname, 'src-spec.html'), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(__dirname, 'PRINT-SPEC.pdf'), preferCSSPageSize: true, printBackground: true });
  await p.screenshot({ path: path.join(__dirname, 'PRINT-SPEC_preview.png') });
  const over = await p.evaluate(() => document.querySelector('.page').scrollHeight > document.querySelector('.page').clientHeight);
  console.log('overflow:', over);
  await b.close();
})();
