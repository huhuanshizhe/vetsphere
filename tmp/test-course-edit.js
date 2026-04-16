const { chromium } = require('playwright');

(async () => {
  console.log('🚀 启动浏览器...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  // 步骤 1: 登录 admin
  console.log('📝 登录 admin 账号...');
  await page.goto('http://localhost:3002/admin/login');
  
  try {
    // 等待登录页面加载
    await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 5000 });
    
    // 填写登录信息
    await page.fill('input[name="email"]', 'admin@vetsphere.pro');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 等待登录成功并跳转
    await page.waitForURL('**/admin/courses', { timeout: 10000 });
    console.log('✅ 登录成功');
  } catch (err) {
    console.log('⚠️ 登录步骤可能已自动完成或跳过:', err.message);
  }

  // 步骤 2: 导航到课程编辑页面
  console.log('📚 查找课程列表...');
  await page.goto('http://localhost:3002/admin/courses');
  await page.waitForTimeout(2000);
  
  // 点击第一个课程
  const courseLinks = await page.$$('a[href*="/admin/courses/"]');
  if (courseLinks.length === 0) {
    console.log('❌ 未找到任何课程');
    await browser.close();
    return;
  }
  
  console.log(`📖 找到 ${courseLinks.length} 个课程，点击第一个...`);
  const courseHref = await courseLinks[0].getAttribute('href');
  await courseLinks[0].click();
  
  // 等待编辑页面加载
  await page.waitForTimeout(3000);
  console.log('📄 课程编辑页面已加载');
  
  // 步骤 3: 尝试编辑课程标题
  console.log('✏️ 尝试编辑课程标题...');
  
  // 查找标题输入框
  const titleInput = await page.$('input[type="text"]');
  if (!titleInput) {
    console.log('❌ 未找到标题输入框');
    await browser.close();
    return;
  }
  
  // 获取原始值
  const originalValue = await titleInput.inputValue();
  console.log(`📝 原始标题：${originalValue.substring(0, 50)}...`);
  
  // 尝试点击并输入
  try {
    await titleInput.click();
    console.log('✅ 输入框可以点击');
    
    // 全选并删除
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    
    // 输入测试文本
    const testText = `[测试编辑] ${new Date().toLocaleTimeString()}`;
    await titleInput.type(testText);
    console.log(`✅ 输入成功：${testText}`);
    
    // 验证输入值
    const newValue = await titleInput.inputValue();
    console.log(`📝 新标题：${newValue}`);
    
    if (newValue.includes('[测试编辑]')) {
      console.log('✅ 输入框编辑功能正常！');
    } else {
      console.log('❌ 输入值未更新，可能存在状态更新问题');
    }
    
    // 截图
    await page.screenshot({ 
      path: '/tmp/course-edit-test.png',
      fullPage: false
    });
    console.log('📸 截图已保存到 /tmp/course-edit-test.png');
    
  } catch (err) {
    console.log('❌ 编辑失败:', err.message);
  }
  
  // 步骤 4: 检查控制台日志
  console.log('🔍 检查页面状态...');
  const isReadOnly = await page.evaluate(() => {
    const input = document.querySelector('input[type="text"]');
    if (!input) return null;
    return {
      disabled: input.disabled,
      readOnly: input.readOnly,
      className: input.className,
      value: input.value
    };
  });
  
  console.log('📊 输入框状态:', isReadOnly);
  
  // 保持浏览器打开一段时间以便观察
  console.log('⏳ 5 秒后关闭浏览器...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('👋 测试完成');
})();
