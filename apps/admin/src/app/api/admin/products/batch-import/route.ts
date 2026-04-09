/**
 * Batch Import API
 * POST /api/admin/products/batch-import
 *
 * Import products from Excel data with streaming progress updates
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadMultipleImages } from '@/lib/oss';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ImportRow {
  _rowIndex: number;
  sku: string;
  name: string;
  brand: string;
  l1Category: string;
  l2Category: string;
  l3Category: string;
  shortDescription: string;
  fullDescription: string;
  primaryImageUrl: string;
  additionalImages: string;
  costPriceCny: number;
  sellingPriceUsd: number;
  minOrderQty: number;
  packageQty: number;
  packageUnit: string;
  weight: number;
  weightUnit: string;  // Weight unit from Excel (kg, g, lb)
  leadTime: string;
  availability: string;
  status: string;
  purchaseMode: string;
  attributes: { name: string; value: string }[];
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  sourceUrl: string;
  faqs: { question: string; answer: string }[];
  _mappedCategoryId?: string;
}

interface ProgressUpdate {
  total: number;
  current: number;
  success: number;
  failed: number;
  status: 'importing' | 'translating' | 'completed' | 'error';
  currentProduct?: string;
  errors: { row: number; message: string }[];
}

/**
 * Generate a unique product ID
 */
function generateProductId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `prod_${timestamp}_${random}`;
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

/**
 * Upload images and return OSS URLs
 */
async function processImages(
  primaryImageUrl: string,
  additionalImages: string,
  productId: string
): Promise<{ primaryImage: string; additionalImages: string[] }> {
  const allUrls: string[] = [];

  if (primaryImageUrl) {
    allUrls.push(primaryImageUrl);
  }

  if (additionalImages) {
    const urls = additionalImages
      .split(/[,\n]/)
      .map(u => u.trim())
      .filter(u => u);
    allUrls.push(...urls);
  }

  if (allUrls.length === 0) {
    return { primaryImage: '', additionalImages: [] };
  }

  try {
    const ossUrls = await uploadMultipleImages(allUrls, productId);
    const primaryImage = ossUrls[0] || '';
    const additional = ossUrls.slice(1).filter(u => u);
    return { primaryImage, additionalImages: additional };
  } catch (error) {
    console.error(`[Batch Import] Image upload failed for ${productId}:`, error);
    // Return original URLs if upload fails
    const primaryImage = allUrls[0] || '';
    const additional = allUrls.slice(1);
    return { primaryImage, additionalImages: additional };
  }
}

/**
 * Convert plain text with line breaks to HTML format
 * Preserves formatting from Excel rich text cells
 */
function convertToHtmlRichText(text: string): string {
  if (!text) return '';

  // If already contains HTML tags, return as-is
  if (text.includes('<') && text.includes('>')) {
    return text;
  }

  // Convert line breaks to HTML
  // Split by common line break patterns
  const lines = text.split(/\r?\n|\r|\n/);

  // Wrap each non-empty line in <p> tags
  const htmlLines = lines
    .map(line => line.trim())
    .filter(line => line)
    .map(line => `<p>${line}</p>`)
    .join('');

  return htmlLines || text;
}

/**
 * Normalize weight unit from Excel to database format
 * Excel may use: KG, kg, g, G, lb, LB, lbs, Lbs
 * Database expects: g, kg, lb
 */
function normalizeWeightUnit(unit: string): string {
  if (!unit) return 'kg';

  const normalized = unit.toLowerCase().trim();

  // Map common variations
  if (normalized === 'kg' || normalized === 'kgs' || normalized === 'kilogram' || normalized === 'kilograms') {
    return 'kg';
  }
  if (normalized === 'g' || normalized === 'gram' || normalized === 'grams') {
    return 'g';
  }
  if (normalized === 'lb' || normalized === 'lbs' || normalized === 'pound' || normalized === 'pounds') {
    return 'lb';
  }

  // Default to kg if unknown
  return 'kg';
}

/**
 * Convert weight to kg if unit is g (for consistency)
 * SKU weight_unit expects g/kg/lb, but we store weight in the unit specified
 */
