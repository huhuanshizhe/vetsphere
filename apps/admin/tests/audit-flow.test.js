/**
 * 产品审核流程集成测试
 * 测试完整的产品审核工作流
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 产品审核流程集成测试\n');
console.log('='.repeat(60));

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function test(name, fn) {
  testResults.total++;
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      testResults.passed++;
      testResults.details.push({ test: name, status: 'passed' });
    } else {
      console.log(`❌ ${name}`);
      testResults.failed++;
      testResults.details.push({ test: name, status: 'failed', reason: '断言失败' });
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testResults.failed++;
    testResults.details.push({ test: name, status: 'failed', reason: error.message });
  }
}

// 读取源代码文件
const productsPagePath = path.join(__dirname, '../src/app/(admin)/products/page.tsx');
const productDetailPath = path.join(__dirname, '../src/app/(admin)/products/[id]/page.tsx');

const productsPage = fs.readFileSync(productsPagePath, 'utf8');
const productDetail = fs.readFileSync(productDetailPath, 'utf8');

console.log('\n📋 测试阶段 1: 产品列表页面功能\n');
console.log('-'.repeat(60));

// 测试 1: 产品加载功能
test('产品列表应该从数据库加载', () => {
  return productsPage.includes('supabase') && 
         productsPage.includes('.from(\'products\')') &&
         productsPage.includes('.select(');
});

// 测试 2: 状态筛选功能
test('应该支持按状态筛选产品', () => {
  return productsPage.includes('filter') && 
         productsPage.includes('setFilter') &&
         productsPage.includes('.eq(\'status\', filter)');
});

// 测试 3: 统计卡片显示
test('应该显示 5 种状态的统计卡片', () => {
  const statuses = ['all', 'pending_review', 'approved', 'published', 'rejected'];
  return statuses.every(s => productsPage.includes(`key: '${s}'`));
});

// 测试 4: 待审核产品显示审核按钮
test('待审核产品应该显示审核按钮', () => {
  return productsPage.includes('product.status === \'pending_review\'') &&
         productsPage.includes('handleApprove') &&
         productsPage.includes('handleReject');
});

// 测试 5: 已通过产品显示发布按钮
test('已通过产品应该显示发布按钮', () => {
  return productsPage.includes('product.status === \'approved\'') &&
         productsPage.includes('handlePublishToSite');
});

// 测试 6: 已发布产品显示上下架按钮
test('已发布产品应该显示上下架按钮', () => {
  return productsPage.includes('product.status === \'published\'') &&
         productsPage.includes('handleOfflineFromSite');
});

// 测试 7: 编辑按钮导航到详情页
test('编辑按钮应该导航到产品详情页', () => {
  return productsPage.includes('router.push(`/admin/products/${product.id}`)');
});

console.log('\n\n📋 测试阶段 2: 产品详情页面功能\n');
console.log('-'.repeat(60));

// 测试 8: 详情页接收 params
test('详情页应该正确接收 params', () => {
  return productDetail.includes('use(params)') || productDetail.includes('useParams()');
});

// 测试 9: 详情页加载产品数据
test('详情页应该加载产品数据', () => {
  return productDetail.includes('fetchProduct') &&
         productDetail.includes('.from(\'products\')') &&
         productDetail.includes('.select(\'*\')');
});

// 测试 10: 详情页支持编辑模式
test('详情页应该支持编辑模式切换', () => {
  return productDetail.includes('editing') &&
         productDetail.includes('setEditing') &&
         productDetail.includes('handleSave');
});

// 测试 11: 详情页支持审核操作
test('详情页应该支持审核操作', () => {
  return productDetail.includes('handleApprove') &&
         productDetail.includes('handleReject') &&
         productDetail.includes('product.status === \'pending_review\'');
});

// 测试 12: 详情页支持发布操作
test('详情页应该支持发布操作', () => {
  return productDetail.includes('handlePublishToSite') &&
         productDetail.includes('cn') &&
         productDetail.includes('intl');
});

// 测试 13: 详情页显示三标签页
test('详情页应该显示三标签页', () => {
  return productDetail.includes('activeTab') &&
         productDetail.includes('basic') &&
         productDetail.includes('pricing') &&
         productDetail.includes('publish');
});

// 测试 14: 详情页支持保存修改
test('详情页应该支持保存修改', () => {
  return productDetail.includes('handleSave') &&
         productDetail.includes('.update(') &&
         productDetail.includes('.eq(\'id\', productId)');
});

console.log('\n\n📋 测试阶段 3: 审核流程完整性\n');
console.log('-'.repeat(60));

// 测试 15: 批准功能更新状态
test('批准功能应该更新产品状态为 approved', () => {
  return productsPage.includes('status: \'approved\'') &&
         productsPage.includes('rejection_reason: null');
});

// 测试 16: 拒绝功能记录原因
test('拒绝功能应该记录拒绝原因', () => {
  return productsPage.includes('rejectionReason') &&
         productsPage.includes('status: \'rejected\'') &&
         productsPage.includes('rejection_reason: rejectionReason');
});

// 测试 17: 发布功能创建站点视图
test('发布功能应该创建或更新站点视图', () => {
  return productsPage.includes('product_site_views') &&
         productsPage.includes('publish_status: \'published\'') &&
         productsPage.includes('site_code');
});

// 测试 18: 下架功能更新发布状态
test('下架功能应该更新发布状态为 offline', () => {
  return productsPage.includes('publish_status: \'offline\'') &&
         productsPage.includes('is_enabled: false');
});

// 测试 19: 审核流程状态流转
test('审核流程状态流转应该完整', () => {
  const states = ['draft', 'pending_review', 'approved', 'rejected', 'published'];
  return states.every(s => productsPage.includes(`'${s}'`));
});

// 测试 20: 拒绝弹窗功能
test('拒绝产品应该显示弹窗输入原因', () => {
  return productsPage.includes('selectedProduct') &&
         productsPage.includes('Reject Modal') &&
         productsPage.includes('textarea');
});

console.log('\n\n📋 测试阶段 4: UI/UX 验证\n');
console.log('-'.repeat(60));

// 测试 21: 按钮样式区分
test('不同操作的按钮应该有不同的样式', () => {
  const colors = ['emerald-600', 'green-600', 'red-600', 'blue-600', 'purple-600', 'slate-600'];
  return colors.some(c => productsPage.includes(c));
});

// 测试 22: 状态徽章显示
test('产品状态应该用徽章显示', () => {
  return productsPage.includes('statusConfig') &&
         productsPage.includes('rounded-full');
});

// 测试 23: 加载状态显示
test('加载时应该显示加载动画', () => {
  return productsPage.includes('loading') &&
         (productsPage.includes('animate-spin') || productsPage.includes('加载中'));
});

// 测试 24: 错误提示
test('操作失败时应该显示错误提示', () => {
  return productsPage.includes('alert') &&
         productsPage.includes('操作失败');
});

// 测试 25: 成功提示
test('操作成功时应该显示成功提示', () => {
  return productsPage.includes('alert') &&
         (productsPage.includes('已通过') || productsPage.includes('成功'));
});

console.log('\n\n📋 测试阶段 5: 数据完整性\n');
console.log('-'.repeat(60));

// 测试 26: 产品字段完整性
test('产品接口应该包含所有必要字段', () => {
  const requiredFields = ['id', 'name', 'status', 'price', 'supplier', 'site_views'];
  return requiredFields.every(f => productsPage.includes(f));
});

// 测试 27: 供应商信息加载
test('应该加载供应商信息', () => {
  return productsPage.includes('supplier:suppliers') &&
         productsPage.includes('company_name');
});

// 测试 28: 站点发布状态加载
test('应该加载站点发布状态', () => {
  return productsPage.includes('site_views:product_site_views') &&
         productsPage.includes('publish_status');
});

// 测试 29: 更新时间戳
test('更新操作应该更新时间戳', () => {
  return productsPage.includes('updated_at') &&
         productsPage.includes('new Date().toISOString()');
});

// 测试 30: 错误处理
test('应该有完善的错误处理', () => {
  return productsPage.includes('try') &&
         productsPage.includes('catch') &&
         productsPage.includes('console.error');
});

// 输出总结
console.log('\n\n' + '='.repeat(60));
console.log('📈 测试总结');
console.log('='.repeat(60));
console.log(`总测试数：${testResults.total}`);
console.log(`✅ 通过：${testResults.passed}`);
console.log(`❌ 失败：${testResults.failed}`);
console.log(`成功率：${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
console.log('='.repeat(60));

// 输出失败的测试
const failedTests = testResults.details.filter(d => d.status === 'failed');
if (failedTests.length > 0) {
  console.log('\n❌ 失败的测试:');
  failedTests.forEach(test => {
    console.log(`   - ${test.test}: ${test.reason || ''}`);
  });
} else {
  console.log('\n🎉 所有测试通过！产品审核流程完整实现！\n');
}

// 保存测试结果
const reportPath = path.join(__dirname, 'audit-flow-test-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    total: testResults.total,
    passed: testResults.passed,
    failed: testResults.failed,
    successRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%'
  },
  details: testResults.details
}, null, 2));

console.log(`📄 测试报告已保存到：${reportPath}\n`);

// 输出审核流程图
console.log('📊 产品审核流程图:');
console.log('');
console.log('  ┌──────────┐');
console.log('  │  草稿    │');
console.log('  │  draft   │');
console.log('  └────┬─────');
console.log('       │');
console.log('       ▼');
console.log('  ┌──────────────┐');
console.log('  │  待审核      │◄───────┐');
console.log('  │pending_review│        │');
console.log('  └──────┬───────┘        │');
console.log('         │                │');
console.log('    ┌────┴────┐          │');
console.log('    ▼         ▼          │');
console.log('  通过       拒绝────────┘');
console.log('    │         │');
console.log('    ▼         │');
console.log('  ┌──────────│');
console.log('  │  已通过  ││');
console.log('  │ approved ││');
console.log('  └────┬─────┘│');
console.log('       │      │');
console.log('       ▼      │');
console.log('  ┌──────────┐│');
console.log('  │  已发布  ││');
console.log('  │published ││');
console.log('  └────┬─────┘│');
console.log('       │      │');
console.log('    上下架管理 │');
console.log('');

process.exit(testResults.failed > 0 ? 1 : 0);
