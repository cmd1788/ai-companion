const { chromium } = require('playwright');

async function verifyApp() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  let browser;
  try {
    console.log('[1] Launching browser...');
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Navigate to built dist
    console.log('[2] Navigating to http://localhost:5180...');
    await page.goto('http://localhost:5180', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Get HTML to check if React mounted
    const html = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('HTML preview:', html.substring(0, 300));

    // Check for React root
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 300) : 'ROOT NOT FOUND';
    });
    console.log('Root content:', rootContent);

    // Check for buttons
    const buttons = await page.$$eval('button', els => els.map(e => ({
      text: e.textContent?.trim().substring(0, 30),
      disabled: e.disabled
    })));
    console.log('\nButtons found:', JSON.stringify(buttons, null, 2));

    // Test: Settings button visible
    const settingsBtn = await page.locator('button').filter({ hasText: /设置|⚙/ }).first();
    const settingsVisible = await settingsBtn.isVisible().catch(() => false);
    results.tests.push({
      test: 'Settings button visible',
      expected: 'Visible',
      actual: settingsVisible ? 'Visible' : 'Not visible',
      result: settingsVisible ? 'PASSED' : 'FAILED'
    });

    // Check for input
    const inputVisible = await page.locator('input').isVisible().catch(() => false);
    results.tests.push({
      test: 'Chat input visible',
      expected: 'Visible',
      actual: inputVisible ? 'Visible' : 'Not visible',
      result: inputVisible ? 'PASSED' : 'FAILED'
    });

    // Check for expression image
    const exprImg = await page.locator('img[alt^="表情:"]').isVisible().catch(() => false);
    results.tests.push({
      test: 'Expression image visible',
      expected: 'Visible',
      actual: exprImg ? 'Visible' : 'Not visible',
      result: exprImg ? 'PASSED' : 'FAILED'
    });

    // Screenshot
    await page.screenshot({ path: 'screenshots/app_check.png', fullPage: true });
    console.log('\nScreenshot saved');

  } catch (err) {
    console.error('Error:', err.message);
    results.tests.push({
      test: 'ERROR',
      expected: 'No error',
      actual: err.message,
      result: 'FAILED'
    });
  }

  await browser.close();
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

verifyApp()
  .then(r => console.log('\nDone'))
  .catch(console.error);
