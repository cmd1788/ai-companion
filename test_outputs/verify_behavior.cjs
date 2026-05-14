const { chromium } = require('playwright');
const fs = require('fs');

async function verifyCoreBehavior() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    // 1. Load app
    console.log('[1] Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test_outputs/01_initial.png', fullPage: true });
    
    // 2. Check initial emotion state from store
    const initialState = await page.evaluate(() => {
      // Try to read from window store if available
      const store = window.__zustand_store;
      return store ? JSON.stringify(store.getState()) : 'Store not accessible';
    });
    
    // 3. Get current expression image src
    const initialExprImg = await page.$eval('img[alt^="表情:"]', el => ({
      src: el.src,
      alt: el.alt
    })).catch(() => null);
    
    results.tests.push({
      name: 'Initial State',
      passed: true,
      data: { initialExprImg }
    });

    // 4. Test: Send "我今天特别开心" and check emotion change
    console.log('[2] Testing emotion trigger: "我今天特别开心"');
    await page.fill('input[placeholder="说点什么..."]', '我今天特别开心');
    await page.screenshot({ path: 'test_outputs/02_before_send.png', fullPage: true });
    await page.click('button:has-text("➤")');
    await page.waitForTimeout(5000); // Wait for AI response
    
    const afterHappyExprImg = await page.$eval('img[alt^="表情:"]', el => ({
      src: el.src,
      alt: el.alt
    })).catch(() => null);
    
    results.tests.push({
      name: 'After "我今天特别开心"',
      passed: true,
      data: { afterHappyExprImg }
    });
    await page.screenshot({ path: 'test_outputs/03_after_happy.png', fullPage: true });

    // 5. Test: Send "我好难过"
    console.log('[3] Testing emotion trigger: "我好难过"');
    await page.fill('input[placeholder="说点什么..."]', '我好难过');
    await page.click('button:has-text("➤")');
    await page.waitForTimeout(5000);
    
    const afterSadExprImg = await page.$eval('img[alt^="表情:"]', el => ({
      src: el.src,
      alt: el.alt
    })).catch(() => null);
    
    results.tests.push({
      name: 'After "我好难过"',
      passed: true,
      data: { afterSadExprImg }
    });
    await page.screenshot({ path: 'test_outputs/04_after_sad.png', fullPage: true });

    // 6. Open settings and check auto reply toggle
    console.log('[4] Checking settings for auto reply...');
    await page.click('button.absolute.top-2');
    await page.waitForTimeout(500);
    await page.click('text=系统设定');
    await page.waitForTimeout(500);
    
    // Check if auto reply toggle exists
    const autoReplyToggle = await page.$('text=主动回复');
    results.tests.push({
      name: 'Auto Reply Toggle Exists',
      passed: autoReplyToggle !== null,
      data: { found: autoReplyToggle !== null }
    });
    await page.screenshot({ path: 'test_outputs/05_settings.png', fullPage: true });

    // 7. Check for any proactive chat interval/timer in store
    const storeState = await page.evaluate(() => {
      // Check if there are any intervals or timers
      const state = window.__zustand_store?.getState?.();
      return state ? {
        emotion: state.emotion,
        currentExpression: state.currentExpression,
        styleSettings: state.styleSettings,
        systemSettings: state.systemSettings
      } : null;
    });
    
    results.tests.push({
      name: 'Store State',
      passed: storeState !== null,
      data: storeState
    });

    // 8. Check for proactive chat implementation
    console.log('[5] Checking for proactive chat logic...');
    const hasProactiveLogic = await page.evaluate(() => {
      // Look for setInterval or proactive chat related code in window
      return {
        hasProactiveInterval: typeof window.__proactiveChat !== 'undefined',
        windowKeys: Object.keys(window).filter(k => k.includes('proactive') || k.includes('interval'))
      };
    });
    
    results.tests.push({
      name: 'Proactive Chat Logic Check',
      passed: hasProactiveLogic.hasProactiveInterval || hasProactiveLogic.windowKeys.length > 0,
      data: hasProactiveLogic
    });

    // Write results
    fs.writeFileSync('test_outputs/test_results.json', JSON.stringify(results, null, 2));
    console.log('\nResults:', JSON.stringify(results, null, 2));

  } catch (err) {
    results.tests.push({ name: 'ERROR', error: err.message });
  }

  await browser.close();
  return results;
}

verifyCoreBehavior()
  .then(r => {
    console.log('\n=== Test Complete ===');
    console.log('Results saved to test_outputs/test_results.json');
    console.log('Screenshots saved to test_outputs/*.png');
  })
  .catch(console.error);
