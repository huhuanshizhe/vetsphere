/**
 * Re-call translate API to update focus_keyword translations
 */
import pg from 'pg';

const DATABASE_URL = 'postgresql://postgres.tvxrgbntiksskywsroax:wpnkpGhM2nj97Sln@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
const API_BASE = 'http://localhost:3002';

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows: products } = await client.query(
    `SELECT id, sku_code FROM products WHERE publish_language='en' AND deleted_at IS NULL`
  );

  console.log(`Found ${products.length} products`);

  for (const p of products) {
    console.log(`[${products.indexOf(p) + 1}/${products.length}] ${p.sku_code || p.id}`);
    try {
      const res = await fetch(`${API_BASE}/api/products/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id })
      });
      const data = await res.json();
      console.log(data.success ? `  ✅ ${data.message}` : `  ❌ ${data.error}`);
    } catch (err) {
      console.log(`  ❌ Network error: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });