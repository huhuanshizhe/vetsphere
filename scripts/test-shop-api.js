/**
 * 测试 IntlShopPage 中使用的实际 API 调用
 */
const { getIntlProducts } = require('../packages/shared/src/services/intl-api');

async function testShopPageAPI() {
  console.log('=== Testing Shop Page API ===\n');

  // Test 1: Load regular products (like IntlShopPage does)
  console.log('Test 1: Loading regular products...');
  const result1 = await getIntlProducts({
    featured: false,
    specialty: undefined,
    limit: 12,
    offset: 0,
    locale: 'en',
  });

  console.log(`Result: ${result1.items.length} items, total: ${result1.total}`);
  if (result1.items.length > 0) {
    result1.items.forEach(p => {
      console.log(`  - ${p.display_name} (image: ${p.cover_image_url ? 'Yes' : 'No'})`);
    });
  }

  // Test 2: Load featured products (like IntlShopPage does)
  console.log('\nTest 2: Loading featured products...');
  const result2 = await getIntlProducts({
    featured: true,
    limit: 8,
    locale: 'en',
  });

  console.log(`Result: ${result2.items.length} items, total: ${result2.total}`);
  if (result2.items.length > 0) {
    result2.items.forEach(p => {
      console.log(`  - ${p.display_name} (image: ${p.cover_image_url ? 'Yes' : 'No'})`);
    });
  }

  console.log('\n=== Tests completed ===');
}

testShopPageAPI().catch(console.error);