function normalizeWeightValue(weight: number, unit: string): { weight: number; weight_unit: string } {
  const normalizedUnit = normalizeWeightUnit(unit);

  // If the unit is 'g' and weight is large (e.g., 5000g = 5kg),
  // we keep it as-is since the unit field will show 'g'
  // But if Excel says "KG" with value 5, we should keep 5kg not convert to 5000g

  return { weight, weight_unit: normalizedUnit };
}

/**
 * Exchange rates for currency conversion (approximate values)
 * Base currency: USD
 */
const EXCHANGE_RATES = {
  USD: 1,
  CNY: 7.2,   // 1 USD ≈ 7.2 CNY
  JPY: 150,   // 1 USD ≈ 150 JPY
  THB: 35,    // 1 USD ≈ 35 THB
};

/**
 * Convert USD price to other currencies
 */
function convertPriceToOtherCurrencies(usdPrice: number): {
  cny: number;
  jpy: number;
  thb: number;
} {
  return {
    cny: Math.round(usdPrice * EXCHANGE_RATES.CNY * 100) / 100,
    jpy: Math.round(usdPrice * EXCHANGE_RATES.JPY),
    thb: Math.round(usdPrice * EXCHANGE_RATES.THB * 100) / 100,
  };
}

/**
 * Create a single product with SKU
 */
