const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 4200 });
  await page.goto('file:///home/user/Prime-piece/carousel.html');
  await page.waitForTimeout(4000);
  const slide1 = await page.$('#slide1');
  await slide1.screenshot({ path: '/home/user/Prime-piece/carousel-slide1.png' });
  const slide2 = await page.$('#slide2');
  await slide2.screenshot({ path: '/home/user/Prime-piece/carousel-slide2.png' });
  await browser.close();
  console.log('done');
})();
