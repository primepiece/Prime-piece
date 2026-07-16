const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 4200 });
  await page.goto('file:///tmp/claude-0/-home-user-Prime-piece/86062a46-6903-5e06-b230-a564c8bf43fb/scratchpad/carousel.html');
  await page.waitForTimeout(3000);
  const slide3 = await page.$('#slide3');
  await slide3.screenshot({ path: '/home/user/Prime-piece/carousel-slide3.png' });
  await browser.close();
  console.log('done');
})();
