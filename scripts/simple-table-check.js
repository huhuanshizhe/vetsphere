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

async function checkTables() {
  console.log('=== 检查 product_site_views 表中的 intl 产品 ===\n');

  console.log('查询 product_site_views 表中已发布的 intl 产品:');
  const { data: siteViewsData, error: siteViewsError } = await supabase
    .from('product_site_views')
    .select('*')
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .order('display_order', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false });

  if (siteViewsError) {
    console.error('错误:', siteViewsError.message);
    console.error('详情:', JSON.stringify(siteViewsError, null, 2));
  } else {
    console.log(`成功！找到 ${siteViewsData.length} 个产品\n`);

    // 统计
    const nullCount = siteViewsData.filter(item => item.cover_image_url === null).length;
    const nonNullCount = siteViewsData.filter(item => item.cover_image_url !== null).length;

    console.log('=== 统计信息 ===');
    console.log(`总产品数: ${siteViewsData.length}`);
    console.log(`cover_image_url 为 null 的数量: ${nullCount}`);
    console.log(`cover_image_url 有值的数量: ${nonNullCount}`);
    if (siteViewsData.length > 0) {
      console.log(`null 值比例: ${((nullCount / siteViewsData.length) * 100).toFixed(2)}%`);
    }
    console.log('');

    // 详细列表
    console.log('=== 详细列表 ===\n');
    siteViewsData.forEach((item, index) => {
      console.log(`${index + 1}. Product ID: ${item.product_id}`);
      console.log(`   Display Name: ${item.display_name || 'NULL'}`);
      console.log(`   Cover Image URL: ${item.cover_image_url || 'NULL'}`);
      console.log(`   Status: ${item.publish_status}, Enabled: ${item.is_enabled}, Order: ${item.display_order}`);
      console.log(`   Published At: ${item.published_at}`);
      console.log('');
    });

    // 只显示 null 值的产品
    const nullProducts = siteViewsData.filter(item => item.cover_image_url === null);
    if (nullProducts.length > 0) {
      console.log('=== 缺少封面的产品列表 ===\n');
      nullProducts.forEach((item, index) => {
        console.log(`${index + 1}. ${item.product_id} - ${item.display_name || 'No display name'}`);
      });
      console.log('');
    }
  }

  console.log('\n=== 测试 JOIN 查询 ===\n');

  console.log('尝试查询 product_site_views JOIN products:');
  const { data: joinData, error: joinError } = await supabase
    .from('product_site_views')
    .select(`
      *,
      products!inner (
        id, slug, name, name_en, name_ja, name_th,
        subtitle, description, description_en, description_ja, description_th,
        rich_description, rich_description_en, rich_description_ja, rich_description_th,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, image_url, images, specs, price_min, price_max,
        status, pricing_mode, price, stock_quantity,
        supplier_uuid
      )
    `)
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .limit(10);

  if (joinError) {
    console.error('JOIN 错误:', joinError.message);
    console.error('详情:', JSON.stringify(joinError, null, 2));
  } else {
    console.log('成功！找到', joinData.length, '行');
    if (joinData.length > 0) {
      console.log('\n=== 完整产品信息（包含图片信息）===\n');
      joinData.forEach((item, index) => {
        console.log(`${index + 1}. ${item.products.slug || item.products.id}`);
        console.log(`   Name: ${item.products.name_en || item.products.name}`);
        console.log(`   Display Name (site view): ${item.display_name || 'NULL'}`);
        console.log(`   cover_image_url: ${item.products.cover_image_url || 'NULL'}`);
        console.log(`   image_url: ${item.products.image_url || 'NULL'}`);
        console.log(`   images: ${item.products.images && item.products.images.length > 0 ? `${item.products.images.length} 个图片` : 'NULL'}`);
        if (item.products.images && item.products.images.length > 0) {
          item.products.images.forEach((img, i) => {
            console.log(`      [${i+1}] ${img}`);
          });
        }
        console.log('');
      });
    }
  }
}

checkTables().catch(console.error);
