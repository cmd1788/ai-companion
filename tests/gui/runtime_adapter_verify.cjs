
const { chromium } = require('playwright');

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  const logs = [];
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[ERROR] ${msg.text()}`);
    } else {
      logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  
  // Capture page errors
  page.on('pageerror', err => {
    errors.push(`[PAGE ERROR] ${err.message}`);
  });
  
  console.log('Navigating to http://localhost:5173...');
  
  try {
    await page.goto('http://localhost:5173', { timeout: 15000, waitUntil: 'networkidle' });
    console.log('Page loaded');
    
    // Wait a bit for React to mount
    await page.waitForTimeout(3000);
    
    // Check if React root is rendered
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        hasChildren: root ? root.childElementCount > 0 : false,
        innerHTML: root ? root.innerHTML.substring(0, 200) : 'NO ROOT'
      };
    });
    
    console.log('React Root Check:', JSON.stringify(rootContent, null, 2));
    
    // Check for settings button
    const settingsBtn = await page.locator('button:has-text("⚙️")').first();
    const hasSettings = await settingsBtn.isVisible().catch(() => false);
    console.log('Settings button visible:', hasSettings);
    
    // Check runtime status indicator
    const runtimeIndicator = await page.locator('text=/TAURI|BROWSER_DEV|TEST|UNKNOWN/').first();
    const hasRuntimeIndicator = await runtimeIndicator.isVisible().catch(() => false);
    console.log('Runtime indicator visible:', hasRuntimeIndicator);
    
    // Try typing in chat input
    const chatInput = await page.locator('input[type="text"], textarea').first();
    const hasInput = await chatInput.isVisible().catch(() => false);
    if (hasInput) {
      await chatInput.fill('测试消息');
      console.log('Chat input works: YES');
    } else {
      console.log('Chat input found: NO');
    }
    
    // Test localStorage save
    const lsResult = await page.evaluate(() => {
      try {
        localStorage.setItem('test_key', JSON.stringify({ value: 'test', timestamp: Date.now() }));
        const val = localStorage.getItem('test_key');
        localStorage.removeItem('test_key');
        return { ok: true, value: val };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    });
    console.log('localStorage test:', JSON.stringify(lsResult));
    
    // Check for crash errors (Tauri invoke related)
    const tauriErrors = errors.filter(e => 
      e.includes('__TAURI__') || 
      e.includes('invoke') || 
      e.includes('Cannot read properties of undefined')
    );
    
    console.log('\n=== RESULTS ===');
    console.log('Total errors:', errors.length);
    console.log('Tauri-specific errors:', tauriErrors.length);
    console.log('React root rendered:', rootContent.hasChildren);
    console.log('App did NOT crash:', rootContent.hasChildren && tauriErrors.length === 0);
    
    if (errors.length > 0) {
      console.log('\nAll errors:');
      errors.forEach(e => console.log('  ', e));
    }
    
    // Runtime indicator info
    const runtimeText = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        if (div.textContent && (div.textContent.includes('TAURI') || div.textContent.includes('BROWSER_DEV') || div.textContent.includes('🟡'))) {
          return div.textContent.trim();
        }
      }
      return null;
    });
    console.log('Runtime status text:', runtimeText);
    
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('PASS:', rootContent.hasChildren && tauriErrors.length === 0 ? 'YES' : 'NO');
    
  } catch (e) {
    console.error('Test error:', e.message);
  }
  
  await browser.close();
}

verify().catch(console.error);
