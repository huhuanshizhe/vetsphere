/**
 * 产品管理按钮诊断工具
 * 检查实际运行的代码状态
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🔍 产品管理按钮诊断工具\n');
console.log('='.repeat(70));

const BASE_URL = 'http://localhost:3002';

// 诊断项目
const diagnostics = {
  server: { status: 'unknown', message: '' },
  files: { status: 'unknown', message: '' },
  cache: { status: 'unknown', message: '' },
  code: { status: 'unknown', message: '' }
};

// 1. 检查服务器状态
async function checkServer() {
  console.log('\n[1/4] 检查开发服务器状态...\n');
  
  return new Promise((resolve) => {
    const lib = http;
    const req = lib.get(`${BASE_URL}/admin/products`, (res) => {
      if (res.statusCode === 200) {
        diagnostics.server = {
          status: 'running',
          message: `服务器正在运行 (端口 3002)`
        };
        console.log('  ✅ 服务器正在运行');
        console.log(`     URL: ${BASE_URL}/admin/products`);
      } else {
        diagnostics.server = {
          status: 'error',
          message: `服务器返回错误状态码：${res.statusCode}`
        };
        console.log('  ❌ 服务器响应异常');
        console.log(`     状态码：${res.statusCode}`);
      }
      resolve();
    });

    req.on('error', (error) => {
      diagnostics.server = {
        status: 'stopped',
        message: '服务器未运行或无法访问'
      };
      console.log('  ❌ 服务器未运行');
      console.log(`     错误：${error.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      diagnostics.server = {
        status: 'timeout',
        message: '服务器响应超时'
      };
      console.log('  ❌ 服务器响应超时');
      resolve();
    });
  });
}

// 2. 检查文件状态
function checkFiles() {
  console.log('\n[2/4] 检查源代码文件...\n');
  
  const productsPagePath = path.join(__dirname, 'src/app/(admin)/products/page.tsx');
  const productDetailPath = path.join(__dirname, 'src/app/(admin)/products/[id]/page.tsx');
  
  // 检查文件是否存在
  if (!fs.existsSync(productsPagePath)) {
    diagnostics.files = {
      status: 'error',
      message: '产品列表页面文件不存在'
    };
    console.log('  ❌ 文件不存在');
    console.log(`     路径：${productsPagePath}`);
    return;
  }
  
  if (!fs.existsSync(productDetailPath)) {
    diagnostics.files = {
      status: 'error',
      message: '产品详情页面文件不存在'
    };
    console.log('  ❌ 文件不存在');
    console.log(`     路径：${productDetailPath}`);
    return;
  }
  
  console.log('  ✅ 文件存在');
  console.log(`     产品列表：${productsPagePath}`);
  console.log(`     产品详情：${productDetailPath}`);
  
  // 读取文件内容
  const productsPage = fs.readFileSync(productsPagePath, 'utf8');
  const productDetail = fs.readFileSync(productDetailPath, 'utf8');
  
  // 检查关键代码
  const checks = [
    {
      name: '编辑按钮',
      test: () => productsPage.includes('编辑') && productsPage.includes('bg-emerald-600'),
      pass: '编辑按钮代码已实现',
      fail: '编辑按钮代码未实现'
    },
    {
      name: '通过按钮',
      test: () => productsPage.includes('✓ 通过') && productsPage.includes('handleApprove'),
      pass: '通过按钮代码已实现',
      fail: '通过按钮代码未实现'
    },
    {
      name: '拒绝按钮',
      test: () => productsPage.includes('✕ 拒绝') && productsPage.includes('handleReject'),
      pass: '拒绝按钮代码已实现',
      fail: '拒绝按钮代码未实现'
    },
    {
      name: '发布按钮',
      test: () => productsPage.includes('发布中国站') && productsPage.includes('handlePublishToSite'),
      pass: '发布按钮代码已实现',
      fail: '发布按钮代码未实现'
    },
    {
      name: '详情页 params',
      test: () => productDetail.includes('use(params)') || productDetail.includes('useParams()'),
      pass: '详情页 params 处理正确',
      fail: '详情页 params 处理可能有误'
    }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.test()) {
      console.log(`  ✅ ${check.pass}`);
    } else {
      console.log(`  ❌ ${check.fail}`);
      allPassed = false;
    }
  });
  
  diagnostics.code = {
    status: allPassed ? 'ok' : 'error',
    message: allPassed ? '所有代码检查通过' : '部分代码检查失败'
  };
}

// 3. 检查缓存
function checkCache() {
  console.log('\n[3/4] 检查缓存状态...\n');
  
  const cachePath = path.join(__dirname, '.next');
  
  if (!fs.existsSync(cachePath)) {
    diagnostics.cache = {
      status: 'clean',
      message: '缓存目录不存在（正常）'
    };
    console.log('  ℹ️  缓存目录不存在');
    console.log('     这是正常的，Next.js 会自动创建');
    return;
  }
  
  const cacheFiles = fs.readdirSync(cachePath);
  diagnostics.cache = {
    status: 'exists',
    message: `缓存目录存在 (${cacheFiles.length} 个文件/文件夹)`
  };
  
  console.log('  ⚠️  缓存目录存在');
  console.log(`     路径：${cachePath}`);
  console.log(`     内容：${cacheFiles.join(', ')}`);
  console.log('');
  console.log('  💡 建议：如果页面没有更新，可以尝试删除缓存目录');
  console.log(`     命令：rm -rf .next`);
}

// 4. 提供解决方案
function provideSolutions() {
  console.log('\n[4/4] 诊断结论和建议...\n');
  console.log('─'.repeat(70));
  console.log('');
  
  const issues = [];
  
  if (diagnostics.server.status !== 'running') {
    issues.push('服务器未运行');
  }
  
  if (diagnostics.files.status === 'error') {
    issues.push('文件检查失败');
  }
  
  if (diagnostics.code.status === 'error') {
    issues.push('代码实现不完整');
  }
  
  if (issues.length === 0) {
    console.log('  ✅ 所有检查通过！\n');
    console.log('  🎉 代码已正确实现，服务器正在运行\n');
    console.log('  📋 下一步操作：\n');
    console.log('  1. 打开浏览器访问：http://localhost:3002/admin/products');
    console.log('  2. 按 F12 打开开发者工具');
    console.log('  3. 按 Ctrl+Shift+R 强制刷新浏览器');
    console.log('  4. 检查产品列表中的按钮是否显示');
  } else {
    console.log('  ⚠️  发现以下问题：\n');
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    console.log('');
    console.log('  📋 建议的解决方案：\n');
    
    if (diagnostics.server.status !== 'running') {
      console.log('  1. 启动开发服务器:');
      console.log('     cd apps/admin');
      console.log('     npm run dev');
      console.log('');
    }
    
    if (diagnostics.code.status === 'error') {
      console.log('  2. 代码实现不完整，请检查修改是否已保存');
      console.log('');
    }
    
    console.log('  3. 强制刷新浏览器:');
    console.log('     Windows: Ctrl + Shift + R');
    console.log('     Mac: Cmd + Shift + R');
    console.log('');
    
    console.log('  4. 清除缓存并重启:');
    console.log('     运行：powershell -ExecutionPolicy Bypass -File restart.ps1');
    console.log('');
  }
  
  console.log('─'.repeat(70));
  console.log('');
}

// 运行诊断
async function runDiagnostics() {
  try {
    await checkServer();
    checkFiles();
    checkCache();
    provideSolutions();
    
    // 输出总结
    console.log('📊 诊断总结:\n');
    console.log(`  服务器状态：${diagnostics.server.status}`);
    console.log(`  文件状态：${diagnostics.files.status}`);
    console.log(`  缓存状态：${diagnostics.cache.status}`);
    console.log(`  代码状态：${diagnostics.code.status}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ 诊断过程出错:', error.message);
  }
}

runDiagnostics();
