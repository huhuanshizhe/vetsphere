/**
 * DashScope Translation Service
 * 使用阿里云通义千问进行课程内容多语言翻译
 */

import type { Course } from '../types';

// 支持的语言
export type SupportedLanguage = 'en' | 'zh' | 'th' | 'ja';

// 语言名称映射
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: '中文',
  th: 'ภาษาไทย',
  ja: '日本語',
};

// publishLanguage 到语言代码的映射
export const PUBLISH_LANG_TO_CODE: Record<string, SupportedLanguage> = {
  'zh': 'zh', 'en': 'en', 'ja': 'ja', 'th': 'th',
  '中文': 'zh', 'English': 'en', '日本語': 'ja', 'ภาษาไทย': 'th',
};

// === 固定汇率配置 (基准: 1 USD) ===
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  CNY: 7.2,      // 1 USD = 7.2 CNY
  JPY: 150,      // 1 USD = 150 JPY
  THB: 35,       // 1 USD = 35 THB
};

// 币种符号
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CNY: '¥',
  JPY: '¥',
  THB: '฿',
};

/**
 * 转换价格到目标币种
 * @param price 原始价格
 * @param fromCurrency 原始币种
 * @param toCurrency 目标币种
 * @returns 转换后的价格（取整）
 */
export function convertPrice(price: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return price;
  
  // 先转换为 USD
  const priceInUSD = price / (EXCHANGE_RATES[fromCurrency] || 1);
  // 再转换为目标币种
  const targetPrice = priceInUSD * (EXCHANGE_RATES[toCurrency] || 1);
  
  // 取整处理（根据币种决定精度）
  if (toCurrency === 'JPY') {
    return Math.round(targetPrice); // 日元无小数
  }
  return Math.round(targetPrice); // 其他币种也取整，方便展示
}

/**
 * 生成所有币种的价格
 * @param price 原始价格
 * @param currency 原始币种
 * @returns 所有币种价格
 */
export function generateAllPrices(price: number, currency: string): {
  price_cny: number;
  price_usd: number;
  price_jpy: number;
  price_thb: number;
} {
  return {
    price_cny: convertPrice(price, currency, 'CNY'),
    price_usd: convertPrice(price, currency, 'USD'),
    price_jpy: convertPrice(price, currency, 'JPY'),
    price_thb: convertPrice(price, currency, 'THB'),
  };
}

/**
 * 根据语言获取对应币种的价格
 * @param course 课程数据
 * @param language 当前语言
 * @returns { price: number, currency: string, symbol: string }
 */
export function getLocalizedPrice(
  course: { 
    price: number; 
    currency: string;
    price_cny?: number | null;
    price_usd?: number | null;
    price_jpy?: number | null;
    price_thb?: number | null;
  },
  language: string
): { price: number; currency: string; symbol: string } {
  // 语言到币种的映射
  const langToCurrency: Record<string, string> = {
    zh: 'CNY',
    en: 'USD',
    ja: 'JPY',
    th: 'THB',
  };

  const targetCurrency = langToCurrency[language] || 'USD';
  const symbol = CURRENCY_SYMBOLS[targetCurrency] || '$';

  // 尝试获取预生成的价格
  const priceFields: Record<string, number | null | undefined> = {
    CNY: course.price_cny,
    USD: course.price_usd,
    JPY: course.price_jpy,
    THB: course.price_thb,
  };

  const preGeneratedPrice = priceFields[targetCurrency];
  
  if (preGeneratedPrice != null) {
    return { price: preGeneratedPrice, currency: targetCurrency, symbol };
  }

  // 如果没有预生成的价格，使用原始价格并实时转换
  const convertedPrice = convertPrice(course.price, course.currency, targetCurrency);
  return { price: convertedPrice, currency: targetCurrency, symbol };
}

// 简化的翻译内容结构（扁平化，避免 AI 破坏嵌套结构）
interface FlatTranslationContent {
  title: string;
  description: string;
  instructorName: string;
  instructorTitle: string;
  instructorBio: string;
  locationCity: string;
  locationVenue: string;
  locationAddress: string;
  locationCountry: string;
  locationRegion: string;
  // agenda activities 作为简单字符串数组
  activities: string[];
  // services 字段
  servicesDirections: string;
  servicesNotes: string;
}

