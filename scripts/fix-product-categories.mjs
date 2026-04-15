/**
 * Fix product categories: map Excel L1/L2/L3 to database category_id
 * Prefers most specific match: L3 > L2 > L1
 */
import XLSX from 'xlsx';
import pg from 'pg';

const DATABASE_URL = 'postgresql://postgres.tvxrgbntiksskywsroax:wpnkpGhM2nj97Sln@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function main() {
  // 1. Read Excel
  const wb = XLSX.readFile('alibaba_products_template_v2.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`Read ${rows.length} rows from Excel`);

  // 2. Connect to database
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // 3. Load all categories into a lookup map: name -> { id, level, parent_id }
  const { rows: categories } = await client.query(
    'SELECT id, name, name_en, level, parent_id FROM product_categories WHERE is_active = true'
  );
  console.log(`Loaded ${categories.length} categories from database`);

  // Build lookup by Chinese name
  const catByName = new Map();
  for (const cat of categories) {
    if (cat.name) catByName.set(cat.name.trim(), cat);
  }

  // Also build by name_en for fallback
  const catByNameEn = new Map();
  for (const cat of categories) {
    if (cat.name_en) catByNameEn.set(cat.name_en.trim().toLowerCase(), cat);
  }

  // 4. For each Excel row, find the best matching category
  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    const sku = row['SKU'];
    const l1 = (row['L1 Category'] || '').trim();
    const l2 = (row['L2 Category'] || '').trim();
    const l3 = (row['L3 Category'] || '').trim();

    // Find most specific category: L3 > L2 > L1
    let matchedCat = null;
    if (l3 && catByName.has(l3)) {
      matchedCat = catByName.get(l3);
    } else if (l2 && catByName.has(l2)) {
      matchedCat = catByName.get(l2);
    } else if (l1 && catByName.has(l1)) {
      matchedCat = catByName.get(l1);
    }

    // Fallback: try English name matching
    if (!matchedCat) {
      if (l3 && catByNameEn.has(l3.toLowerCase())) {
        matchedCat = catByNameEn.get(l3.toLowerCase());
      } else if (l2 && catByNameEn.has(l2.toLowerCase())) {
        matchedCat = catByNameEn.get(l2.toLowerCase());
      }
    }

    if (!matchedCat) {
      console.warn(`  No match for SKU ${sku}: L1="${l1}" L2="${l2}" L3="${l3}"`);
      notFound++;
      continue;
    }

    // Also determine level3_category_id if the match is L3
    const categoryId = matchedCat.id;

    // Update the product
    const result = await client.query(
      'UPDATE products SET category_id = $1, updated_at = NOW() WHERE sku_code = $2 AND deleted_at IS NULL',
      [categoryId, sku]
    );

    if (result.rowCount > 0) {
      console.log(`  ${sku}: -> ${matchedCat.name} (${matchedCat.id}, L${matchedCat.level})`);
      updated++;
    } else {
      console.warn(`  ${sku}: product not found in database`);
    }
  }

  console.log(`\nDone: ${updated} updated, ${notFound} no category match`);
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
