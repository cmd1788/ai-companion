
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
  // Repeat to get to 200
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

const TOTAL_MESSAGES = 200;

async function runLongTest() {
  console.log('Starting 200 message long-running test...');
  console.log(`Target messages: ${TOTAL_MESSAGES}`);
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  const memoryEvents = [];
  const emotionChanges = [];
  let screenshotCount = 0;
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    if (msg.text().includes('[Store]') || msg.text().includes('[DB]')) {
      console.log('[Console]', msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
    console.error('[Page Error]', err.message);
  });
  
  await page.goto('http://localhost:5173', { timeout: 30000, waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('Page loaded, starting message test...');
  
  // Get input field
  const inputSelector = 'input[type="text"], textarea';
  
  for (let i = 0; i < TOTAL_MESSAGES; i++) {
    const msg = TEST_MESSAGES[i % TEST_MESSAGES.length];
    
    try {
      const input = page.locator(inputSelector).first();
      const isVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!isVisible) {
        console.log(`[${i+1}/${TOTAL_MESSAGES}] Input not visible, skipping...`);
        await page.waitForTimeout(1000);
        continue;
      }
      
      await input.fill(msg);
      await input.press('Enter');
      
      console.log(`[${i+1}/${TOTAL_MESSAGES}] Sent: ${msg}`);
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Take screenshot every 20 messages
      if ((i + 1) % 20 === 0) {
        const screenshot = await page.screenshot({ path: `test_screenshot_${i+1}.png` });
        screenshotCount++;
        console.log(`[Screenshot ${screenshotCount}] Captured at message ${i+1}`);
      }
      
      // Small delay between messages
      await page.waitForTimeout(500);
      
    } catch (e) {
      console.error(`[${i+1}] Error: ${e.message}`);
      errors.push(`Message ${i+1}: ${e.message}`);
    }
    
    // Check for crashes
    if (errors.some(e => e.includes('__TAURI__') || e.includes('invoke') || e.includes('Cannot read properties'))) {
      console.error('CRITICAL: Tauri invoke error detected, stopping test');
      break;
    }
  }
  
  // Final screenshot
  await page.screenshot({ path: 'test_screenshot_final.png' });
  
  // Get final state
  const finalState = await page.evaluate(() => {
    return {
      messageCount: document.querySelectorAll('[class*="message"], [class*="bubble"]').length,
      hasRoot: !!document.getElementById('root')?.childElementCount,
      errors: errors.length
    };
  });
  
  console.log('\\n=== TEST RESULTS ===');
  console.log(`Total messages sent: ${TOTAL_MESSAGES}`);
  console.log(`Screenshots taken: ${screenshotCount}`);
  console.log(`Final message elements: ${finalState.messageCount}`);
  console.log(`React root has children: ${finalState.hasRoot}`);
  console.log(`Total errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\\nErrors:');
    errors.slice(0, 10).forEach(e => console.log('  ', e.substring(0, 200)));
  }
  
  await browser.close();
  console.log('\\nTest complete!');
}

runLongTest().catch(console.error);
