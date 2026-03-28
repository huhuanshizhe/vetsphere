const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
const envPath = path.join(__dirname, '../apps/intl/.env.local');
let supabaseUrl, supabaseKey;

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value.replace(/"/g, '');
      }
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
        supabaseKey = value.replace(/"/g, '');
      }
    }
  }
} catch (error) {
  console.error('无法读取环境变量文件:', error.message);
}

console.log('=== Supabase 诊断 ===\n');
console.log('环境变量:');
console.log('  URL:', supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : '未找到');
console.log('  Key:', supabaseKey ? '已设置 (' + supabaseKey.substring(0, 20) + '...)' : '未找到');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n缺少 Supabase 环境变量！');
  process.exit(1);
}

console.log('\n测试连接...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  // Test 1: Check if we can connect to Supabase
  console.log('\n1. 测试 Supabase 连接:');
  const { data: testData, error: testError } = await supabase
    .from('products')
    .select('id')
    .limit(1);

  if (testError) {
    console.error('   ❌ 连接失败:', testError.message);
    console.error('   错误详情:', testError);
  } else {
    console.log('   ✅ 连接成功');
  }

  // Test 2: Check product_site_views table structure
  console.log('\n2. 检查 product_site_views 表:');
  const { data: tableInfo, error: tableError } = await supabase
    .from('product_site_views')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('   ❌ 表访问失败:', tableError.message);
    console.error('   表可能不存在或权限不足');
  } else {
    console.log('   ✅ 表可以访问');
    console.log('   返回的列名:', Object.keys(tableInfo[0] || {}).join(', '));
  }

  // Test 3: Check products with intl site_code
  console.log('\n3. 检查 intl 站点的产品:');
  const { data: intlProducts, error: intlError } = await supabase
    .from('product_site_views')
    .select('id, product_id, display_name, publish_status, is_enabled, site_code')
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .limit(5);

  if (intlError) {
    console.error('   ❌ 查询失败:', intlError.message);
    console.error('   错误详情:', intlError);
  } else {
    console.log('   ✅ 找到', intlProducts.length, '个产品');
    if (intlProducts.length > 0) {
      console.log('   第一个产品:', intlProducts[0]);
    } else {
      console.log('   ⚠️  没有符合条件的产品');
      console.log('   请检查:');
      console.log('     - product_site_views 表中是否有 site_code = intl 的记录');
      console.log('     - publish_status 是否为 published');
      console.log('     - is_enabled 是否为 true');
    }
  }

  // Test 4: Count total products
  console.log('\n4. 检查总产品数:');
  const { count, error: countError } = await supabase
    .from('product_site_views')
    .select('*', { count: 'exact', head: true })
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

  if (countError) {
    console.error('   ❌ 计数查询失败:', countError.message);
  } else {
    console.log('   ✅ 总数:', count);
  }

  // Test 5: Check products table directly
  console.log('\n5. 检查 products 表:');
  const { data: allProducts, error: allProductsError } = await supabase
    .from('products')
    .select('id, display_name, is_published, is_enabled')
    .eq('is_published', true)
    .eq('is_enabled', true)
    .limit(5);

  if (allProductsError) {
    console.error('   ❌ 查询失败:', allProductsError.message);
  } else {
    console.log('   ✅ 找到', allProducts.length, '个产品');
    if (allProducts.length > 0) {
      console.log('   第一个产品:', allProducts[0]);
    }
  }

  console.log('\n=== 诊断完成 ===');
}

runTests().catch(console.error);
