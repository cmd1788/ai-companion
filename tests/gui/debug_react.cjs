const { chromium } = require('playwright');

async function debugReact() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  
  console.log('Console logs:');
  logs.forEach(l => console.log(l));
  
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('\nHTML length:', html.length);
  console.log('HTML preview:', html.substring(0, 500));
  
  await browser.close();
}

debugReact().catch(console.error);
