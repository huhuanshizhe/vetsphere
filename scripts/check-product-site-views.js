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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('=== 检查 product_site_views 表结构 ===\n');

  // Try to query product_site_views with * to see all columns
  console.log('查询 product_site_views 表第一行:');
  const { data: siteViewsData, error: siteViewsError } = await supabase
    .from('product_site_views')
    .select('*')
    .eq('site_code', 'intl')
    .limit(1);

  if (siteViewsError) {
    console.error('错误:', siteViewsError.message);
    console.error('详情:', JSON.stringify(siteViewsError, null, 2));
  } else {
    console.log('成功！找到', siteViewsData.length, '行');
    if (siteViewsData.length > 0) {
      console.log('列名:', Object.keys(siteViewsData[0]).join(', '));
      console.log('数据:', JSON.stringify(siteViewsData[0], null, 2));
    } else {
      console.log('没有找到数据，查询所有产品...');
      const { data: allData, error: allError } = await supabase
        .from('product_site_views')
        .select('*')
        .limit(1);

      if (allError) {
        console.error('错误:', allError.message);
      } else if (allData.length > 0) {
        console.log('列名:', Object.keys(allData[0]).join(', '));
        console.log('数据:', JSON.stringify(allData[0], null, 2));
      }
    }
  }

  console.log('\n=== 查询 product_site_views 中的所有 intl 产品 ===\n');
  const { data: intlData, error: intlError } = await supabase
    .from('product_site_views')
    .select('*')
    .eq('site_code', 'intl')
    .limit(5);

  if (intlError) {
    console.error('错误:', intlError.message);
  } else {
    console.log(`找到 ${intlData.length} 个 intl 产品`);
    intlData.forEach((item, index) => {
      console.log(`\n${index + 1}. ID: ${item.id}`);
      console.log(`   Product ID: ${item.product_id}`);
      if (item.slug) console.log(`   Slug: ${item.slug}`);
      if (item.display_name) console.log(`   Display Name: ${item.display_name}`);
      if (item.name) console.log(`   Name: ${item.name}`);
      if (item.name_en) console.log(`   Name EN: ${item.name_en}`);
      console.log(`   Cover Image URL: ${item.cover_image_url || 'NULL'}`);
      console.log(`   Publish Status: ${item.publish_status}`);
      console.log(`   Is Enabled: ${item.is_enabled}`);
    });
  }
}

checkTableStructure().catch(console.error);
