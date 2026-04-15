/**
 * Fix Imported Products Script
 * 
 * This script fixes the issues with previously imported products:
 * 1. Move English data from base fields to _en fields
 * 2. Set publish_language = 'en' for English source products
 * 3. Convert rich_description line breaks to HTML
 * 4. Fix weight_unit values
 * 5. Calculate and update currency prices for SKUs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from admin app
config({ path: resolve(__dirname, '../apps/admin/.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'set' : 'missing');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Exchange rates
const EXCHANGE_RATES = {
  USD: 1,
  CNY: 7.2,
  JPY: 150,
  THB: 35,
};

/**
 * Convert plain text with line breaks to HTML format
 */
function convertToHtmlRichText(text: string): string {
  if (!text) return '';

  // If already contains HTML tags, return as-is
  if (text.includes('<') && text.includes('>')) {
    return text;
  }

  const lines = text.split(/\r?\n|\r|\n/);
  const htmlLines = lines
    .map(line => line.trim())
    .filter(line => line)
    .map(line => `<p>${line}</p>`)
    .join('');

  return htmlLines || text;
}

/**
 * Normalize weight unit
 */
function normalizeWeightUnit(unit: string): string {
  if (!unit) return 'kg';
  const normalized = unit.toLowerCase().trim();

  if (normalized === 'kg' || normalized === 'kgs' || normalized === 'kilogram' || normalized === 'kilograms') {
    return 'kg';
  }
  if (normalized === 'g' || normalized === 'gram' || normalized === 'grams') {
    return 'g';
  }
  if (normalized === 'lb' || normalized === 'lbs' || normalized === 'pound' || normalized === 'pounds') {
    return 'lb';
  }
  return 'kg';
}

async function fixProducts() {
  console.log('Starting fix for imported products...\n');

  // 1. Find products that need fixing
  // Products where name and name_en are the same (English in both places)
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, sku_code, name, name_en, description, description_en, rich_description, rich_description_en, brand, brand_en, publish_language, source_url, specifications, meta_title, meta_title_en, meta_description, meta_description_en')
    .not('name_en', 'is', null)
    .neq('name_en', '');

  if (fetchError) {
    console.error('Error fetching products:', fetchError);
    return;
  }

  console.log(`Found ${products?.length || 0} products to check.\n`);

  if (!products || products.length === 0) {
    console.log('No products found.');
    return;
  }

  let fixedCount = 0;
  let errorCount = 0;

  for (const product of products) {
    console.log(`Checking product: ${product.sku_code || product.id}`);
    
    try {
      const updateData: Record<string, any> = {};
      let needsUpdate = false;

      // Check if English content is duplicated in base fields
      // This indicates the product was imported with wrong language mapping
      const hasDuplicateEnglish = product.name && product.name_en && product.name === product.name_en;

      if (hasDuplicateEnglish) {
        console.log('  Found duplicate English content, fixing...');
        
        // Clear base fields (Chinese should be empty, filled by translation)
        updateData.name = '';
        updateData.slug = '';
        needsUpdate = true;
      }

      // Check description
      if (product.description && product.description_en && product.description === product.description_en) {
        updateData.description = '';
        needsUpdate = true;
      }

      // Check brand
      if (product.brand && product.brand_en && product.brand === product.brand_en) {
        updateData.brand = '';
        needsUpdate = true;
      }

      // Check meta_title
      if (product.meta_title && product.meta_title_en && product.meta_title === product.meta_title_en) {
        updateData.meta_title = '';
        needsUpdate = true;
      }

      // Check meta_description
      if (product.meta_description && product.meta_description_en && product.meta_description === product.meta_description_en) {
        updateData.meta_description = '';
        needsUpdate = true;
      }

      // Set publish_language to 'en' if not already set correctly
      if (product.publish_language !== 'en') {
        updateData.publish_language = 'en';
        needsUpdate = true;
      }

      // Fix rich_description format - convert line breaks to HTML
      if (product.rich_description_en && !product.rich_description_en.includes('<p>')) {
        const htmlContent = convertToHtmlRichText(product.rich_description_en);
        if (htmlContent !== product.rich_description_en) {
          updateData.rich_description_en = htmlContent;
          needsUpdate = true;
          console.log('  Converting rich_description to HTML format');
        }
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.id);

        if (updateError) {
          console.error(`  Error updating product:`, updateError);
          errorCount++;
        } else {
          console.log(`  ✓ Product fixed`);
          fixedCount++;
        }
      } else {
        console.log('  No fix needed');
      }

    } catch (err) {
      console.error(`  Error:`, err);
      errorCount++;
    }
  }

  // 2. Fix SKUs - update prices and weight_unit
  console.log('\n========================================');
  console.log('Fixing SKUs...\n');

  const { data: skus, error: skuFetchError } = await supabase
    .from('product_skus')
    .select('id, product_id, sku_code, price, selling_price, selling_price_usd, selling_price_jpy, selling_price_thb, weight, weight_unit');

  if (skuFetchError) {
    console.error('Error fetching SKUs:', skuFetchError);
  } else if (skus && skus.length > 0) {
    console.log(`Found ${skus.length} SKUs to check.`);

    let skuFixedCount = 0;

    for (const sku of skus) {
      const skuUpdates: Record<string, any> = {};
      let needsUpdate = false;

      // Fix weight_unit if needed
      if (sku.weight_unit) {
        const normalizedUnit = normalizeWeightUnit(sku.weight_unit);
        if (normalizedUnit !== sku.weight_unit) {
          skuUpdates.weight_unit = normalizedUnit;
          needsUpdate = true;
          console.log(`  SKU ${sku.sku_code}: fixing weight_unit from ${sku.weight_unit} to ${normalizedUnit}`);
        }
      }

      // Calculate missing currency prices from USD
      if (sku.selling_price_usd && sku.selling_price_usd > 0) {
        const expectedCny = Math.round(sku.selling_price_usd * EXCHANGE_RATES.CNY * 100) / 100;
        const expectedJpy = Math.round(sku.selling_price_usd * EXCHANGE_RATES.JPY);
        const expectedThb = Math.round(sku.selling_price_usd * EXCHANGE_RATES.THB * 100) / 100;

        if (!sku.selling_price || sku.selling_price === 0 || sku.selling_price === sku.price) {
          skuUpdates.selling_price = expectedCny;
          needsUpdate = true;
        }
        if (!sku.selling_price_jpy || sku.selling_price_jpy === 0) {
          skuUpdates.selling_price_jpy = expectedJpy;
          needsUpdate = true;
        }
        if (!sku.selling_price_thb || sku.selling_price_thb === 0) {
          skuUpdates.selling_price_thb = expectedThb;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const { error: skuUpdateError } = await supabase
          .from('product_skus')
          .update(skuUpdates)
          .eq('id', sku.id);

        if (skuUpdateError) {
          console.error(`  Error updating SKU ${sku.sku_code}:`, skuUpdateError);
        } else {
          console.log(`  ✓ SKU ${sku.sku_code} fixed`);
          skuFixedCount++;
        }
      }
    }

    console.log(`\nSKUs fixed: ${skuFixedCount}`);
  }

  console.log('\n========================================');
  console.log(`Fix completed!`);
  console.log(`Products fixed: ${fixedCount}`);
  console.log(`Product errors: ${errorCount}`);
  console.log('========================================\n');
}

// Run the script
fixProducts().catch(console.error);