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
}

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少 Supabase 环境变量！');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryData() {
  console.log('=== 查询 product_site_views 表结构 ===\n');
  const { data, error } = await supabase
    .from('product_site_views')
    .select('*')
    .eq('site_code', 'intl')
    .limit(1);

  if (error) {
    console.error('错误:', error.message);
  } else {
    if (data.length > 0) {
      console.log('列名:', Object.keys(data[0]).join(', '));
      console.log('\n数据样例:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('没有找到数据，尝试查询所有产品...');
      const { data: allData, error: allError } = await supabase
        .from('product_site_views')
        .select('*')
        .limit(1);

      if (allError) {
        console.error('错误:', allError.message);
      } else if (allData.length > 0) {
        console.log('列名:', Object.keys(allData[0]).join(', '));
        console.log('\n数据样例:', JSON.stringify(allData[0], null, 2));
      }
    }
  }
}

queryData().catch(console.error);
