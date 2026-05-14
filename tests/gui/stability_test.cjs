
const { chromium } = require('playwright');

const TEST_MESSAGES = [
  "你好呀小伊",
  "今天天气怎么样",
  "我今天很开心",
  "你叫什么名字",
  "你喜欢做什么",
  "给我讲个笑话吧",
  "我工作累了",
  "好无聊啊",
  "你在干嘛呢",
  "想你了",
  "哈哈哈",
  "太难了",
  "加油加油",
  "好累啊",
  "睡觉了",
  "起床了",
  "吃了吗",
  "在忙什么",
  "帮我个忙",
  "谢谢",
];

const TOTAL = 20;

async function runStabilityTest() {
  console.log('Starting 20-message stability test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });
  
  await page.goto('http://localhost:5173', { timeout: 30000, waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('Page loaded, starting test...');
  
  const inputSelector = 'input[type="text"], textarea';
  
  for (let i = 0; i < TOTAL; i++) {
    const msg = TEST_MESSAGES[i];
    
    try {
      const input = page.locator(inputSelector).first();
      const isVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!isVisible) {
        console.log(`[${i+1}/${TOTAL}] Input not visible, waiting...`);
        await page.waitForTimeout(1000);
        i--;
        continue;
      }
      
      await input.fill(msg);
      await input.press('Enter');
      
      console.log(`[${i+1}/${TOTAL}] Sent: ${msg}`);
      
      // Wait for response (or timeout)
      await page.waitForTimeout(3000);
      
      // Screenshot every 5 messages
      if ((i + 1) % 5 === 0) {
        await page.screenshot({ path: `stability_${i+1}.png` });
        console.log(`[Screenshot] Captured at ${i+1}`);
      }
      
    } catch (e) {
      console.error(`[${i+1}] Error: ${e.message}`);
      errors.push(`Message ${i+1}: ${e.message}`);
    }
  }
  
  // Final screenshot
  await page.screenshot({ path: 'stability_final.png' });
  
  // Check localStorage for message count
  const lsState = await page.evaluate(() => {
    const raw = localStorage.getItem('ai_companion_messages');
    if (!raw) return { count: 0 };
    try {
      const msgs = JSON.parse(raw);
      return { count: msgs.length };
    } catch {
      return { count: 0 };
    }
  });
  
  console.log('\n=== STABILITY TEST RESULTS ===');
  console.log(`Messages sent: ${TOTAL}`);
  console.log(`localStorage messages: ${lsState.count}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('Error details:');
    errors.forEach(e => console.log('  ', e.substring(0, 200)));
  }
  
  const tauriErrors = errors.filter(e => 
    e.includes('__TAURI__') || 
    e.includes('invoke') || 
    e.includes('Cannot read properties')
  );
  
  console.log(`\nTauri-specific errors: ${tauriErrors.length}`);
  console.log('App stability: ' + (tauriErrors.length === 0 ? 'PASS' : 'FAIL'));
  
  await browser.close();
}

runStabilityTest().catch(console.error);
