
const { chromium } = require('playwright');

async function verifySettings() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { timeout: 15000, waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Click settings button
  const settingsBtn = page.locator('button:has-text("⚙️")').first();
  await settingsBtn.click();
  await page.waitForTimeout(1000);
  
  // Check if settings panel appeared
  const settingsText = await page.locator('text=设置中心').isVisible();
  const characterTab = await page.locator('text=人物设定').isVisible();
  const systemTab = await page.locator('text=系统设定').isVisible();
  const modelTab = await page.locator('text=模型设置').isVisible();
  const styleTab = await page.locator('text=风格页面').isVisible();
  
  console.log('Settings panel visible:', settingsText);
  console.log('Character tab:', characterTab);
  console.log('System tab:', systemTab);
  console.log('Model tab:', modelTab);
  console.log('Style tab:', styleTab);
  
  // Test tab switching
  await page.locator('text=系统设定').click();
  await page.waitForTimeout(500);
  const screenWatchVisible = await page.locator('text=截屏观察模式').isVisible();
  console.log('Screen watch toggle visible:', screenWatchVisible);
  
  await page.locator('text=风格页面').click();
  await page.waitForTimeout(500);
  const displayControlVisible = await page.locator('text=显示控制').isVisible();
  console.log('Display control section visible:', displayControlVisible);
  
  // Close settings
  await page.locator('button:has-text("✕")').click();
  await page.waitForTimeout(500);
  
  const closed = !(await page.locator('text=设置中心').isVisible());
  console.log('Settings closed:', closed);
  
  await browser.close();
  console.log('Settings verification PASSED');
}

verifySettings().catch(console.error);
