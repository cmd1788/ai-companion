const { chromium } = require('playwright');

async function checkPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Get full HTML
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('HTML length:', html.length);
  console.log('First 3000 chars:\n', html.substring(0, 3000));
  
  // Check what elements exist
  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type,
    placeholder: e.placeholder,
    value: e.value,
    className: e.className
  })));
  console.log('\nInputs found:', JSON.stringify(inputs, null, 2));
  
  const buttons = await page.$$eval('button', els => els.map(e => ({
    text: e.textContent?.trim().substring(0, 30),
    className: e.className.substring(0, 80)
  })));
  console.log('\nButtons found:', JSON.stringify(buttons, null, 2));
  
  await browser.close();
}

checkPage().catch(console.error);
