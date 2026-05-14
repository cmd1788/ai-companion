const { chromium } = require('playwright');
const fs = require('fs');

const PREVIEW_URL = 'http://localhost:4173';
const TOTAL_MESSAGES = 200;
const SCREENSHOT_INTERVAL = 25; // 每25条消息截图

const testMessages = [
  '你好呀',
  '今天天气怎么样',
  '我今天很开心',
  '给我讲个笑话吧',
  '你喜欢吃什么',
  '我们聊天吧',
  '你是谁',
  '唱首歌给我听',
  '说个故事',
  '晚安',
  '早上好',
  '你会说英语吗',
  '你好厉害啊',
  '谢谢你的帮助',
  '你真可爱',
  '我有点累了',
  '我很无聊',
  '有什么新鲜事吗',
  '给我推荐首歌',
  '你最喜欢什么颜色',
  '我可以问你问题吗',
  '今天发生了什么有趣的事',
  '你相信爱情吗',
  '给我讲讲你自己',
  '你会玩游戏吗',
  '我今天工作很累',
  '有什么好的电影推荐吗',
  '我想学编程',
  '你有什么爱好',
  '你孤单吗',
];

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  const errors = [];
  const timestamps = [];
  let sentCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let startTime = Date.now();
  
  // 日志函数
  const log = (msg) => {
    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    console.log(`[${now}] ${msg}`);
  };
  
  // 保存截图
  const saveScreenshot = async (name) => {
    try {
      await page.screenshot({ 
        path: `longtest_${name}_${Date.now()}.png`, 
        fullPage: false 
      });
      log(`📸 截图: longtest_${name}_${Date.now()}.png`);
    } catch (e) {
      log(`截图失败: ${e.message}`);
    }
  };
  
  // 收集日志
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => errors.push(err.message));
  
  try {
    log(`=== 200条消息长时间测试开始 ===`);
    log(`目标: ${TOTAL_MESSAGES} 条消息`);
    log(`URL: ${PREVIEW_URL}`);
    
    // 1. 打开页面
    log(`\n[1/5] 打开页面...`);
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // 验证页面正常
    const rootLength = await page.evaluate(() => document.getElementById('root')?.innerHTML?.length || 0);
    if (rootLength === 0) {
      throw new Error('页面加载失败，root为空');
    }
    log(`✅ 页面加载成功`);
    
    // 2. 初始化
    log(`\n[2/5] 等待初始化...`);
    await page.waitForTimeout(2000);
    const initOk = await page.locator('button').count();
    log(`✅ 初始化完成，按钮数: ${initOk}`);
    
    // 初始截图
    await saveScreenshot('start');
    
    // 3. 开始发送消息
    log(`\n[3/5] 开始发送 ${TOTAL_MESSAGES} 条消息...`);
    log('━'.repeat(50));
    
    const startTestTime = Date.now();
    
    for (let i = 0; i < TOTAL_MESSAGES; i++) {
      const msgIndex = i % testMessages.length;
      const message = `[${i + 1}] ${testMessages[msgIndex]}`;
      
      try {
        // 找到输入框
        const inputSelector = 'input[type="text"], textarea';
        const input = page.locator(inputSelector).first();
        
        // 检查输入框是否可见
        const isInputVisible = await input.isVisible().catch(() => false);
        if (!isInputVisible) {
          // 可能设置面板打开了，关闭它
          const settingsBtn = page.locator('button').first();
          if (await settingsBtn.isVisible()) {
            await settingsBtn.click();
            await page.waitForTimeout(500);
          }
        }
        
        // 重新获取输入框
        const inputEl = page.locator(inputSelector).first();
        await inputEl.fill(message);
        await inputEl.press('Enter');
        
        sentCount++;
        successCount++;
        
        // 等待回复
        await page.waitForTimeout(1500);
        
        // 定期截图
        if ((i + 1) % SCREENSHOT_INTERVAL === 0) {
          await saveScreenshot(`msg${i + 1}`);
          const elapsed = Math.round((Date.now() - startTestTime) / 1000);
          log(`📊 进度: ${i + 1}/${TOTAL_MESSAGES} (${elapsed}秒)`);
        }
        
        // 每10条输出一次进度
        if ((i + 1) % 10 === 0) {
          const elapsed = Math.round((Date.now() - startTestTime) / 1000);
          const rate = ((i + 1) / elapsed).toFixed(2);
          log(`  进度: ${i + 1}/${TOTAL_MESSAGES} | 耗时: ${elapsed}秒 | 速率: ${rate}条/秒`);
        }
        
      } catch (e) {
        errorCount++;
        log(`❌ 消息 ${i + 1} 失败: ${e.message}`);
        
        // 尝试恢复
        await page.reload();
        await page.waitForTimeout(2000);
      }
    }
    
    log('━'.repeat(50));
    
    // 4. 验证结果
    log(`\n[4/5] 验证结果...`);
    
    // 检查localStorage
    const localStorageData = await page.evaluate(() => {
      const msgs = localStorage.getItem('ai_companion_messages');
      return msgs ? JSON.parse(msgs).length : 0;
    });
    
    // 检查消息数
    const chatMessages = await page.locator('.whitespace-pre-wrap, [class*="message"]').count().catch(() => 0);
    
    log(`✅ 发送成功: ${successCount}/${TOTAL_MESSAGES}`);
    log(`❌ 发送失败: ${errorCount}`);
    log(`📦 localStorage 消息数: ${localStorageData}`);
    log(`💬 页面消息元素数: ${chatMessages}`);
    
    // 5. 最终截图
    log(`\n[5/5] 保存最终状态...`);
    await saveScreenshot('final');
    
    // 验证稳定性
    const elapsed = Math.round((Date.now() - startTestTime) / 1000);
    const tauriErrors = errors.filter(e => e.includes('__TAURI__') || e.includes('invoke')).length;
    
    log(`\n========================================`);
    log(`测试结果`);
    log(`========================================`);
    log(`总消息数: ${TOTAL_MESSAGES}`);
    log(`发送成功: ${successCount}`);
    log(`发送失败: ${errorCount}`);
    log(`成功率: ${((successCount / TOTAL_MESSAGES) * 100).toFixed(1)}%`);
    log(`总耗时: ${elapsed}秒`);
    log(`平均速率: ${(TOTAL_MESSAGES / elapsed * 60).toFixed(1)}条/分钟`);
    log(`Tauri错误: ${tauriErrors}`);
    log(`总错误数: ${errors.length}`);
    log(`localStorage消息: ${localStorageData}`);
    log(`========================================`);
    
    // 保存详细报告
    const report = {
      timestamp: new Date().toISOString(),
      test: '200条消息长时间测试',
      url: PREVIEW_URL,
      total: TOTAL_MESSAGES,
      success: successCount,
      errors: errorCount,
      successRate: `${((successCount / TOTAL_MESSAGES) * 100).toFixed(1)}%`,
      duration: `${elapsed}秒`,
      rate: `${(TOTAL_MESSAGES / elapsed * 60).toFixed(1)}条/分钟`,
      tauriErrors,
      totalErrors: errors.length,
      localStorageMessages: localStorageData,
      errorList: errors.slice(0, 10),
    };
    
    fs.writeFileSync('longtest_200_report.json', JSON.stringify(report, null, 2));
    log(`\n报告已保存: longtest_200_report.json`);
    log(`\n✅ 200条消息测试完成!`);
    
  } catch (err) {
    log(`\n❌ 测试失败: ${err.message}`);
    await saveScreenshot('error');
  }
  
  await browser.close();
})();
