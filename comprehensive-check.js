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

async function comprehensiveCheck() {
  console.log('=== 检查 product_site_views 表中的所有产品 ===\n');

  // 1. 查询所有 intl 产品的状态
  console.log('1. 所有 intl 产品 (所有状态):');
  const { data: allIntlData, error: allIntlError } = await supabase
    .from('product_site_views')
    .select('product_id, site_code, is_enabled, publish_status, display_name, display_order, published_at')
    .eq('site_code', 'intl')
    .order('display_order', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false });

  if (allIntlError) {
    console.error('错误:', allIntlError.message);
  } else {
    console.log(`找到 ${allIntlData.length} 个 intl 产品\n`);
    allIntlData.forEach((item, index) => {
      console.log(`${index + 1}. ${item.product_id} - ${item.display_name || 'No display name'}`);
      console.log(`   Status: ${item.publish_status}, Enabled: ${item.is_enabled}, Order: ${item.display_order}`);
    });
  }

  // 2. 查询已发布且启用的产品，包含 cover_image_url
  console.log('\n2. 已发布且启用的产品 (包含 cover_image_url):');
  const { data: publishedData, error: publishedError } = await supabase
    .from('product_site_views')
    .select(`
      product_id,
      display_name,
      is_enabled,
      publish_status,
      display_order,
      published_at,
      products!inner (
        slug,
        cover_image_url,
        name,
        name_en,
        status
      )
    `)
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .order('display_order', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false });

  if (publishedError) {
    console.error('错误:', publishedError.message);
  } else {
    console.log(`找到 ${publishedData.length} 个已发布且启用的产品\n`);
    publishedData.forEach((item, index) => {
      const slug = item.products?.slug || 'No slug';
      const name = item.display_name || item.products?.name_en || item.products?.name || 'No name';
      const coverImage = item.products?.cover_image_url;
      const status = item.products?.status;

      console.log(`${index + 1}. ${slug} (${name})`);
      console.log(`   Cover Image: ${coverImage || 'NULL'}`);
      console.log(`   Product Status: ${status}`);
      console.log(`   Site View: Enabled=${item.is_enabled}, Status=${item.publish_status}, Order=${item.display_order}`);

      if (coverImage === null) {
        console.log('   ⚠️  警告: cover_image_url 为 null');
      }
      console.log('');
    });

    // 统计
    const nullCount = publishedData.filter(item => !item.products || item.products.cover_image_url === null).length;
    const nonNullCount = publishedData.filter(item => item.products && item.products.cover_image_url !== null).length;

    console.log('=== 统计 ===');
    console.log(`已发布且启用的产品总数: ${publishedData.length}`);
    console.log(`有封面图的产品: ${nonNullCount}`);
    console.log(`缺少封面图的产品: ${nullCount}`);
    if (publishedData.length > 0) {
      console.log(`缺少封面图比例: ${((nullCount / publishedData.length) * 100).toFixed(2)}%`);
    }
  }

  // 3. 检查 products 表中是否有 cover_image_url
  console.log('\n3. 检查 products 表中的 cover_image_url 数据:');
  const { data: productImages, error: productImagesError } = await supabase
    .from('products')
    .select('id, slug, name, cover_image_url, image_url, images')
    .in('id', ['p-enalos-headlight-1773822043032', 'prod-xray-en-003', 'prod-monitor-en-002', 'prod-suture-en-001'])
    .limit(10);

  if (productImagesError) {
    console.error('错误:', productImagesError.message);
  } else {
    console.log(`找到 ${productImages.length} 个产品\n`);
    productImages.forEach((item, index) => {
      console.log(`${index + 1}. ${item.slug || item.id}`);
      console.log(`   cover_image_url: ${item.cover_image_url || 'NULL'}`);
      console.log(`   image_url: ${item.image_url || 'NULL'}`);
      console.log(`   images: ${item.images && item.images.length > 0 ? `${item.images.length} 个图片` : 'NULL'}`);
      if (item.images && item.images.length > 0) {
        console.log(`   第一个图片: ${item.images[0]}`);
      }
      console.log('');
    });
  }
}

comprehensiveCheck().catch(console.error);
