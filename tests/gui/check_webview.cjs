const { chromium } = require('playwright');

async function checkWebViewDOM() {
  const results = {
    timestamp: new Date().toISOString(),
    devServer: null,
    title: '',
    domStructure: null,
    errors: []
  };

  let browser;
  try {
    console.log('[1] Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console messages
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => logs.push({ type: 'error', text: err.message }));

    console.log('[2] Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

    results.devServer = 'reachable';
    results.title = await page.title();

    console.log('[3] Waiting for React to render...');
    await page.waitForTimeout(3000); // Extra wait for React

    // Get page HTML for debugging
    const html = await page.content();
    results.rawHTMLPreview = html.substring(0, 500);

    // Get all buttons
    console.log('[4] Getting buttons...');
    const buttons = await page.$$eval('button', els => els.map(el => ({
      text: el.textContent?.trim().substring(0, 50),
      ariaLabel: el.getAttribute('aria-label'),
      className: el.className.substring(0, 100)
    }))).catch(() => []);

    // Get all inputs
    console.log('[5] Getting inputs...');
    const inputs = await page.$$eval('input, textarea', els => els.map(el => ({
      type: el.type || 'textarea',
      placeholder: el.placeholder,
      ariaLabel: el.getAttribute('aria-label'),
      value: el.value?.substring(0, 100)
    }))).catch(() => []);

    // Get all tabs
    console.log('[6] Getting tabs...');
    const tabs = await page.$$eval('[role="tab"], [class*="tab"]', els => els.map(el => ({
      text: el.textContent?.trim().substring(0, 30),
      role: el.getAttribute('role'),
      ariaSelected: el.getAttribute('aria-selected'),
      className: el.className.substring(0, 50)
    }))).catch(() => []);

    // Get elements with aria-label
    console.log('[7] Getting aria elements...');
    const ariaElements = await page.$$eval('[aria-label]', els => els.map(el => ({
      tag: el.tagName.toLowerCase(),
      ariaLabel: el.getAttribute('aria-label'),
      text: el.textContent?.trim().substring(0, 50)
    }))).catch(() => []);

    // Get body innerHTML
    const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));

    results.domStructure = {
      buttons,
      inputs,
      tabs,
      ariaElements,
      bodyHTML,
      consoleLogs: logs.slice(0, 20)
    };

    console.log('[8] Done. Buttons found:', buttons.length);
    await browser.close();

  } catch (err) {
    results.errors.push(err.message);
    if (browser) await browser.close().catch(() => {});
  }

  return results;
}

checkWebViewDOM()
  .then(r => {
    console.log(JSON.stringify(r, null, 2));
  })
  .catch(console.error);
