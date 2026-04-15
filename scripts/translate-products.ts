/**
 * Translate Products Script
 * 
 * Translates product content from English to Chinese, Thai, and Japanese
 * Uses DashScope API (通义千问)
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

async function translateContent(content: Record<string, string>): Promise<Record<string, Record<string, string>> | null> {
  const client = new OpenAI({
    apiKey: DASHSCOPE_API_KEY,
    baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
  });

  const prompt = `Translate the following product content from English to Chinese (zh), Thai (th), and Japanese (ja).

RULES:
1. Return ONLY valid JSON, no markdown
2. Keep product names, brand names, and technical terms transliterated when appropriate
3. For HTML content (rich_description), preserve HTML tags
4. Make translations natural and professional for e-commerce
5. For Chinese (zh), use Simplified Chinese characters

SOURCE CONTENT (English):
${Object.entries(content).map(([k, v]) => `${k}: "${v.replace(/"/g, '\\"')}"`).join('\n')}

Return format (EXACT structure):
{
  "zh": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} },
  "th": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} },
  "ja": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} }
}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen3.5-plus',
      messages: [
        { role: 'system', content: 'You are a professional e-commerce translator. Return only valid JSON, no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const resultText = completion.choices[0].message.content;
    if (!resultText) return null;

    let cleanText = resultText;
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

    return JSON.parse(cleanText.trim());
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
}

async function main() {
  console.log('Fetching products to translate...\n');

  // Fetch products that need translation (not yet translated)
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,sku_code,name,name_en,description,description_en,brand,brand_en,rich_description,rich_description_en,meta_title,meta_title_en,meta_description,meta_description_en,publish_language&publish_language=eq.en&translated_at=is.null&limit=20`, {
    headers: supabaseHeaders
  });

  const products = await response.json();
  console.log(`Found ${products.length} products to translate.\n`);

  for (const product of products) {
    console.log(`Translating: ${product.sku_code || product.id}`);
    console.log(`  EN: ${product.name_en?.substring(0, 50)}...`);

    // Build content to translate from _en fields
    const content: Record<string, string> = {};
    const fields = ['name', 'description', 'brand', 'meta_title', 'meta_description', 'rich_description'];

    for (const field of fields) {
      const value = product[field + '_en'];
      if (value && value.trim()) {
        // For rich_description, truncate if too long
        if (field === 'rich_description' && value.length > 2000) {
          content[field] = value.substring(0, 2000) + '...';
        } else {
          content[field] = value;
        }
      }
    }

    if (Object.keys(content).length === 0) {
      console.log('  No content to translate, skipping.\n');
      continue;
    }

    console.log(`  Translating ${Object.keys(content).length} fields...`);
    
    const translations = await translateContent(content);
    
    if (!translations) {
      console.log('  Translation failed, skipping.\n');
      continue;
    }

    // Build update object
    const updateData: Record<string, any> = {
      translated_at: new Date().toISOString()
    };

    // Chinese -> base fields
    if (translations.zh) {
      for (const [field, value] of Object.entries(translations.zh)) {
        if (value) {
          updateData[field] = value;
          if (field === 'name') {
            updateData['slug'] = generateSlug(value as string);
          }
        }
      }
    }

    // Thai -> _th fields
    if (translations.th) {
      for (const [field, value] of Object.entries(translations.th)) {
        if (value) {
          updateData[`${field}_th`] = value;
          if (field === 'name') {
            updateData['slug_th'] = generateSlug(value as string);
          }
        }
      }
    }

    // Japanese -> _ja fields
    if (translations.ja) {
      for (const [field, value] of Object.entries(translations.ja)) {
        if (value) {
          updateData[`${field}_ja`] = value;
          if (field === 'name') {
            updateData['slug_ja'] = generateSlug(value as string);
          }
        }
      }
    }

    // Update product
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${product.id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updateData)
    });

    if (updateResponse.ok) {
      console.log('  ✓ Translated and saved.\n');
    } else {
      const error = await updateResponse.text();
      console.log(`  ✗ Update failed: ${error}\n`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Translation complete!');
}

main().catch(console.error);