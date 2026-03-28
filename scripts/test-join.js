const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../apps/intl/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
let url, key;

for (const line of lines) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/"/g, '');
    if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
    if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key = v;
  }
}

const supabase = createClient(url, key);

async function test() {
  console.log('=== 测试 products 表 JOIN ===\n');

  // Try the exact same query as in the code
  const { data, error, count } = await supabase
    .from('product_site_views')
    .select(`
      *,
      products!inner (
        id, slug, name, name_en, name_ja, name_th,
        subtitle, description, description_en, description_ja, description_th,
        rich_description, rich_description_en, rich_description_ja, rich_description_th,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, specs, price_min, price_max,
        status, pricing_mode, price, stock_quantity,
        supplier_uuid
      )
    `, { count: 'exact' })
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .limit(2);

  if (error) {
    console.error('❌ 查询失败:', error.message);
    console.error('错误详情:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ 查询成功!');
    console.log('返回行数:', data.length);
    console.log('总行数:', count);

    if (data.length > 0) {
      console.log('\n第一个产品的数据:');
      console.log('  id:', data[0].id);
      console.log('  product_id:', data[0].product_id);
      console.log('  display_name:', data[0].display_name);
      console.log('  site_code:', data[0].site_code);
      console.log('  products.name:', data[0].products?.name);
      console.log('  products.name_en:', data[0].products?.name_en);
      console.log('  products.clinical_category:', data[0].products?.clinical_category);
    }
  }

  console.log('\n=== 测试完成 ===');
}

test().catch(console.error);
