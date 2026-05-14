const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[console.error] ' + msg.text());
  });
  
  const screenshots = [];
  
  try {
    console.log('=== AI Companion 设置页面验证 ===\n');
    
    // 1. 打开页面
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('1. 主页加载: ✅');
    
    // 2. 点击设置按钮
    const settingsBtn = page.locator('button').first();
    await settingsBtn.click();
    await page.waitForTimeout(1500);
    
    const screenshot1 = 'settings_01_overview.png';
    await page.screenshot({ path: screenshot1, fullPage: false });
    screenshots.push(screenshot1);
    console.log('2. 点击设置按钮: ✅');
    console.log('   截图:', screenshot1);
    
    // 3. 验证左侧导航有5个Tab
    console.log('\n3. 验证左侧导航Tab:');
    const expectedTabs = [
      '👤 人物设定',
      '🧠 记忆系统', 
      '⚙️ 系统设定',
      '🤖 模型设置',
      '🎨 风格页面',
    ];
    
    let tabsOk = true;
    for (const tab of expectedTabs) {
      const isVisible = await page.locator(`button:has-text("${tab}")`).isVisible();
      console.log(`   ${tab}: ${isVisible ? '✅' : '❌'}`);
      if (!isVisible) tabsOk = false;
    }
    
    // 4. 验证人物设定Tab内容
    console.log('\n4. 验证人物设定Tab内容:');
    const charFields = [
      { text: '角色名称', name: '角色名称输入框' },
      { text: '性格设定', name: '性格标签选择' },
      { text: '人物照片读取路径', name: '照片路径输入' },
      { text: '角色背景描述', name: '背景描述文本' },
    ];
    
    for (const field of charFields) {
      const isVisible = await page.locator(`text=${field.text}`).first().isVisible();
      console.log(`   ${field.name}: ${isVisible ? '✅' : '❌'}`);
    }
    
    // 5. 测试记忆系统Tab
    console.log('\n5. 测试记忆系统Tab:');
    await page.locator('button:has-text("🧠 记忆系统")').click();
    await page.waitForTimeout(800);
    
    const screenshot2 = 'settings_02_memory.png';
    await page.screenshot({ path: screenshot2, fullPage: false });
    screenshots.push(screenshot2);
    
    const memoryFields = ['记忆保存天数', '记忆清理策略', '记忆统计'];
    for (const field of memoryFields) {
      const isVisible = await page.locator(`text=${field}`).first().isVisible();
      console.log(`   ${field}: ${isVisible ? '✅' : '❌'}`);
    }
    console.log('   截图:', screenshot2);
    
    // 6. 测试系统设定Tab
    console.log('\n6. 测试系统设定Tab:');
    await page.locator('button:has-text("⚙️ 系统设定")').click();
    await page.waitForTimeout(800);
    
    const screenshot3 = 'settings_03_system.png';
    await page.screenshot({ path: screenshot3, fullPage: false });
    screenshots.push(screenshot3);
    
    const systemFields = ['截屏观察模式', '截屏间隔时间', '主动回复', '语音朗读'];
    for (const field of systemFields) {
      const isVisible = await page.locator(`text=${field}`).first().isVisible();
      console.log(`   ${field}: ${isVisible ? '✅' : '❌'}`);
    }
    console.log('   截图:', screenshot3);
    
    // 7. 测试模型设置Tab
    console.log('\n7. 测试模型设置Tab:');
    await page.locator('button:has-text("🤖 模型设置")').click();
    await page.waitForTimeout(800);
    
    const screenshot4 = 'settings_04_model.png';
    await page.screenshot({ path: screenshot4, fullPage: false });
    screenshots.push(screenshot4);
    
    const modelFields = ['API 配置', '高级设置', '连接测试'];
    for (const field of modelFields) {
      const isVisible = await page.locator(`text=${field}`).first().isVisible();
      console.log(`   ${field}: ${isVisible ? '✅' : '❌'}`);
    }
    console.log('   截图:', screenshot4);
    
    // 8. 测试风格页面Tab
    console.log('\n8. 测试风格页面Tab:');
    await page.locator('button:has-text("🎨 风格页面")').click();
    await page.waitForTimeout(800);
    
    const screenshot5 = 'settings_05_style.png';
    await page.screenshot({ path: screenshot5, fullPage: false });
    screenshots.push(screenshot5);
    
    const styleFields = ['界面显示控制', '功能开关', '主题风格'];
    for (const field of styleFields) {
      const isVisible = await page.locator(`text=${field}`).first().isVisible();
      console.log(`   ${field}: ${isVisible ? '✅' : '❌'}`);
    }
    console.log('   截图:', screenshot5);
    
    // 9. 测试开关控件
    console.log('\n9. 测试开关控件:');
    const toggleCount = await page.locator('.rounded-full').count();
    console.log(`   开关控件数量: ${toggleCount} ${toggleCount >= 8 ? '✅' : '❌'}`);
    
    // 10. 验证版本号
    console.log('\n10. 验证版本信息:');
    const versionText = await page.locator('text=v0.3.0').isVisible();
    console.log(`    版本 v0.3.0: ${versionText ? '✅' : '❌'}`);
    
    // 总结
    console.log('\n========================================');
    console.log('验证结果总结');
    console.log('========================================');
    console.log(`截图文件 (${screenshots.length}):`);
    screenshots.forEach(s => console.log(`  - ${s}`));
    console.log(`\nTauri错误数: ${errors.filter(e => e.includes('__TAURI__') || e.includes('invoke')).length}`);
    console.log(`总错误数: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n错误详情:');
      errors.slice(0, 3).forEach(e => console.log(`  - ${e.substring(0, 150)}`));
    }
    
    // 保存结果
    const result = {
      timestamp: new Date().toISOString(),
      status: errors.length === 0 ? 'PASS' : 'WARN',
      tabs: expectedTabs,
      screenshots,
      tauriErrors: errors.filter(e => e.includes('__TAURI__') || e.includes('invoke')).length,
      totalErrors: errors.length,
    };
    
    fs.writeFileSync('settings_final_result.json', JSON.stringify(result, null, 2));
    console.log('\n结果已保存: settings_final_result.json');
    console.log('\n✅ 验证完成!');
    
  } catch (err) {
    console.error('测试失败:', err.message);
    await page.screenshot({ path: 'settings_error.png', fullPage: false });
    console.log('错误截图: settings_error.png');
  }
  
  await browser.close();
})();
