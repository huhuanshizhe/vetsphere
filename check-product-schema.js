const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'apps/intl/.env.local');
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
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少 Supabase 环境变量！');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductSchema() {
  console.log('=== 检查产品表结构 ===\n');

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  if (productsError) {
    console.error('查询产品失败:', productsError.message);
    return;
  }

  if (products && products.length > 0) {
    console.log('产品表列:');
    Object.keys(products[0]).forEach(col => {
      console.log(`- ${col}`);
    });
  } else {
    console.log('产品表为空或无数据');
  }
}

checkProductSchema().catch(console.error);