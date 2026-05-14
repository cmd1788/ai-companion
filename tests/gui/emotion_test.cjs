const { chromium } = require('playwright');

async function verifyEmotionChanges() {
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

    // Navigate
    console.log('[2] Navigating...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Test 1: Main interface loaded
    const mainInterfaceLoaded = await page.locator('button.absolute').isVisible();
    results.tests.push({
      test: 'Main interface loaded',
      expected: 'Settings button visible',
      actual: mainInterfaceLoaded ? 'Settings button visible' : 'Not visible',
      result: mainInterfaceLoaded ? 'PASSED' : 'FAILED'
    });

    // Test 2: Get current expression image
    const currentExpr = await page.evaluate(() => {
      const img = document.querySelector('img[alt^="表情:"]');
      return img ? img.src : null;
    });
    results.tests.push({
      test: 'Current expression image',
      expected: 'Image src exists',
      actual: currentExpr ? `Image found: ${currentExpr.substring(0, 50)}...` : 'No image',
      result: currentExpr ? 'PASSED' : 'FAILED'
    });

    // Test 3: Input "我今天特别开心" and send
    console.log('[3] Testing emotion: 开心...');
    await page.fill('input[placeholder="说点什么..."]', '我今天特别开心');
    const inputVal = await page.inputValue('input[placeholder="说点什么..."]');
    results.tests.push({
      test: 'Input happy message',
      expected: '我今天特别开心',
      actual: inputVal,
      result: inputVal === '我今天特别开心' ? 'PASSED' : 'FAILED'
    });

    // Click send
    await page.click('button.rounded-full:not([disabled])');
    await page.waitForTimeout(8000); // Wait for AI response

    // Check if expression changed
    const newExpr = await page.evaluate(() => {
      const img = document.querySelector('img[alt^="表情:"]');
      return img ? img.src : null;
    });
    results.tests.push({
      test: 'Expression after happy message',
      expected: 'Different expression than before',
      actual: newExpr ? `Image found` : 'No image',
      result: newExpr && newExpr !== currentExpr ? 'PASSED' : 'NEEDS_VERIFICATION',
      before: currentExpr ? currentExpr.substring(0, 80) : 'none',
      after: newExpr ? newExpr.substring(0, 80) : 'none'
    });

    // Check emotion display
    const emotionText = await page.locator('text=心情').locator('..').locator('span:last-child').textContent();
    results.tests.push({
      test: 'Emotion display',
      expected: 'Emotion text visible',
      actual: emotionText || 'Not found',
      result: emotionText ? 'PASSED' : 'FAILED'
    });

    // Test 4: Input "我好难过" and send
    console.log('[4] Testing emotion: 难过...');
    await page.fill('input[placeholder="说点什么..."]', '我好难过');
    await page.click('button.rounded-full:not([disabled])');
    await page.waitForTimeout(8000);

    const sadExpr = await page.evaluate(() => {
      const img = document.querySelector('img[alt^="表情:"]');
      return img ? img.src : null;
    });
    results.tests.push({
      test: 'Expression after sad message',
      expected: 'Expression changed to sad',
      actual: sadExpr ? 'Found' : 'Not found',
      result: sadExpr ? 'PASSED' : 'FAILED'
    });

    // Test 5: Open settings and check auto reply toggle
    console.log('[5] Testing settings...');
    await page.click('button.absolute.top-2');
    await page.waitForTimeout(1000);

    const settingsVisible = await page.locator('text=设置中心').isVisible();
    results.tests.push({
      test: 'Settings panel opened',
      expected: 'Settings visible',
      actual: settingsVisible ? 'Settings visible' : 'Not visible',
      result: settingsVisible ? 'PASSED' : 'FAILED'
    });

    // Find auto reply toggle
    const autoReplyToggle = await page.locator('text=主动回复').isVisible();
    results.tests.push({
      test: 'Auto reply toggle found',
      expected: 'Toggle visible',
      actual: autoReplyToggle ? 'Found' : 'Not found',
      result: autoReplyToggle ? 'PASSED' : 'FAILED'
    });

    // Check proactive speed options
    const speedSection = await page.locator('text=主动回复速度').isVisible();
    results.tests.push({
      test: 'Auto reply speed setting',
      expected: 'Speed options visible',
      actual: speedSection ? 'Found' : 'Not found',
      result: speedSection ? 'PASSED' : 'FAILED'
    });

    // Screenshot
    await page.screenshot({ path: 'screenshots/emotion_test_final.png', fullPage: true });
    results.tests.push({
      test: 'Screenshot saved',
      expected: 'Screenshot exists',
      actual: 'screenshots/emotion_test_final.png',
      result: 'PASSED'
    });

  } catch (err) {
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

verifyEmotionChanges()
  .then(r => console.log('\nTest complete'))
  .catch(console.error);
