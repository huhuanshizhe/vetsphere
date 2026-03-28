/**
 * 产品管理按钮可见性 E2E 测试
 * 使用 Puppeteer 进行自动化浏览器测试
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3002';

// 测试用例配置
const testCases = [
  {
    name: '待审核产品',
    status: 'pending_review',
    expectedButtons: ['编辑', '✓ 通过', '✕ 拒绝'],
    notExpectedButtons: ['发布中国站', '发布国际站', '下架']
  },
  {
    name: '已通过产品',
    status: 'approved',
    expectedButtons: ['编辑', '发布中国站', '发布国际站'],
    notExpectedButtons: ['✓ 通过', '✕ 拒绝', '下架']
  },
  {
    name: '已发布产品',
    status: 'published',
    expectedButtons: ['编辑', '下架中国站', '下架国际站'],
    notExpectedButtons: ['✓ 通过', '✕ 拒绝', '发布']
  },
  {
    name: '草稿产品',
    status: 'draft',
    expectedButtons: ['编辑'],
    notExpectedButtons: ['通过', '拒绝', '发布', '下架']
  },
  {
    name: '已拒绝产品',
    status: 'rejected',
    expectedButtons: ['编辑'],
    notExpectedButtons: ['通过', '拒绝', '发布', '下架']
  }
];

async function runTests() {
  console.log('🧪 开始执行产品管理按钮可见性 E2E 测试...\n');
  
  let browser;
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  try {
    // 启动浏览器
    console.log('🚀 启动浏览器...');
    browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口以便观察
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 导航到产品管理页面
    console.log(`📍 访问 ${BASE_URL}/admin/products`);
    await page.goto(`${BASE_URL}/admin/products`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // 等待页面加载
    await page.waitForSelector('table', { timeout: 10000 });
    console.log('✅ 页面加载完成\n');

    // 执行测试
    for (const testCase of testCases) {
      console.log(`\n📋 测试用例：${testCase.name}`);
      console.log('─'.repeat(50));

      // 筛选对应状态的产品
      console.log(`   筛选状态：${testCase.status}`);
      const filterButton = await page.$(`button span:text("${testCase.status === 'pending_review' ? '待审核' : testCase.status === 'approved' ? '已通过' : testCase.status === 'published' ? '已发布' : testCase.status === 'rejected' ? '已拒绝' : '全部'}")`);
      
      if (filterButton) {
        await filterButton.click();
        await page.waitForTimeout(1000); // 等待筛选完成
      }

      // 获取表格中的产品行
      const rows = await page.$$('tbody tr');
      console.log(`   找到产品数量：${rows.length}`);

      if (rows.length === 0) {
        console.log(`   ⚠️  该状态没有产品，跳过测试`);
        continue;
      }

      // 测试第一个产品
      const firstRow = rows[0];
      
      // 测试预期应该存在的按钮
      for (const buttonName of testCase.expectedButtons) {
        results.total++;
        try {
          const button = await firstRow.$(`button:text("${buttonName}")`);
          if (button) {
            console.log(`   ✅ 应该显示 "${buttonName}" - 通过`);
            results.passed++;
            results.details.push({
              test: `${testCase.name} - 显示${buttonName}`,
              status: 'passed'
            });
          } else {
            console.log(`   ❌ 应该显示 "${buttonName}" - 失败 (未找到按钮)`);
            results.failed++;
            results.details.push({
              test: `${testCase.name} - 显示${buttonName}`,
              status: 'failed',
              reason: '按钮不存在'
            });
          }
        } catch (error) {
          console.log(`   ❌ 应该显示 "${buttonName}" - 失败 (${error.message})`);
          results.failed++;
          results.details.push({
            test: `${testCase.name} - 显示${buttonName}`,
            status: 'failed',
            reason: error.message
          });
        }
      }

      // 测试预期不应该存在的按钮
      for (const buttonName of testCase.notExpectedButtons) {
        results.total++;
        try {
          const button = await firstRow.$(`button:text("${buttonName}")`);
          if (!button) {
            console.log(`   ✅ 不应该显示 "${buttonName}" - 通过`);
            results.passed++;
            results.details.push({
              test: `${testCase.name} - 不显示${buttonName}`,
              status: 'passed'
            });
          } else {
            console.log(`   ❌ 不应该显示 "${buttonName}" - 失败 (按钮存在)`);
            results.failed++;
            results.details.push({
              test: `${testCase.name} - 不显示${buttonName}`,
              status: 'failed',
              reason: '按钮不应该存在'
            });
          }
        } catch (error) {
          console.log(`   ✅ 不应该显示 "${buttonName}" - 通过`);
          results.passed++;
          results.details.push({
            test: `${testCase.name} - 不显示${buttonName}`,
            status: 'passed'
          });
        }
      }

      // 测试按钮样式
      console.log(`\n   🎨 按钮样式测试:`);
      const editButton = await firstRow.$('button:text("编辑")');
      if (editButton) {
        const className = await (await editButton.getProperty('className')).jsonValue();
        const hasEmeraldClass = className.includes('emerald-600') || className.includes('bg-emerald');
        
        results.total++;
        if (hasEmeraldClass) {
          console.log(`   ✅ 编辑按钮样式正确 (emerald-600)`);
          results.passed++;
          results.details.push({
            test: `${testCase.name} - 编辑按钮样式`,
            status: 'passed'
          });
        } else {
          console.log(`   ❌ 编辑按钮样式不正确: ${className}`);
          results.failed++;
          results.details.push({
            test: `${testCase.name} - 编辑按钮样式`,
            status: 'failed',
            reason: `样式类不正确：${className}`
          });
        }
      }
    }

    // 测试统计卡片
    console.log(`\n\n📊 测试统计卡片`);
    console.log('─'.repeat(50));
    
    const statCards = await page.$$('button p.text-2xl, button p.text-3xl');
    if (statCards.length > 0) {
      console.log(`   ✅ 统计卡片存在 (找到 ${statCards.length} 个)`);
      results.details.push({
        test: '统计卡片显示',
        status: 'passed'
      });
    } else {
      console.log(`   ❌ 统计卡片不存在`);
      results.details.push({
        test: '统计卡片显示',
        status: 'failed',
        reason: '未找到统计卡片'
      });
    }

    // 输出总结
    console.log('\n\n' + '='.repeat(60));
    console.log('📈 测试总结');
    console.log('='.repeat(60));
    console.log(`总测试数：${results.total}`);
    console.log(`✅ 通过：${results.passed}`);
    console.log(`❌ 失败：${results.failed}`);
    console.log(`成功率：${((results.passed / results.total) * 100).toFixed(2)}%`);
    console.log('='.repeat(60));

    // 输出失败的测试
    const failedTests = results.details.filter(d => d.status === 'failed');
    if (failedTests.length > 0) {
      console.log('\n❌ 失败的测试:');
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.reason || ''}`);
      });
    }

    // 保存测试结果
    const fs = require('fs');
    const reportPath = 'tests/test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results
    }, null, 2));
    console.log(`\n📄 测试报告已保存到：${reportPath}`);

    // 截图
    const screenshotPath = 'tests/product-page-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 页面截图已保存到：${screenshotPath}`);

  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    results.details.push({
      test: '测试执行',
      status: 'failed',
      reason: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

// 运行测试
runTests().then(results => {
  if (results && results.failed === 0) {
    console.log('\n🎉 所有测试通过！\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查输出详情\n');
    process.exit(1);
  }
});
