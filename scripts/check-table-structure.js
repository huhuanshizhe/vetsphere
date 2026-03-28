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

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少 Supabase 环境变量！');
  process.exit(1);
}

console.log('=== 检查 products 表结构 ===\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Check products table columns
console.log('1. 检查 products 表列:');
const { data: columns, error: columnsError } = await supabase
  .rpc('get_table_columns', { table_name: 'products' });

if (columnsError) {
  console.error('   ❌ 查询失败:', columnsError.message);

  // Alternative: Use information_schema
  console.log('\n   尝试使用 information_schema...');
  const { data: schemaColumns, error: schemaError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'products')
    .order('ordinal_position');

  if (schemaError) {
    console.error('   ❌ information_schema 查询失败:', schemaError.message);
  } else {
    console.log('   ✅ products 表列:');
    schemaColumns.forEach(col => {
      console.log(`      - ${col.column_name} (${col.data_type}${col.is_nullable ? ', nullable' : ''})`);
    });
  }
} else {
  console.log('   ✅ products 表列:');
  columns.forEach(col => {
    console.log(`      - ${col.column_name} (${col.data_type})`);
  });
}

// Check product_site_views columns
console.log('\n2. 检查 product_site_views 表列:');
const { data: siteViewColumns, error: siteViewColumnsError } = await supabase
  .from('information_schema.columns')
  .select('column_name, data_type, is_nullable')
  .eq('table_schema', 'public')
  .eq('table_name', 'product_site_views')
  .order('ordinal_position');

if (siteViewColumnsError) {
  console.error('   ❌ 查询失败:', siteViewColumnsError.message);
} else {
  console.log('   ✅ product_site_views 表列:');
  siteViewColumns.forEach(col => {
    console.log(`      - ${col.column_name} (${col.data_type}${col.is_nullable ? ', nullable' : ''})`);
  });
}

// Check for name-related columns in products
console.log('\n3. 查找名称相关的列:');
const nameColumns = siteViewColumns?.filter(col =>
  col.column_name.toLowerCase().includes('name')
) || [];

if (nameColumns.length > 0) {
  console.log('   ✅ 找到以下名称列:');
  nameColumns.forEach(col => {
    console.log(`      - ${col.column_name} (${col.data_type})`);
  });
} else {
  console.log('   ⚠️  未找到名称相关的列');
}

// Query sample data to check what we actually have
console.log('\n4. 查询 products 表样本数据:');
const { data: sampleProducts, error: sampleError } = await supabase
  .from('products')
  .select('*')
  .limit(1);

if (sampleError) {
  console.error('   ❌ 查询失败:', sampleError.message);
} else {
  console.log('   ✅ 找到', sampleProducts.length, '个产品');
  if (sampleProducts.length > 0) {
    console.log('   样本数据字段:', Object.keys(sampleProducts[0]).join(', '));
    console.log('   样本数据:', JSON.stringify(sampleProducts[0], null, 2));
  }
}

console.log('\n=== 诊断完成 ===');
