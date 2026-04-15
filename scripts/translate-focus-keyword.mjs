/**
 * 补全 focus_keyword 翻译
 */
import pg from 'pg';
import OpenAI from 'openai';

const DATABASE_URL = 'postgresql://postgres.tvxrgbntiksskywsroax:wpnkpGhM2nj97Sln@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

const LANGUAGE_NAMES = { zh: '中文', en: 'English', th: 'Thai', ja: 'Japanese' };

async function translateKeyword(keyword, targetLang, sourceLang, client) {
  const sourceName = LANGUAGE_NAMES[sourceLang];
  const targetName = LANGUAGE_NAMES[targetLang];
  
  const completion = await client.chat.completions.create({
    model: 'qwen3-coder-plus',
    messages: [
      { role: 'system', content: 'You are a SEO keyword translator. Return ONLY the translated keyword, no explanations. /no_think' },
      { role: 'user', content: `Translate this SEO keyword from ${sourceName} to ${targetName}. Keep it concise (max 5 words). Return only the translated text.\nKeyword: ${keyword}` },
    ],
    temperature: 0.3,
  });

  let result = completion.choices[0].message.content || '';
  result = result.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return result;
}

async function main() {
  const pgClient = new pg.Client({ connectionString: DATABASE_URL });
  await pgClient.connect();

  // 获取需要翻译 focus_keyword 的产品（源语言是英文）
  const { rows: products } = await pgClient.query(
    `SELECT id, sku_code, focus_keyword_en, publish_language FROM products 
     WHERE focus_keyword_en IS NOT NULL AND focus_keyword_en != '' 
     AND deleted_at IS NULL`
  );

  console.log(`Found ${products.length} products needing focus_keyword translation`);

  if (products.length === 0) {
    console.log('All focus_keywords are already translated. Exiting.');
    await pgClient.end();
    return;
  }

  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.AI_API_KEY;
  const aiClient = new OpenAI({
    apiKey,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  });

  let successCount = 0;

  for (const product of products) {
    const sourceLang = 'en'; // 源语言是英文
    const keyword = product.focus_keyword_en;
    
    console.log(`\n[${successCount + 1}/${products.length}] ${product.sku_code || product.id}`);
    console.log(`  Source keyword (EN): ${keyword}`);

    const updates = {};

    // 翻译到其他语言：zh, th, ja
    const targetLangs = ['zh', 'th', 'ja'];
    
    for (const targetLang of targetLangs) {
      try {
        const translated = await translateKeyword(keyword, targetLang, sourceLang, aiClient);
        const field = targetLang === 'zh' ? 'focus_keyword' : `focus_keyword_${targetLang}`;
        updates[field] = translated;
        console.log(`  → ${targetLang}: ${translated}`);
      } catch (err) {
        console.error(`  ❌ ${targetLang} failed: ${err.message}`);
      }
      
      // 小延迟避免限速
      await new Promise(r => setTimeout(r, 200));
    }

    // 更新数据库
    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map(k => `${k} = $${Object.keys(updates).indexOf(k) + 2}`).join(', ');
      const values = [product.id, ...Object.values(updates)];
      
      await pgClient.query(
        `UPDATE products SET ${setClause}, updated_at = NOW() WHERE id = $1`,
        values
      );
      successCount++;
    }
  }

  console.log(`\n=== Done: ${successCount} products updated ===`);
  await pgClient.end();
}

main().catch(err => { console.error('Error:', err); process.exit(1); });