/**
 * 从课程提取扁平化的翻译内容
 */
function extractFlatContent(course: Course): FlatTranslationContent {
  const activities: string[] = [];
  if (course.agenda) {
    for (const day of course.agenda) {
      if (day.items) {
        for (const item of day.items) {
          if (item.activity) {
            activities.push(item.activity);
          }
        }
      }
    }
  }

  // 提取 services 字段
  const services = (course as any).services || {};

  return {
    title: course.title || '',
    description: course.description || '',
    instructorName: course.instructor?.name || '',
    instructorTitle: course.instructor?.title || '',
    instructorBio: course.instructor?.bio || '',
    locationCity: course.location?.city || '',
    locationVenue: course.location?.venue || '',
    locationAddress: course.location?.address || '',
    locationCountry: course.location?.country || '',
    locationRegion: course.location?.region || '',
    activities,
    servicesDirections: services.directions || '',
    servicesNotes: services.notes || '',
  };
}

/**
 * 调用 DashScope API 进行翻译
 */
async function translateWithDashScope(
  content: FlatTranslationContent,
  targetLangs: SupportedLanguage[],
  apiKey: string
): Promise<Record<SupportedLanguage, FlatTranslationContent>> {
  const targetLanguageNames = targetLangs.map(l => LANGUAGE_NAMES[l]).join(', ');

  const prompt = `Translate this JSON to ${targetLangs.length} languages: ${targetLanguageNames}.

RULES:
1. Return ONLY valid JSON
2. Each language key contains the same structure with translated values
3. The "activities" array MUST remain an array of strings
4. Keep proper names unchanged or transliterate appropriately

SOURCE:
${JSON.stringify(content, null, 2)}

Return format (EXACT structure required):
{
  "${targetLangs[0]}": { "title": "...", "description": "...", "instructorName": "...", "instructorTitle": "...", "instructorBio": "...", "locationCity": "...", "locationVenue": "...", "locationAddress": "...", "locationCountry": "...", "locationRegion": "...", "activities": ["...", "..."], "servicesDirections": "...", "servicesNotes": "..." },
  "${targetLangs[1]}": { ... },
  "${targetLangs[2]}": { ... },
  "${targetLangs[3]}": { ... }
}`;

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-max',
      messages: [
        { role: 'system', content: 'You are a translator. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DashScope API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;

  if (!resultText) {
    throw new Error('No translation result from DashScope');
  }

  const result = JSON.parse(resultText);
  console.log('DashScope returned languages:', Object.keys(result));
  
  return result as Record<SupportedLanguage, FlatTranslationContent>;
}

/**
 * 将翻译结果合并到课程数据
 */
function mergeTranslations(
  course: Course,
  translations: Record<SupportedLanguage, FlatTranslationContent>
): Partial<Course> {
  const updates: Partial<Course> = {
    translationsComplete: true,
    translatedAt: new Date().toISOString(),
  };

  // 合并所有语言的翻译
  for (const [lang, content] of Object.entries(translations)) {
    if (!content) continue;

    // 标题和描述
    if (content.title) (updates as Record<string, unknown>)[`title_${lang}`] = content.title;
    if (content.description) (updates as Record<string, unknown>)[`description_${lang}`] = content.description;

    // 讲师信息
    if (!updates.instructor) {
      updates.instructor = { ...course.instructor };
    }
    if (content.instructorName) (updates.instructor as Record<string, unknown>)[`name_${lang}`] = content.instructorName;
    if (content.instructorTitle) (updates.instructor as Record<string, unknown>)[`title_${lang}`] = content.instructorTitle;
    if (content.instructorBio) (updates.instructor as Record<string, unknown>)[`bio_${lang}`] = content.instructorBio;

    // 地点信息
    if (!updates.location) {
      updates.location = { ...course.location };
    }
    if (content.locationCountry) (updates.location as Record<string, unknown>)[`country_${lang}`] = content.locationCountry;
    if (content.locationRegion) (updates.location as Record<string, unknown>)[`region_${lang}`] = content.locationRegion;
    if (content.locationCity) (updates.location as Record<string, unknown>)[`city_${lang}`] = content.locationCity;
    if (content.locationVenue) (updates.location as Record<string, unknown>)[`venue_${lang}`] = content.locationVenue;
    if (content.locationAddress) (updates.location as Record<string, unknown>)[`address_${lang}`] = content.locationAddress;
  }

  // 合并 agenda 活动翻译
  if (course.agenda && course.agenda.length > 0) {
    let activityIndex = 0;
    updates.agenda = course.agenda.map((day) => {
      const updatedDay: Record<string, unknown> = { ...day };

      // 翻译每个活动项目
      updatedDay.items = (day.items || []).map((item) => {
        const updatedItem: Record<string, unknown> = { ...item };

        for (const [lang, content] of Object.entries(translations)) {
          if (content?.activities && Array.isArray(content.activities)) {
            const translatedActivity = content.activities[activityIndex];
            if (translatedActivity) {
              updatedItem[`activity_${lang}`] = translatedActivity;
            }
          }
        }

        activityIndex++;
        return updatedItem;
      });

      return updatedDay;
    }) as typeof course.agenda;
  }

  // 合并 services 翻译
  const existingServices = (course as any).services || {};
  if (existingServices.directions || existingServices.notes) {
    const updatedServices: Record<string, unknown> = { ...existingServices };
    
    for (const [lang, content] of Object.entries(translations)) {
      if (content?.servicesDirections) {
        updatedServices[`directions_${lang}`] = content.servicesDirections;
      }
      if (content?.servicesNotes) {
        updatedServices[`notes_${lang}`] = content.servicesNotes;
      }
    }
    
    (updates as any).services = updatedServices;
  }

  return updates;
}

/**
 * 完整的课程翻译流程
 */
export async function translateCourse(
  course: Course,
  apiKey: string
): Promise<Partial<Course> & { _debug?: unknown }> {
  console.log('Starting translation for course:', course.id);

  // 1. 提取扁平化内容
  const content = extractFlatContent(course);
  console.log('Extracted activities count:', content.activities.length);

  // 2. 翻译到所有4种语言
  const allLangs: SupportedLanguage[] = ['en', 'zh', 'th', 'ja'];
  const translations = await translateWithDashScope(content, allLangs, apiKey);

  // 3. 合并翻译结果
  const updates = mergeTranslations(course, translations);

  // 4. 添加调试信息
  const returnedLangs = Object.keys(translations);
  (updates as any)._debug = {
    returnedLangs,
    activitiesPerLang: returnedLangs.reduce((acc, lang) => {
      const t = translations[lang as SupportedLanguage];
      acc[lang] = Array.isArray(t?.activities) ? t.activities.length : 0;
      return acc;
    }, {} as Record<string, number>),
  };

  return updates;
}

// 保留旧接口以兼容
export interface CourseTranslationPayload {
  title: string;
  description: string;
  instructor: { name: string; title: string; credentials: string[]; bio: string; };
  location: { country?: string; region?: string; city: string; venue: string; address: string; };
  agenda: { day: string; date: string; items: { time: string; activity: string; }[]; }[];
}

export function extractTranslatableContent(course: Course, sourceLang: SupportedLanguage): CourseTranslationPayload {
  return {
    title: course.title || '',
    description: course.description || '',
    instructor: {
      name: course.instructor?.name || '',
      title: course.instructor?.title || '',
      credentials: course.instructor?.credentials || [],
      bio: course.instructor?.bio || '',
    },
    location: {
      country: course.location?.country,
      region: course.location?.region,
      city: course.location?.city || '',
      venue: course.location?.venue || '',
      address: course.location?.address || '',
    },
    agenda: (course.agenda || []).map(day => ({
      day: day.day || '',
      date: day.date || '',
      items: (day.items || []).map(item => ({
        time: item.time || '',
        activity: item.activity || '',
      })),
    })),
  };
}