async function createProduct(row: ImportRow): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productId = generateProductId();

    // Process images
    const { primaryImage, additionalImages } = await processImages(
      row.primaryImageUrl,
      row.additionalImages,
      productId
    );

    // Build specifications from attributes
    const specifications: Record<string, string> = {};
    for (const attr of row.attributes) {
      specifications[attr.name] = attr.value;
    }

    // Convert rich description to HTML format
    const richDescriptionHtml = convertToHtmlRichText(row.fullDescription);

    // Normalize weight unit and value
    const { weight: normalizedWeight, weight_unit: normalizedWeightUnit } = normalizeWeightValue(
      row.weight,
      row.weightUnit || 'kg'
    );

    // Convert selling price to other currencies
    const convertedPrices = convertPriceToOtherCurrencies(row.sellingPriceUsd);

    // IMPORTANT: Source language is English (en)
    // - Base fields (name, description, etc.) are for Chinese (zh) - leave empty
    // - _en fields contain the actual English data from Excel
    // - _zh, _th, _ja fields will be filled by translation

    // Create product record
    const productData = {
      id: productId,
      sku_code: row.sku || null,
      // Base fields (Chinese) - empty, will be filled by translation
      name: '',  // Empty - will be translated to Chinese
      name_en: row.name,  // English data from Excel
      brand: '',  // Empty - will be translated
      brand_en: row.brand || '',  // English data
      description: '',  // Empty - will be translated
      description_en: row.shortDescription || '',  // English data
      rich_description: '',  // Empty - will be translated
      rich_description_en: richDescriptionHtml,  // English HTML content
      category_id: row._mappedCategoryId || null,
      image_url: primaryImage,  // Primary image URL from OSS
      slug: '',  // Empty - will be translated
      slug_en: generateSlug(row.name),  // English slug
      status: 'draft', // Always draft for review
      has_price: true,
      min_order_quantity: row.minOrderQty || 1,
      package_qty: row.packageQty || 1,
      package_unit: row.packageUnit || 'Each',
      lead_time: row.leadTime || '2-4 weeks',
      delivery_time: '',  // Empty - will be translated
      delivery_time_en: row.leadTime || '2-4 weeks',
      source_url: row.sourceUrl || null,  // Source URL from Excel
      focus_keyword: row.focusKeyword || null,
      // Meta fields
      meta_title: '',  // Empty - will be translated
      meta_title_en: row.metaTitle || '',
      meta_description: '',  // Empty - will be translated
      meta_description_en: row.metaDescription || '',
      // Specifications (stored as JSONB)
      specifications: specifications,
      // FAQs
      faq: row.faqs.length > 0 ? row.faqs : null,
      // Weight (stored at SKU level)
      weight: normalizedWeight,
      // Source language marker - English is the source
      publish_language: 'en',  // Mark English as source language
      translated_at: null,  // Will be set after translation
      supplier_id: null, // Platform self-operated, no supplier
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert product
    const { error: productError } = await supabase
      .from('products')
      .insert(productData);

    if (productError) {
      console.error(`[Batch Import] Product insert error:`, productError);
      return { success: false, error: productError.message };
    }

    // Insert product images (if additional images exist)
    if (additionalImages.length > 0) {
      const imageRecords = additionalImages.map((url, index) => ({
        product_id: productId,
        url: url,
        type: 'gallery',
        sort_order: index + 1,
      }));

      const { error: imageError } = await supabase
        .from('product_images')
        .insert(imageRecords);

      if (imageError) {
        console.error(`[Batch Import] Image insert error:`, imageError);
        // Don't fail the whole product for image errors
      }
    }

    // Create default SKU (id is auto-generated UUID)
    // SKU fields mapping:
    // - price: Cost price (供货价) from supplier - CNY value
    // - selling_price: Selling price in CNY (converted from USD)
    // - selling_price_usd: Selling price in USD (from Excel)
    // - selling_price_jpy/thb: Converted from USD
    // - weight_unit: Normalized from Excel (kg/g/lb)

    const skuData = {
      product_id: productId,
      sku_code: row.sku || `${productId}-001`,
      attribute_combination: {}, // Empty object for no variants (NOT NULL field)
      // Cost price (供货价) - the price Admin pays to supplier
      price: row.costPriceCny || 0,  // CNY cost price
      // Selling prices (销售价) - the price customers pay
      selling_price: convertedPrices.cny,  // CNY selling price (converted)
      selling_price_usd: row.sellingPriceUsd || 0,  // USD selling price (from Excel)
      selling_price_jpy: convertedPrices.jpy,  // JPY selling price (converted)
      selling_price_thb: convertedPrices.thb,  // THB selling price (converted)
      original_price: row.sellingPriceUsd || 0,  // Original/reference price in USD
      stock_quantity: row.availability === 'In Stock' ? 100 : 0,
      // Weight with normalized unit
      weight: normalizedWeight,
      weight_unit: normalizedWeightUnit,  // kg, g, or lb (normalized)
      is_active: true,
      sort_order: 1,
      image_url: primaryImage,  // SKU image same as product primary image
      specs: specifications,  // SKU specifications (规格参数)
    };

    const { error: skuError } = await supabase
      .from('product_skus')
      .insert(skuData);

    if (skuError) {
      console.error(`[Batch Import] SKU insert error:`, skuError);
      // Don't fail for SKU error, can be fixed manually
    }

    return { success: true, productId };
  } catch (error) {
    console.error(`[Batch Import] Unexpected error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * Translate a product using DashScope
 * Source language: English (_en fields)
 * Target languages: Chinese (zh/base fields), Thai (th), Japanese (ja)
 */
async function translateProduct(productId: string): Promise<boolean> {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    console.error('[Batch Import] No DashScope API key configured');
    return false;
  }

  try {
    // Get product data
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      console.error(`[Batch Import] Translation: Failed to get product ${productId}`, error);
      return false;
    }

    // Extract translatable content from English fields (_en)
    const content: Record<string, string> = {};
    const translatableFields = [
      'name', 'subtitle', 'description', 'rich_description',
      'brand', 'packaging_info', 'delivery_time', 'warranty_info',
      'meta_title', 'meta_description',
    ];

    // Read from _en fields (English source)
    for (const field of translatableFields) {
      const enValue = product[field + '_en'];
      if (typeof enValue === 'string' && enValue.trim()) {
        content[field] = enValue;
      }
    }

    if (Object.keys(content).length === 0) {
      console.log(`[Batch Import] Translation: No content to translate for ${productId}`);
      return true; // No content to translate
    }

    console.log(`[Batch Import] Translation: Translating ${Object.keys(content).length} fields for ${productId}`);

    // Call DashScope for translation
    const { fetch } = require('undici');
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
      fetch: fetch,
    });

    // Target languages: Chinese, Thai, Japanese
    const targetLangs: ('zh' | 'th' | 'ja')[] = ['zh', 'th', 'ja'];
    const languageNames: Record<string, string> = {
      zh: '中文',
      th: 'ภาษาไทย',
      ja: '日本語'
    };

    const prompt = `Translate the following product content from English to these languages: ${targetLangs.map(l => languageNames[l]).join(', ')}

RULES:
1. Return ONLY valid JSON
2. Each language key contains the same structure with translated values
3. Keep product names, brand names, and technical terms transliterated when appropriate
4. For HTML content (rich_description), preserve HTML tags
5. Make translations natural and professional for e-commerce
6. For Chinese (zh), use Simplified Chinese characters

SOURCE CONTENT (English):
${Object.entries(content).map(([k, v]) => `${k}: "${v.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`).join('\n')}

Return format (EXACT structure):
{
  "zh": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} },
  "th": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} },
  "ja": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} }
}`;

    const completion = await client.chat.completions.create({
      model: 'qwen3.5-plus',
      messages: [
        { role: 'system', content: 'You are a professional e-commerce translator. Return only valid JSON, no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const resultText = completion.choices[0].message.content;
    if (!resultText) {
      console.error(`[Batch Import] Translation: No response from AI for ${productId}`);
      return false;
    }

    // Parse result
    let cleanText = resultText;
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

    const translations = JSON.parse(cleanText.trim());
    console.log(`[Batch Import] Translation: Received translations for ${Object.keys(translations).join(', ')}`);

    // Build update payload
    const updatePayload: Record<string, string | null> = {};

    // For Chinese (zh), update the base fields (no suffix)
    if (translations.zh) {
      for (const [field, value] of Object.entries(translations.zh as Record<string, string>)) {
        if (value) {
          updatePayload[field] = value;  // Base field for Chinese
          if (field === 'name') {
            updatePayload['slug'] = generateSlug(value);
          }
        }
      }
    }

    // For Thai and Japanese, update the _th and _ja fields
    for (const lang of ['th', 'ja'] as const) {
      if (translations[lang]) {
        for (const [field, value] of Object.entries(translations[lang] as Record<string, string>)) {
          if (value) {
            updatePayload[`${field}_${lang}`] = value;
            if (field === 'name') {
              updatePayload[`slug_${lang}`] = generateSlug(value);
            }
          }
        }
      }
    }

    updatePayload.translated_at = new Date().toISOString();

    // Update product
    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId);

    if (updateError) {
      console.error(`[Batch Import] Translation: Update error for ${productId}`, updateError);
      return false;
    }

    console.log(`[Batch Import] Translation: Successfully translated ${productId}`);
    return true;
  } catch (error) {
    console.error(`[Batch Import] Translation error for ${productId}:`, error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rows, translateAfterImport } = await request.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: '无有效数据' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const progress: ProgressUpdate = {
          total: rows.length,
          current: 0,
          success: 0,
          failed: 0,
          status: 'importing',
          errors: [],
        };

        const importedProductIds: string[] = [];

        // Import products
        for (const row of rows as ImportRow[]) {
          progress.current++;
          progress.currentProduct = row.name;

          // Send progress update
          controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));

          const result = await createProduct(row);

          if (result.success) {
            progress.success++;
            if (result.productId) {
              importedProductIds.push(result.productId);
            }
          } else {
            progress.failed++;
            progress.errors.push({
              row: row._rowIndex,
              message: result.error || '导入失败',
            });
          }
        }

        // Translation phase (if requested)
        if (translateAfterImport && importedProductIds.length > 0) {
          progress.status = 'translating';
          progress.current = 0;
          progress.total = importedProductIds.length;
          progress.currentProduct = undefined;

          controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));

          for (const productId of importedProductIds) {
            progress.current++;

            // Get product name for display
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', productId)
              .single();

            progress.currentProduct = product?.name || productId;
            controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));

            await translateProduct(productId);
          }
        }

        // Complete
        progress.status = 'completed';
        progress.currentProduct = undefined;
        controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('[Batch Import] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '导入服务异常',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}