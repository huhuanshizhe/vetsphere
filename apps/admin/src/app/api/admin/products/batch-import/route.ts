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
 * Convert plain text with line breaks to structured HTML format
 * Detects headings, lists, and paragraphs from product description text
 */
function convertToHtmlRichText(text: string): string {
  if (!text) return '';

  // If already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  // Ensure text is a string
  const str = String(text);

  // Split by common line break patterns
  const lines = str.split(/\r?\n/);

  // Common section heading keywords in product descriptions
  const headingKeywords = [
    'product overview', 'overview', 'key features', 'features', 'specifications',
    'product specifications', 'applications', 'how to use', 'package includes',
    'important notes', 'why choose', 'technical details', 'description',
    'benefits', 'warnings', 'cautions', 'storage', 'usage', 'contents',
    'what\'s included', 'warranty', 'dimensions', 'compatibility',
  ];

  function isHeadingLine(line: string, nextLine: string | undefined): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 80) return false;
    // Check if it matches known heading keywords
    const lower = trimmed.toLowerCase();
    if (headingKeywords.some(kw => lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw))) {
      return true;
    }
    // Short line (<=60 chars) that doesn't end with common sentence punctuation
    // and is followed by a non-empty content line
    if (trimmed.length <= 60 && !/[.;,!?:]$/.test(trimmed) && nextLine && nextLine.trim()) {
      // Check if it looks like a title (no lowercase-starting words or very short)
      const words = trimmed.split(/\s+/);
      if (words.length <= 5) return true;
    }
    return false;
  }

  function isListItem(line: string): { type: 'ul' | 'ol'; content: string } | null {
    const trimmed = line.trim();
    // Unordered list: starts with -, *, •, ▪
    const ulMatch = trimmed.match(/^[-*•▪]\s+(.+)/);
    if (ulMatch) return { type: 'ul', content: ulMatch[1] };
    // Ordered list: starts with "1.", "2.", etc.
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
    if (olMatch) return { type: 'ol', content: olMatch[2] };
    return null;
  }

  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Check for heading
    if (isHeadingLine(trimmed, lines[i + 1])) {
      htmlParts.push(`<h2>${trimmed}</h2>`);
      i++;
      continue;
    }

    // Check for list items - collect consecutive list items
    const listItem = isListItem(trimmed);
    if (listItem) {
      const items: string[] = [];
      let listType = listItem.type;
      items.push(listItem.content);
      i++;
      while (i < lines.length) {
        const nextItem = isListItem(lines[i].trim());
        if (nextItem) {
          items.push(nextItem.content);
          i++;
        } else if (!lines[i].trim()) {
          i++;
          break;
        } else {
          break;
        }
      }
      const tag = listType === 'ol' ? 'ol' : 'ul';
      htmlParts.push(`<${tag}>${items.map(item => `<li>${item}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Regular paragraph
    htmlParts.push(`<p>${trimmed}</p>`);
    i++;
  }

  return htmlParts.join('') || `<p>${str}</p>`;
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
      // Specifications (stored as JSONB) - English source goes to _en column
      specifications: {},  // Empty - will be translated to Chinese
      specifications_en: specifications,  // English specs from Excel
      // FAQs - English source goes to _en column
      faq: null,  // Empty - will be translated to Chinese
      faq_en: row.faqs.length > 0 ? row.faqs : null,  // English FAQs from Excel
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
      return true;
    }

    // Extract JSONB fields (specifications, faq)
    const sourceSpecs = product.specifications_en;
    const hasSpecs = sourceSpecs && typeof sourceSpecs === 'object' && Object.keys(sourceSpecs).length > 0;
    const sourceFaq = product.faq_en;
    const hasFaq = Array.isArray(sourceFaq) && sourceFaq.length > 0;

    console.log(`[Batch Import] Translation: Translating ${Object.keys(content).length} fields, specs:${hasSpecs}, faq:${hasFaq} for ${productId}`);

    // Create AI client with undici fetch
    const { fetch } = require('undici');
    const baseURL = process.env.AI_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1';
    const model = process.env.AI_MODEL || 'qwen3-coder-plus';
    const client = new OpenAI({
      apiKey,
      baseURL,
      fetch,
      timeout: 180000,
      maxRetries: 3,
    });

    // Target languages: Chinese, Thai, Japanese (sequential for stability)
    const targetLangs: ('zh' | 'th' | 'ja')[] = ['zh', 'th', 'ja'];
    const languageNames: Record<string, string> = { zh: '中文', th: 'ภาษาไทย', ja: '日本語' };

    const updatePayload: Record<string, any> = {};

    for (const lang of targetLangs) {
      try {
        // Translate text fields
        const contentEntries = Object.entries(content)
          .map(([key, value]) => `${key}: "${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`)
          .join('\n');

        const prompt = `Translate the following product content from English to ${languageNames[lang]}.

RULES:
1. Return ONLY valid JSON
2. Translate ALL fields to ${languageNames[lang]}
3. Keep product names, brand names, and technical terms transliterated or in original form when appropriate
4. For HTML content (rich_description), preserve HTML tags in the translation
5. Make translations natural and professional for e-commerce

SOURCE CONTENT (English):
${contentEntries}

Return format (EXACT JSON, no extra text):
{ ${Object.keys(content).map(k => `"${k}": "translated value"`).join(', ')} }`;

        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are a professional e-commerce translator. Return only valid JSON. /no_think' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        });

        const resultText = completion.choices[0].message.content;
        if (!resultText) throw new Error(`No translation result for ${languageNames[lang]}`);

        let cleanText = resultText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

        const translated = JSON.parse(cleanText.trim());

        for (const [field, value] of Object.entries(translated as Record<string, string>)) {
          if (value) {
            if (lang === 'zh') {
              updatePayload[field] = value;
              if (field === 'name') updatePayload['slug'] = generateSlug(value);
            } else {
              updatePayload[`${field}_${lang}`] = value;
              if (field === 'name') updatePayload[`slug_${lang}`] = generateSlug(value);
            }
          }
        }

        // Translate specifications (JSONB)
        if (hasSpecs) {
          try {
            const specsPrompt = `Translate these product specifications from English to ${languageNames[lang]}.
RULES: Return ONLY valid JSON object. Translate BOTH keys and values. Keep units/numbers accurate.
SOURCE: ${JSON.stringify(sourceSpecs, null, 2)}
Return EXACT JSON object, no extra text.`;
            const specsCompletion = await client.chat.completions.create({
              model,
              messages: [
                { role: 'system', content: 'You are a professional translator. Return only valid JSON. /no_think' },
                { role: 'user', content: specsPrompt },
              ],
              temperature: 0.2,
            });
            let specsText = (specsCompletion.choices[0].message.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            if (specsText.startsWith('```json')) specsText = specsText.slice(7);
            else if (specsText.startsWith('```')) specsText = specsText.slice(3);
            if (specsText.endsWith('```')) specsText = specsText.slice(0, -3);
            const specsKey = lang === 'zh' ? 'specifications' : `specifications_${lang}`;
            updatePayload[specsKey] = JSON.parse(specsText.trim());
            console.log(`[Batch Import] Specs to ${languageNames[lang]} done`);
          } catch (e) {
            console.error(`[Batch Import] Specs translation failed for ${lang}:`, e instanceof Error ? e.message : e);
          }
        }

        // Translate FAQ (JSONB)
        if (hasFaq) {
          try {
            const faqPrompt = `Translate these FAQ items from English to ${languageNames[lang]}.
RULES: Return ONLY valid JSON array. Translate both "question" and "answer" fields.
SOURCE: ${JSON.stringify(sourceFaq, null, 2)}
Return EXACT JSON array [{"question":"...","answer":"..."},...], no extra text.`;
            const faqCompletion = await client.chat.completions.create({
              model,
              messages: [
                { role: 'system', content: 'You are a professional translator. Return only valid JSON array. /no_think' },
                { role: 'user', content: faqPrompt },
              ],
              temperature: 0.3,
            });
            let faqText = (faqCompletion.choices[0].message.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            if (faqText.startsWith('```json')) faqText = faqText.slice(7);
            else if (faqText.startsWith('```')) faqText = faqText.slice(3);
            if (faqText.endsWith('```')) faqText = faqText.slice(0, -3);
            const faqKey = lang === 'zh' ? 'faq' : `faq_${lang}`;
            updatePayload[faqKey] = JSON.parse(faqText.trim());
            console.log(`[Batch Import] FAQ to ${languageNames[lang]} done`);
          } catch (e) {
            console.error(`[Batch Import] FAQ translation failed for ${lang}:`, e instanceof Error ? e.message : e);
          }
        }

        console.log(`[Batch Import] Translation to ${languageNames[lang]} completed`);
      } catch (langError) {
        console.error(`[Batch Import] Translation failed for ${languageNames[lang]}:`, langError instanceof Error ? langError.message : langError);
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      console.error(`[Batch Import] Translation: All languages failed for ${productId}`);
      return false;
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