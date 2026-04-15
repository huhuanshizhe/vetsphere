/**
 * Fix Remaining Translation Issues
 * 1. Translate rich_description to Chinese, Thai, Japanese
 * 2. Translate specifications
 */

import OpenAI from 'openai';

const SUPABASE_URL = 'https://tvxrgbntiksskywsroax.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg0NTcxMiwiZXhwIjoyMDg2NDIxNzEyfQ.4MJZdR7l2OmAtW1gXpXvJtk5LFqXN7Y8kn7NiFtzsc8';
const DASHSCOPE_API_KEY = 'sk-sp-befc667877a94f5cb8d137bf8ac57ad9';

const supabaseHeaders = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json'
};

async function translateText(text: string, targetLang: 'zh' | 'th' | 'ja'): Promise<string | null> {
  if (!text || text.trim().length === 0) return null;
  
  const client = new OpenAI({
    apiKey: DASHSCOPE_API_KEY,
    baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
  });

  const langNames = { zh: '中文 (Simplified Chinese)', th: 'ภาษาไทย (Thai)', ja: '日本語 (Japanese)' };

  // Truncate if too long
  const maxLen = 2500;
  const truncated = text.length > maxLen ? text.substring(0, maxLen) + '...' : text;

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen3.5-plus',
      messages: [
        { 
          role: 'system', 
          content: `You are a professional translator for e-commerce product content. Translate to ${langNames[targetLang]}. 
- Preserve ALL HTML tags like <p>, <strong>, <ul>, <li>, <h2> etc.
- For Chinese: use Simplified Chinese characters.
- Return ONLY the translated text, no explanations.` 
        },
        { 
          role: 'user', 
          content: truncated 
        },
      ],
      temperature: 0.3,
    });

    return completion.choices[0].message.content?.trim() || null;
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
}

async function main() {
  console.log('=== Fixing Remaining Translations ===\n');

  // Get products that need rich_description translation
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=id,sku_code,name_en,rich_description_en,rich_description,rich_description_th,rich_description_ja,publish_language&publish_language=eq.en&limit=10`,
    { headers: supabaseHeaders }
  );

  const products = await response.json();
  console.log(`Found ${products.length} products to process.\n`);

  let fixedCount = 0;

  for (const product of products) {
    console.log(`Processing: ${product.sku_code || product.id}`);
    
    if (!product.rich_description_en) {
      console.log('  No rich_description_en, skipping.\n');
      continue;
    }

    const updateData: Record<string, any> = {};
    let needsUpdate = false;

    // Check if Chinese rich_description needs translation
    if (!product.rich_description || product.rich_description === product.rich_description_en) {
      console.log('  Translating rich_description to Chinese...');
      const zhTranslation = await translateText(product.rich_description_en, 'zh');
      if (zhTranslation) {
        updateData.rich_description = zhTranslation;
        needsUpdate = true;
        console.log(`  ✓ Chinese: ${zhTranslation.substring(0, 50)}...`);
      }
    }

    // Check Thai
    if (!product.rich_description_th) {
      console.log('  Translating rich_description to Thai...');
      const thTranslation = await translateText(product.rich_description_en, 'th');
      if (thTranslation) {
        updateData.rich_description_th = thTranslation;
        needsUpdate = true;
        console.log(`  ✓ Thai: ${thTranslation.substring(0, 50)}...`);
      }
    }

    // Check Japanese
    if (!product.rich_description_ja) {
      console.log('  Translating rich_description to Japanese...');
      const jaTranslation = await translateText(product.rich_description_en, 'ja');
      if (jaTranslation) {
        updateData.rich_description_ja = jaTranslation;
        needsUpdate = true;
        console.log(`  ✓ Japanese: ${jaTranslation.substring(0, 50)}...`);
      }
    }

    if (needsUpdate) {
      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${product.id}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(updateData)
      });

      if (updateResponse.ok) {
        console.log('  ✓ Saved successfully.\n');
        fixedCount++;
      } else {
        const error = await updateResponse.text();
        console.log(`  ✗ Save failed: ${error}\n`);
      }
    } else {
      console.log('  No translation needed.\n');
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('========================================');
  console.log(`Fixed ${fixedCount} products.`);
}

main().catch(console.error);