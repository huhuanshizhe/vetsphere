const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tvxrgbntiksskywsroax.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3MTIsImV4cCI6MjA4NjQyMTcxMn0.xM7u06mRQSCKCoNQwYa2_wEw4he4ZM11iDfyhjfQtDc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('=== Testing Supabase Connection ===\n');

async function testConnection() {
  try {
    // Test 1: Check products table
    console.log('Test 1: Checking products table...');
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, cover_image_url, status')
      .limit(5);

    if (productError) {
      console.error('  ❌ Error:', productError.message);
    } else {
      console.log(`  ✅ Found ${products.length} products`);
      products.forEach(p => {
        console.log(`     - ${p.name} (image: ${p.cover_image_url ? 'Yes' : 'No'}, status: ${p.status})`);
      });
    }

    // Test 2: Check product_site_views table
    console.log('\nTest 2: Checking product_site_views table...');
    const { data: siteViews, error: siteViewError } = await supabase
      .from('product_site_views')
      .select('*')
      .eq('site_code', 'intl')
      .limit(5);

    if (siteViewError) {
      console.error('  ❌ Error:', siteViewError.message);
    } else {
      console.log(`  ✅ Found ${siteViews.length} site views`);
      if (siteViews.length > 0) {
        console.log(`     First site view:`, siteViews[0]);
      }
    }

    // Test 3: Check published products for INTL
    console.log('\nTest 3: Checking published products for INTL...');
    const { data: published, error: publishedError, count } = await supabase
      .from('product_site_views')
      .select('*', { count: 'exact' })
      .eq('site_code', 'intl')
      .eq('publish_status', 'published')
      .eq('is_enabled', true)
      .limit(5);

    if (publishedError) {
      console.error('  ❌ Error:', publishedError.message);
    } else {
      console.log(`  ✅ Found ${count} published products total`);
      console.log(`  ✅ Showing ${published.length} of ${count}`);
    }

    // Test 4: Check join query (same as in getIntlProducts)
    console.log('\nTest 4: Checking join query...');
    const { data: joined, error: joinError } = await supabase
      .from('product_site_views')
      .select(`
        *,
        products!inner (
          id, name, cover_image_url, status
        )
      `)
      .eq('site_code', 'intl')
      .eq('publish_status', 'published')
      .eq('is_enabled', true)
      .limit(5);

    if (joinError) {
      console.error('  ❌ Error:', joinError.message);
    } else {
      console.log(`  ✅ Join query successful: ${joined.length} results`);
      joined.forEach(row => {
        const product = row.products;
        console.log(`     - ${product.name} (image: ${product.cover_image_url ? 'Yes' : 'No'})`);
      });
    }

    console.log('\n=== All tests completed ===');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
