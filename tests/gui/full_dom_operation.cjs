const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFullDOMOperation() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    actions: []
  };

  try {
    // 1. Navigate
    console.log('[1] Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/dom_01_main.png', fullPage: true });
    results.actions.push({ step: 1, action: 'navigate', result: 'PASSED' });

    // 2. Type in input
    console.log('[2] Typing in chat input...');
    await page.fill('input[placeholder="说点什么..."]', '你好AI');
    const inputValue = await page.inputValue('input[placeholder="说点什么..."]');
    await page.screenshot({ path: 'screenshots/dom_02_input.png', fullPage: true });
    results.actions.push({ 
      step: 2, 
      action: 'type_input', 
      expected: '你好AI',
      actual: inputValue,
      result: inputValue === '你好AI' ? 'PASSED' : 'FAILED'
    });

    // 3. Click settings button
    console.log('[3] Clicking settings button...');
    await page.click('button.absolute.top-2');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/dom_03_settings.png', fullPage: true });
    results.actions.push({ step: 3, action: 'open_settings', result: 'PASSED' });

    // 4. Check settings tabs
    const tabs = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()).filter(t => t));
    results.actions.push({ step: 4, action: 'check_tabs', tabs, result: 'PASSED' });

    // 5. Click System Settings tab
    console.log('[5] Clicking System Settings tab...');
    await page.click('text=系统设定');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/dom_04_system_settings.png', fullPage: true });
    results.actions.push({ step: 5, action: 'click_system_tab', result: 'PASSED' });

    // 6. Click Model Settings tab
    console.log('[6] Clicking Model Settings tab...');
    await page.click('text=模型设置');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/dom_05_model_settings.png', fullPage: true });
    results.actions.push({ step: 6, action: 'click_model_tab', result: 'PASSED' });

    // 7. Click Style Page tab
    console.log('[7] Clicking Style Page tab...');
    await page.click('text=风格页面');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/dom_06_style_page.png', fullPage: true });
    results.actions.push({ step: 7, action: 'click_style_tab', result: 'PASSED' });

    // 8. Close settings
    console.log('[8] Closing settings...');
    await page.click('button:has-text("✕")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/dom_07_closed.png', fullPage: true });
    results.actions.push({ step: 8, action: 'close_settings', result: 'PASSED' });

  } catch (err) {
    results.actions.push({ step: 'ERROR', action: 'main', error: err.message, result: 'FAILED' });
  }

  await browser.close();
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

runFullDOMOperation()
  .then(r => {
    console.log('\nAll screenshots saved to tests/gui/screenshots/');
  })
  .catch(console.error);
