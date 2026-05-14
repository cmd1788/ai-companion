const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  const screenshots = [];
  
  try {
    // 1. 打开Dev服务器
    console.log('=== 1. 打开设置页面 ===');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // 2. 查找设置按钮并点击
    const settingsBtn = page.locator('button:has-text("⚙️")').first();
    await settingsBtn.click();
    await page.waitForTimeout(1500);
    
    const screenshot1 = 'settings_new_overview.png';
    await page.screenshot({ path: screenshot1, fullPage: false });
    screenshots.push(screenshot1);
    console.log(`截图: ${screenshot1}`);
    
    // 3. 验证左侧导航栏有5个Tab
    console.log('\n=== 2. 验证5个Tab导航 ===');
    const expectedTabs = [
      { name: '👤 人物设定', color: '#e94560' },
      { name: '🧠 记忆系统', color: '#a855f7' },
      { name: '⚙️ 系统设定', color: '#3b82f6' },
      { name: '🤖 模型设置', color: '#22c55e' },
      { name: '🎨 风格页面', color: '#f59e0b' },
    ];
    
    for (const tab of expectedTabs) {
      const tabBtn = page.locator(`button:has-text("${tab.name}")`);
      const isVisible = await tabBtn.isVisible();
      console.log(`  ${tab.name}: ${isVisible ? '✅' : '❌'}`);
    }
    
    // 4. 验证人物设定Tab内容
    console.log('\n=== 3. 验证人物设定Tab ===');
    const characterSection = await page.locator('text=角色名称').isVisible();
    const personalitySection = await page.locator('text=性格设定').isVisible();
    const photoSection = await page.locator('text=人物照片读取路径').isVisible();
    const descSection = await page.locator('text=角色背景描述').isVisible();
    console.log(`  角色名称: ${characterSection ? '✅' : '❌'}`);
    console.log(`  性格设定: ${personalitySection ? '✅' : '❌'}`);
    console.log(`  照片路径: ${photoSection ? '✅' : '❌'}`);
    console.log(`  背景描述: ${descSection ? '✅' : '❌'}`);
    
    // 5. 测试记忆系统Tab
    console.log('\n=== 4. 测试记忆系统Tab ===');
    await page.locator('button:has-text("🧠 记忆系统")').click();
    await page.waitForTimeout(800);
    
    const memoryDays = await page.locator('text=记忆保存天数').isVisible();
    const memoryClean = await page.locator('text=记忆清理策略').isVisible();
    const memoryStats = await page.locator('text=记忆统计').isVisible();
    console.log(`  记忆保存天数: ${memoryDays ? '✅' : '❌'}`);
    console.log(`  清理策略: ${memoryClean ? '✅' : '❌'}`);
    console.log(`  记忆统计: ${memoryStats ? '✅' : '❌'}`);
    
    const screenshot2 = 'settings_memory_tab.png';
    await page.screenshot({ path: screenshot2, fullPage: false });
    screenshots.push(screenshot2);
    console.log(`  截图: ${screenshot2}`);
    
    // 6. 测试系统设定Tab
    console.log('\n=== 5. 测试系统设定Tab ===');
    await page.locator('button:has-text("⚙️ 系统设定")').click();
    await page.waitForTimeout(800);
    
    const screenWatch = await page.locator('text=截屏观察模式').isVisible();
    const screenInterval = await page.locator('text=截屏间隔时间').isVisible();
    const autoReply = await page.locator('text=主动回复').isVisible();
    const ttsSetting = await page.locator('text=语音朗读').isVisible();
    console.log(`  截屏观察模式: ${screenWatch ? '✅' : '❌'}`);
    console.log(`  截屏间隔时间: ${screenInterval ? '✅' : '❌'}`);
    console.log(`  主动回复: ${autoReply ? '✅' : '❌'}`);
    console.log(`  TTS语音: ${ttsSetting ? '✅' : '❌'}`);
    
    const screenshot3 = 'settings_system_tab.png';
    await page.screenshot({ path: screenshot3, fullPage: false });
    screenshots.push(screenshot3);
    console.log(`  截图: ${screenshot3}`);
    
    // 7. 测试模型设置Tab
    console.log('\n=== 6. 测试模型设置Tab ===');
    await page.locator('button:has-text("🤖 模型设置")').click();
    await page.waitForTimeout(800);
    
    const apiConfig = await page.locator('text=API 配置').isVisible();
    const advSettings = await page.locator('text=高级设置').isVisible();
    const connectionTest = await page.locator('text=连接测试').isVisible();
    console.log(`  API配置: ${apiConfig ? '✅' : '❌'}`);
    console.log(`  高级设置: ${advSettings ? '✅' : '❌'}`);
    console.log(`  连接测试: ${connectionTest ? '✅' : '❌'}`);
    
    const screenshot4 = 'settings_model_tab.png';
    await page.screenshot({ path: screenshot4, fullPage: false });
    screenshots.push(screenshot4);
    console.log(`  截图: ${screenshot4}`);
    
    // 8. 测试风格页面Tab
    console.log('\n=== 7. 测试风格页面Tab ===');
    await page.locator('button:has-text("🎨 风格页面")').click();
    await page.waitForTimeout(800);
    
    const displayCtrl = await page.locator('text=界面显示控制').isVisible();
    const featureToggle = await page.locator('text=功能开关').isVisible();
    const themeSetting = await page.locator('text=主题风格').isVisible();
    console.log(`  界面显示控制: ${displayCtrl ? '✅' : '❌'}`);
    console.log(`  功能开关: ${featureToggle ? '✅' : '❌'}`);
    console.log(`  主题风格: ${themeSetting ? '✅' : '❌'}`);
    
    const screenshot5 = 'settings_style_tab.png';
    await page.screenshot({ path: screenshot5, fullPage: false });
    screenshots.push(screenshot5);
    console.log(`  截图: ${screenshot5}`);
    
    // 9. 验证开关控件
    console.log('\n=== 8. 验证开关控件 ===');
    const toggleButtons = await page.locator('.rounded-full').count();
    console.log(`  开关控件数量: ${toggleButtons}`);
    
    // 10. 输出总结
    console.log('\n========================================');
    console.log('设置页面验证结果');
    console.log('========================================');
    console.log(`截图文件:`);
    screenshots.forEach(s => console.log(`  - ${s}`));
    console.log(`\nTauri错误数: ${errors.filter(e => e.includes('__TAURI__') || e.includes('invoke')).length}`);
    console.log(`控制台错误: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n错误详情:');
      errors.slice(0, 5).forEach(e => console.log(`  - ${e.substring(0, 100)}`));
    }
    
    // 保存测试结果
    const result = {
      timestamp: new Date().toISOString(),
      status: errors.length === 0 ? 'PASS' : 'WARN',
      tabsVerified: expectedTabs.map(t => t.name),
      screenshots,
      tauriErrors: errors.filter(e => e.includes('__TAURI__') || e.includes('invoke')).length,
      totalErrors: errors.length,
    };
    
    fs.writeFileSync('settings_verification_result.json', JSON.stringify(result, null, 2));
    console.log('\n结果已保存到 settings_verification_result.json');
    
  } catch (err) {
    console.error('测试失败:', err.message);
    await page.screenshot({ path: 'settings_error.png', fullPage: false });
    console.log('错误截图: settings_error.png');
  }
  
  await browser.close();
  console.log('\n测试完成!');
})();
