/**
 * Batch AI Translation Script
 * Calls /api/products/translate for all untranslated products
 */
import pg from 'pg';

const DATABASE_URL = 'postgresql://postgres.tvxrgbntiksskywsroax:wpnkpGhM2nj97Sln@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
const ADMIN_API_BASE = 'http://localhost:3002';

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // 1. Find products that need translation (publish_language='en', translated_at is null)
  const { rows: products } = await client.query(
    `SELECT id, name_en, sku_code FROM products 
     WHERE publish_language = 'en' 
     AND deleted_at IS NULL 
     AND (translated_at IS NULL OR translated_at < updated_at)
     ORDER BY created_at`
  );

  console.log(`Found ${products.length} products needing translation`);

  if (products.length === 0) {
    console.log('No products to translate. Exiting.');
    await client.end();
    return;
  }

  // 2. Process each product
  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    console.log(`\n[${successCount + failCount + 1}/${products.length}] Translating: ${product.sku_code || product.id}`);
    console.log(`  Name: ${product.name_en?.substring(0, 60)}...`);

    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/products/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`  ❌ Error: ${data.error || res.status}`);
        failCount++;
      } else {
        console.log(`  ✅ Success: ${data.message}`);
        console.log(`     Source: ${data.sourceLang}, Completed: ${data.completedLangs?.join(', ')}`);
        successCount++;
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`  ❌ Network error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  await client.end();
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});