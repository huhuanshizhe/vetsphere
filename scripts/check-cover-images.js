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

async function checkCoverImages() {
  console.log('=== 查询 product_site_views 表中的 cover_image_url ===\n');
  console.log('查询条件: site_code=\'intl\', publish_status=\'published\', is_enabled=true\n');

  const { data, error } = await supabase
    .from('product_site_views')
    .select('slug, display_name, cover_image_url')
    .eq('site_code', 'intl')
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .order('display_order', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false });

  if (error) {
    console.error('查询错误:', error.message);
    console.error('详情:', JSON.stringify(error, null, 2));
    return;
  }

  console.log(`找到 ${data.length} 个产品\n`);

  // 统计 null 值和非 null 值
  const nullCount = data.filter(item => item.cover_image_url === null).length;
  const nonNullCount = data.filter(item => item.cover_image_url !== null).length;

  console.log('=== 统计信息 ===');
  console.log(`总产品数: ${data.length}`);
  console.log(`cover_image_url 为 null 的数量: ${nullCount}`);
  console.log(`cover_image_url 有值的数量: ${nonNullCount}`);
  console.log(`null 值比例: ${((nullCount / data.length) * 100).toFixed(2)}%\n`);

  console.log('=== 详细列表 ===\n');

  data.forEach((item, index) => {
    console.log(`${index + 1}. Slug: ${item.slug}`);
    console.log(`   Display Name: ${item.display_name}`);
    console.log(`   Cover Image URL: ${item.cover_image_url || 'NULL'}`);

    if (item.cover_image_url === null) {
      console.log('   ⚠️  警告: cover_image_url 为 null');
    } else {
      // 检查 URL 格式
      if (item.cover_image_url.startsWith('http')) {
        console.log('   ✓ 完整 URL');
      } else if (item.cover_image_url.startsWith('/')) {
        console.log('   ⚠️  警告: 相对路径');
      } else {
        console.log('   ❓ 未知格式');
      }
    }
    console.log('');
  });

  // 只显示 null 值的产品
  const nullProducts = data.filter(item => item.cover_image_url === null);
  if (nullProducts.length > 0) {
    console.log('=== 缺少封面的产品列表 ===\n');
    nullProducts.forEach((item, index) => {
      console.log(`${index + 1}. ${item.slug} - ${item.display_name}`);
    });
    console.log('');
  }
}

checkCoverImages().catch(console.error);
