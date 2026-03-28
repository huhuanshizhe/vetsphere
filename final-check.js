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

async function checkAllIntlProducts() {
  console.log('=== 查询所有 intl 产品图片信息 ===\n');

  // Get all intl product_site_views
  const { data: siteViews, error: siteViewsError } = await supabase
    .from('product_site_views')
    .select('product_id, site_code, display_name')
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

  if (siteViewsError) {
    console.error('错误:', siteViewsError.message);
    return;
  }

  console.log('找到', siteViews.length, '个 intl 产品\n');

  // Get all products
  const productIds = siteViews.map(sv => sv.product_id);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, slug, name, name_en, cover_image_url, image_url, images, status')
    .in('id', productIds);

  if (productsError) {
    console.error('错误:', productsError.message);
    return;
  }

  console.log('找到', products.length, '个对应的产品记录\n');

  console.log('=== 产品图片详情 ===\n');
  products.forEach((item, index) => {
    console.log((index + 1) + '. ' + (item.slug || item.id));
    console.log('   Name: ' + (item.name_en || item.name));
    console.log('   Status: ' + item.status);
    console.log('   cover_image_url: ' + (item.cover_image_url || 'NULL'));
    console.log('   image_url: ' + (item.image_url || 'NULL'));
    console.log('   images: ' + (item.images && item.images.length > 0 ? item.images.length + ' 个图片' : 'NULL'));
    if (item.images && item.images.length > 0) {
      item.images.forEach((img, i) => {
        console.log('      [' + (i+1) + '] ' + img);
      });
    }
    console.log('');
  });
}

checkAllIntlProducts().catch(console.error);
