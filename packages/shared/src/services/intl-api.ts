/**
 * INTL Site Views API
 * 
 * All INTL frontend data fetching functions.
 * Reads from overlay tables (course_site_views, product_site_views, etc.)
 * JOINed with base tables for resolved display data.
 */
import { supabase, getImageUrl } from './supabase';

const SITE_CODE = 'intl';

// ============================================
// Types
// ============================================

export interface IntlCourse {
  id: string;
  course_id: string;
  site_code: string;
  // Site view overrides
  title: string;
  slug: string;
  summary: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  pricing_mode: string;
  currency_code: string | null;
  display_order: number;
  is_featured: boolean;
  cta_config: Record<string, any>;
  seo_title: string | null;
  seo_description: string | null;
  publish_status: string;
  published_at: string | null;
  // Base course fields
  base_title: string;
  base_slug: string;
  specialty: string;
  level: string;
  format: string;
  duration_minutes: number | null;
  cover_image_url: string | null;
  description: string | null;
  target_audience: string | null;
  is_free: boolean;
  // Multi-currency prices
  price_cny: number | null;
  price_usd: number | null;
  price_jpy: number | null;
  price_thb: number | null;
  // Localized price for current locale
  price: number | null;
  currency: string | null;
  enrollment_count: number;
  avg_rating: number | null;
  growth_tracks: string[];
  // Date fields
  start_date: string | null;
  end_date: string | null;
  enrollment_deadline: string | null;
  // Location fields
  location_city: string | null;
  location_venue: string | null;
  location_address: string | null;
  location_country: string | null;
  location_region: string | null;
  // Teaching languages
  teaching_languages: string[];
  // Instructors (loaded separately)
  instructors?: IntlInstructor[];
  // Equipment count
  equipment_count?: number;
  // Localized instructor fields
  instructor_name?: string;
  instructor_title?: string;
  instructor_bio?: string;
  instructor_avatar_url?: string;
}

export interface IntlProduct {
  id: string;
  product_id: string;
  site_code: string;
  // Site view overrides
  display_name: string;
  slug: string;
  summary: string | null;
  pricing_mode: 'fixed' | 'inquiry' | 'inherit' | 'custom';
  display_price: number | null;
  currency_code: string | null;
  purchase_type: 'direct' | 'quote' | null;
  display_order: number;
  is_featured: boolean;
  display_tags: string[];
  recommendation_reason: string | null;
  cta_config: Record<string, any>;
  seo_title: string | null;
  seo_description: string | null;
  publish_status: string;
  published_at: string | null;
  // Base product fields
  base_name: string;
  base_slug: string;
  brand: string | null;
  specialty: string | null;
  scene_code: string | null;
  clinical_category: string | null;
  cover_image_url: string | null;
  description: string | null;
  rich_description: string | null;
  specs: Record<string, any>;
  price_min: number | null;
  price_max: number | null;
  // Base pricing mode from products table
  base_pricing_mode?: 'fixed' | 'inquiry';
  base_price?: number | null;
  stock_quantity?: number;
  // Supplier info
  supplier_name?: string;
  supplier_id?: string;
  // 是否有多规格变体
  has_variants?: boolean;
  // Related training
  related_courses?: IntlCourse[];
  // SKU aggregated prices (min selling price across all SKUs for each currency)
  sku_price_usd_min?: number | null;
  sku_price_jpy_min?: number | null;
  sku_price_thb_min?: number | null;
  sku_price_cny_min?: number | null;
  // SKU max prices (for price range display)
  sku_price_usd_max?: number | null;
  sku_price_jpy_max?: number | null;
  sku_price_thb_max?: number | null;
  sku_price_cny_max?: number | null;
}

export interface IntlInstructor {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  avatar_url: string | null;
  credentials: string | null;
  role?: string;
}

export interface IntlClinicProgram {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  target_clinic_type: string | null;
  included_training_scope: string | null;
  included_equipment_scope: string | null;
  support_level: string | null;
  expected_outcome: string | null;
  display_order: number;
  publish_status: string;
}

// ============================================
// Course Site Views
// ============================================

// 语言到字段的映射
const localeToTitleField: Record<string, string> = {
  'en': 'title_en',
  'zh': 'title_zh',
  'th': 'title_th',
  'ja': 'title_ja',
};

const localeToDescField: Record<string, string> = {
  'en': 'description_en',
  'zh': 'description_zh',
  'th': 'description_th',
  'ja': 'description_ja',
};

const localeToTargetAudienceField: Record<string, string> = {
  'en': 'target_audience',
  'zh': 'target_audience_zh',
  'th': 'target_audience',
  'ja': 'target_audience',
};

// 语言到价格和货币的映射
const localeToPriceConfig: Record<string, { priceField: string; currency: string }> = {
  'en': { priceField: 'price_usd', currency: 'USD' },
  'zh': { priceField: 'price_cny', currency: 'CNY' },
  'th': { priceField: 'price_thb', currency: 'THB' },
  'ja': { priceField: 'price_jpy', currency: 'JPY' },
};

// 获取本地化的 JSONB 字段值
function getLocalizedJsonbValue(obj: any, baseField: string, locale: string): string {
  if (!obj) return '';
  const localizedField = `${baseField}_${locale}`;
  return obj[localizedField] || obj[baseField] || '';
}

function mapCourseRow(sv: any, locale: string = 'en'): IntlCourse {
  const base = sv.courses || {};
  // 解析 location JSONB 对象
  const location = base.location || {};
  const instructor = base.instructor || {};

  // 根据语言选择对应的标题和描述
  const titleField = localeToTitleField[locale] || 'title_en';
  const descField = localeToDescField[locale] || 'description_en';
  const targetAudienceField = localeToTargetAudienceField[locale] || 'target_audience';

  const localizedTitle = base[titleField] || base.title_en || base.title || '';
  const localizedDesc = base[descField] || base.description_en || base.description || '';
  const localizedTargetAudience = base[targetAudienceField] || base.target_audience || '';

  // 本地化的 location 字段
  const localizedLocation = {
    city: getLocalizedJsonbValue(location, 'city', locale),
    venue: getLocalizedJsonbValue(location, 'venue', locale),
    address: getLocalizedJsonbValue(location, 'address', locale),
    country: getLocalizedJsonbValue(location, 'country', locale),
    region: getLocalizedJsonbValue(location, 'region', locale),
  };

  return {
    id: sv.id,
    course_id: sv.course_id,
    site_code: sv.site_code,
    title: sv.title_override || localizedTitle,
    slug: sv.slug_override || base.slug || sv.course_id,
    summary: sv.summary_override || base.subtitle || localizedDesc,
    hero_title: sv.hero_title_override,
    hero_subtitle: sv.hero_subtitle_override,
    pricing_mode: sv.pricing_mode || 'inherit',
    currency_code: sv.currency_code,
    display_order: sv.display_order || 0,
    is_featured: sv.is_featured || false,
    cta_config: sv.cta_config_json || {},
    seo_title: sv.seo_title,
    seo_description: sv.seo_description,
    publish_status: sv.publish_status,
    published_at: sv.published_at,
    // Base
    base_title: base.title || '',
    base_slug: base.slug || '',
    specialty: base.specialty || '',
    level: base.level || '',
    format: base.format || 'workshop',
    duration_minutes: base.duration_minutes,
    cover_image_url: getImageUrl(base.cover_image_url || base.image_url) ?? null,
    description: localizedDesc,
    target_audience: localizedTargetAudience,
    is_free: base.is_free || false,
    // Multi-currency prices
    price_cny: base.price_cny,
    price_usd: base.price_usd,
    price_jpy: base.price_jpy,
    price_thb: base.price_thb,
    // Localized price for current locale
    price: base[localeToPriceConfig[locale]?.priceField] || base.price_usd || base.price_cny || null,
    currency: localeToPriceConfig[locale]?.currency || 'USD',
    enrollment_count: base.enrollment_count || 0,
    avg_rating: base.avg_rating,
    growth_tracks: base.growth_tracks || [],
    // Date fields
    start_date: base.start_date || null,
    end_date: base.end_date || null,
    enrollment_deadline: base.enrollment_deadline || null,
    // Location fields (localized)
    location_city: localizedLocation.city || null,
    location_venue: localizedLocation.venue || null,
    location_address: localizedLocation.address || null,
    location_country: localizedLocation.country || null,
    location_region: localizedLocation.region || null,
    // Teaching languages
    teaching_languages: base.teaching_languages || [],
    // Instructor (localized)
    instructor_name: getLocalizedJsonbValue(instructor, 'name', locale),
    instructor_title: getLocalizedJsonbValue(instructor, 'title', locale),
    instructor_bio: getLocalizedJsonbValue(instructor, 'bio', locale),
    instructor_avatar_url: instructor.imageUrl || instructor.avatar_url || null,
  };
}

/** Get published INTL courses list */
export async function getIntlCourses(options?: {
  featured?: boolean;
  specialty?: string;
  level?: string;
  format?: string;
  limit?: number;
  offset?: number;
  locale?: string;
}): Promise<{ items: IntlCourse[]; total: number }> {
  const locale = options?.locale || 'en';

  let query = supabase
    .from('course_site_views')
    .select(`
      *,
      courses!inner (
        id, slug, title, subtitle, description,
        title_en, title_zh, title_th, title_ja,
        description_en, description_zh, description_th, description_ja,
        target_audience, target_audience_zh,
        specialty, level, format, duration_minutes,
        cover_image_url, image_url,
        is_free, price_cny, price_usd, price_jpy, price_thb,
        enrollment_count, avg_rating, growth_tracks,
        status, end_date, location, instructor
      )
    `, { count: 'exact' })
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

  // 过滤已过期课程（end_date 为空或未过期的课程才显示）
  const today = new Date().toISOString().split('T')[0];
  query = query.or(`end_date.is.null,end_date.gte.${today}`, { foreignTable: 'courses' });

  if (options?.featured) {
    query = query.eq('is_featured', true);
  }
  if (options?.specialty) {
    query = query.eq('courses.specialty', options.specialty);
  }
  if (options?.level) {
    query = query.eq('courses.level', options.level);
  }
  if (options?.format) {
    query = query.eq('courses.format', options.format);
  }

  query = query.order('display_order').order('published_at', { ascending: false });

  if (options?.limit) {
    const offset = options.offset || 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Failed to fetch INTL courses:', error);
    return { items: [], total: 0 };
  }

  return {
    items: (data || []).map(row => mapCourseRow(row, locale)),
    total: count || 0,
  };
}

/** Get single INTL course by slug or course_id */
export async function getIntlCourseBySlug(slugOrId: string, locale: string = 'en'): Promise<IntlCourse | null> {
  // Try slug_override first, then course_id
  const { data, error } = await supabase
    .from('course_site_views')
    .select(`
      *,
      courses!inner (
        id, slug, title, subtitle, description,
        title_en, title_zh, title_th, title_ja,
        description_en, description_zh, description_th, description_ja,
        target_audience, target_audience_zh,
        specialty, level, format, duration_minutes,
        cover_image_url, image_url,
        is_free, price_cny, price_usd, price_jpy, price_thb,
        enrollment_count, avg_rating, growth_tracks,
        status, total_hours,
        start_date, end_date, enrollment_deadline,
        location, instructor, teaching_languages
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .or(`slug_override.eq.${slugOrId},course_id.eq.${slugOrId}`)
    .single();

  if (error || !data) return null;
  return mapCourseRow(data, locale);
}

/** Get course chapters for a given course_id */
export async function getIntlCourseChapters(courseId: string) {
  const { data } = await supabase
    .from('course_chapters')
    .select('id, title, description, duration_minutes, is_free_preview, display_order')
    .eq('course_id', courseId)
    .order('display_order');
  return data || [];
}

/** Get course agenda/schedule for a given course_id (from courses.agenda JSONB) */
export async function getIntlCourseAgenda(courseId: string, locale: string = 'en') {
  const { data } = await supabase
    .from('courses')
    .select('agenda')
    .eq('id', courseId)
    .single();

  if (!data?.agenda || !Array.isArray(data.agenda)) return [];

  // Convert nested agenda format to flat array for display
  const agendaItems: any[] = [];
  data.agenda.forEach((day: any, dayIndex: number) => {
    if (day.items && Array.isArray(day.items)) {
      day.items.forEach((item: any, itemIndex: number) => {
        // 获取本地化的活动内容
        const localizedActivity = item[`activity_${locale}`] || item.activity || item.activity_en || item.activity_zh || '';
        agendaItems.push({
          id: `${dayIndex}-${itemIndex}`,
          day_number: dayIndex + 1,
          session_time: item.time || '',
          title: localizedActivity,
          description: '',
          display_order: itemIndex,
        });
      });
    }
  });
  return agendaItems;
}

/** Get course services (meals, accommodation, etc.) for a given course_id (from courses.services JSONB) */
export async function getIntlCourseServices(courseId: string, locale: string = 'en') {
  const { data } = await supabase
    .from('courses')
    .select('services')
    .eq('id', courseId)
    .single();

  if (!data?.services) return [];

  const services = data.services;
  const localizedServices: any[] = [];

  // 处理服务数组或对象格式
  const servicesArray = Array.isArray(services) ? services : [];

  // Map services to display format with localization
  servicesArray.forEach((svc: any, index: number) => {
    const localizedDesc = svc[`description_${locale}`] || svc.description || '';
    localizedServices.push({
      id: `svc-${index}`,
      service_type: svc.type || 'other',
      is_included: svc.included !== false,
      description: localizedDesc,
      display_order: index,
    });
  });

  return localizedServices;
}

/** Get course instructors for a given course_id */
export async function getIntlCourseInstructors(courseId: string, locale: string = 'en'): Promise<IntlInstructor[]> {
  const { data } = await supabase
    .from('course_instructors')
    .select(`
      role,
      instructor:instructors (id, name, title, bio, avatar_url, credentials, name_en, name_zh, name_th, name_ja, title_en, title_zh, title_th, title_ja, bio_en, bio_zh, bio_th, bio_ja)
    `)
    .eq('course_id', courseId);

  return (data || []).map((ci: any) => {
    const instructor = ci.instructor || {};
    // 获取本地化的讲师信息
    const localizedName = instructor[`name_${locale}`] || instructor.name || '';
    const localizedTitle = instructor[`title_${locale}`] || instructor.title || '';
    const localizedBio = instructor[`bio_${locale}`] || instructor.bio || '';

    return {
      id: instructor.id,
      name: localizedName,
      title: localizedTitle,
      bio: localizedBio,
      avatar_url: instructor.avatar_url,
      credentials: instructor.credentials,
      role: ci.role,
    };
  });
}

// ============================================
// Product Site Views
// ============================================

function mapProductRow(sv: any, locale: string = 'en'): IntlProduct {
  const base = sv.products || {};
  
  // Get localized name based on locale
  const getLocalizedName = () => {
    if (sv.display_name) return sv.display_name;
    if (locale === 'en' && base.name_en) return base.name_en;
    if (locale === 'ja' && base.name_ja) return base.name_ja;
    if (locale === 'th' && base.name_th) return base.name_th;
    return base.name || sv.product_id;
  };
  
  // Get localized summary/description
  const getLocalizedSummary = () => {
    if (sv.summary_override) return sv.summary_override;
    // Use locale-specific description
    if (locale === 'en' && base.description_en) return base.description_en;
    if (locale === 'ja' && base.description_ja) return base.description_ja;
    if (locale === 'th' && base.description_th) return base.description_th;
    return base.subtitle || base.description;
  };
  
  // Get localized rich description (HTML with images from Admin)
  const getLocalizedRichDescription = () => {
    if (locale === 'en' && base.rich_description_en) return base.rich_description_en;
    if (locale === 'ja' && base.rich_description_ja) return base.rich_description_ja;
    if (locale === 'th' && base.rich_description_th) return base.rich_description_th;
    return base.rich_description;
  };
  
  // Determine effective pricing_mode: site view override or base product
  const effectivePricingMode = sv.pricing_mode === 'inherit' || !sv.pricing_mode
    ? (base.pricing_mode || 'fixed')
    : sv.pricing_mode;
  
  return {
    id: sv.id,
    product_id: sv.product_id,
    site_code: sv.site_code,
    display_name: getLocalizedName(),
    slug: sv.slug_override || base.slug || sv.product_id,
    summary: getLocalizedSummary(),
    pricing_mode: effectivePricingMode,
    display_price: sv.display_price || base.price,
    currency_code: sv.currency_code || 'USD',
    purchase_type: sv.purchase_type || (effectivePricingMode === 'inquiry' ? 'quote' : 'direct'),
    display_order: sv.display_order || 0,
    is_featured: sv.is_featured || false,
    display_tags: sv.display_tags_json || [],
    recommendation_reason: sv.recommendation_reason,
    cta_config: sv.cta_config_json || {},
    seo_title: sv.seo_title,
    seo_description: sv.seo_description,
    publish_status: sv.publish_status,
    published_at: sv.published_at,
    // Base
    base_name: base.name || '',
    base_slug: base.slug || '',
    brand: base.brand,
    specialty: base.specialty,
    scene_code: base.scene_code,
    clinical_category: base.clinical_category,
    cover_image_url: getImageUrl(base.cover_image_url || base.image_url) ?? null,
    description: getLocalizedSummary(),
    rich_description: getLocalizedRichDescription(),
    specs: base.specs || {},
    price_min: base.price_min,
    price_max: base.price_max,
    // New fields
    base_pricing_mode: base.pricing_mode,
    base_price: base.price,
    stock_quantity: base.stock_quantity,
    supplier_id: base.supplier_uuid,
    has_variants: base.has_variants || false,
  };
}

/** Get published INTL products list */
export async function getIntlProducts(options?: {
  featured?: boolean;
  specialty?: string;
  clinical_category?: string;
  purchase_type?: string;
  pricing_mode?: 'fixed' | 'inquiry';
  limit?: number;
  offset?: number;
  locale?: string;
  sortBy?: 'featured' | 'newest' | 'price-low' | 'price-high' | 'name-asc';
  categoryId?: string;
}): Promise<{ items: IntlProduct[]; total: number }> {
  const locale = options?.locale || 'en';

  let query = supabase
    .from('product_site_views')
    .select(`
      *,
      products!inner (
        id, slug, name, name_en, name_ja, name_th,
        subtitle, description, description_en, description_ja, description_th,
        rich_description, rich_description_en, rich_description_ja, rich_description_th,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, image_url, specs, price_min, price_max,
        status, pricing_mode, price, stock_quantity,
        supplier_uuid, has_variants
      )
    `, { count: 'exact' })
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

  if (options?.featured) {
    query = query.eq('is_featured', true);
  }
  if (options?.specialty) {
    query = query.eq('products.specialty', options.specialty);
  }
  if (options?.clinical_category) {
    query = query.eq('products.clinical_category', options.clinical_category);
  }
  if (options?.purchase_type) {
    query = query.eq('purchase_type', options.purchase_type);
  }
  if (options?.pricing_mode) {
    query = query.eq('products.pricing_mode', options.pricing_mode);
  }
  // Category filter - filter by category ID through product_categories relation
  if (options?.categoryId) {
    query = query.eq('products.clinical_category', options.categoryId);
  }

  // Sorting
  switch (options?.sortBy) {
    case 'newest':
      query = query.order('published_at', { ascending: false });
      break;
    case 'price-low':
      query = query.order('display_price', { ascending: true, nullsFirst: false });
      break;
    case 'price-high':
      query = query.order('display_price', { ascending: false, nullsFirst: false });
      break;
    case 'name-asc':
      query = query.order('display_name', { ascending: true });
      break;
    case 'featured':
    default:
      query = query.order('is_featured', { ascending: false })
                   .order('display_order')
                   .order('published_at', { ascending: false });
      break;
  }

  if (options?.limit) {
    const offset = options.offset || 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('[getIntlProducts] Failed to fetch INTL products:', error);
    return { items: [], total: 0 };
  }

  // Get product IDs for SKU price aggregation
  const productIds = (data || []).map(row => row.products?.id || row.product_id);

  // Batch query SKU min/max prices for each currency
  interface SkuPriceInfo {
    usd_min: number | null; usd_max: number | null;
    jpy_min: number | null; jpy_max: number | null;
    thb_min: number | null; thb_max: number | null;
    cny_min: number | null; cny_max: number | null;
  }
  let skuPriceMap: Record<string, SkuPriceInfo> = {};

  if (productIds.length > 0) {
    const { data: skuData } = await supabase
      .from('product_skus')
      .select('product_id, selling_price_usd, selling_price_jpy, selling_price_thb, selling_price')
      .in('product_id', productIds)
      .eq('is_active', true);

    // Aggregate min/max prices per product
    if (skuData) {
      for (const sku of skuData) {
        const pid = sku.product_id;
        if (!skuPriceMap[pid]) {
          skuPriceMap[pid] = {
            usd_min: null, usd_max: null,
            jpy_min: null, jpy_max: null,
            thb_min: null, thb_max: null,
            cny_min: null, cny_max: null
          };
        }
        // Track USD min/max
        if (sku.selling_price_usd !== null && sku.selling_price_usd !== undefined && sku.selling_price_usd > 0) {
          if (skuPriceMap[pid].usd_min === null || sku.selling_price_usd < skuPriceMap[pid].usd_min!) {
            skuPriceMap[pid].usd_min = sku.selling_price_usd;
          }
          if (skuPriceMap[pid].usd_max === null || sku.selling_price_usd > skuPriceMap[pid].usd_max!) {
            skuPriceMap[pid].usd_max = sku.selling_price_usd;
          }
        }
        // Track JPY min/max
        if (sku.selling_price_jpy !== null && sku.selling_price_jpy !== undefined && sku.selling_price_jpy > 0) {
          if (skuPriceMap[pid].jpy_min === null || sku.selling_price_jpy < skuPriceMap[pid].jpy_min!) {
            skuPriceMap[pid].jpy_min = sku.selling_price_jpy;
          }
          if (skuPriceMap[pid].jpy_max === null || sku.selling_price_jpy > skuPriceMap[pid].jpy_max!) {
            skuPriceMap[pid].jpy_max = sku.selling_price_jpy;
          }
        }
        // Track THB min/max
        if (sku.selling_price_thb !== null && sku.selling_price_thb !== undefined && sku.selling_price_thb > 0) {
          if (skuPriceMap[pid].thb_min === null || sku.selling_price_thb < skuPriceMap[pid].thb_min!) {
            skuPriceMap[pid].thb_min = sku.selling_price_thb;
          }
          if (skuPriceMap[pid].thb_max === null || sku.selling_price_thb > skuPriceMap[pid].thb_max!) {
            skuPriceMap[pid].thb_max = sku.selling_price_thb;
          }
        }
        // Track CNY min/max (selling_price as fallback)
        if (sku.selling_price !== null && sku.selling_price !== undefined && sku.selling_price > 0) {
          if (skuPriceMap[pid].cny_min === null || sku.selling_price < skuPriceMap[pid].cny_min!) {
            skuPriceMap[pid].cny_min = sku.selling_price;
          }
          if (skuPriceMap[pid].cny_max === null || sku.selling_price > skuPriceMap[pid].cny_max!) {
            skuPriceMap[pid].cny_max = sku.selling_price;
          }
        }
      }
    }
  }

  // Map products with SKU price data
  const items = (data || []).map(row => {
    const product = mapProductRow(row, locale);
    const pid = row.products?.id || row.product_id;
    const skuPrices = skuPriceMap[pid];
    if (skuPrices) {
      product.sku_price_usd_min = skuPrices.usd_min;
      product.sku_price_usd_max = skuPrices.usd_max;
      product.sku_price_jpy_min = skuPrices.jpy_min;
      product.sku_price_jpy_max = skuPrices.jpy_max;
      product.sku_price_thb_min = skuPrices.thb_min;
      product.sku_price_thb_max = skuPrices.thb_max;
      product.sku_price_cny_min = skuPrices.cny_min;
      product.sku_price_cny_max = skuPrices.cny_max;
    }
    return product;
  });

  return {
    items,
    total: count || 0,
  };
}

/** Get single INTL product by slug or product_id */
export async function getIntlProductBySlug(slugOrId: string, locale: string = 'en'): Promise<IntlProduct | null> {
  // Build base query for product_site_views
  // Note: product_images loaded separately via getIntlProductImages()
  const buildSiteViewQuery = () => supabase
    .from('product_site_views')
    .select(`
      *,
      products (
        id, slug, name, name_en, name_ja, name_th,
        subtitle, description, description_en, description_ja, description_th,
        rich_description, rich_description_en, rich_description_ja, rich_description_th,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, image_url, specs, price_min, price_max,
        status, pricing_mode, price, stock_quantity,
        supplier_uuid
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

  // Try slug_override first
  const { data: data2, error: error2 } = await buildSiteViewQuery().eq('slug_override', slugOrId).single();

  if (data2 && !error2) return mapProductRow(data2, locale);

  // Try products.slug - need to first look up product by slug
  const { data: productData } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slugOrId)
    .single();

  if (productData) {
    const { data: data3, error: error3 } = await buildSiteViewQuery().eq('product_id', productData.id).single();
    if (data3 && !error3) return mapProductRow(data3, locale);
  }

  return null;
}

/** Get product images for a given product_id */
export async function getIntlProductImages(productId: string) {
  const { data, error } = await supabase
    .from('product_images')
    .select('id, url, type, alt_text, sort_order')
    .eq('product_id', productId)
    .order('sort_order');
  if (error) {
    console.error('Failed to get product images:', error);
    return [];
  }
  return data || [];
}

// ============================================
// Cross-references: Course <-> Product
// ============================================

/** Get related products for a course (via course_product_relations) */
export async function getIntlCourseProducts(courseId: string): Promise<IntlProduct[]> {
  // First get product IDs related to this course
  const { data: relations } = await supabase
    .from('course_product_relations')
    .select('product_id, relation_type, display_order')
    .eq('course_id', courseId)
    .order('display_order');

  if (!relations || relations.length === 0) return [];

  const productIds = relations.map(r => r.product_id);

  // Get their site views
  const { data: siteViews } = await supabase
    .from('product_site_views')
    .select(`
      *,
      products!inner (
        id, slug, name, subtitle, description, rich_description,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, image_url, specs, price_min, price_max, status
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .in('product_id', productIds);

  if (!siteViews) return [];

  // Merge relation_type from relations
  return siteViews.map(sv => {
    const rel = relations.find(r => r.product_id === sv.product_id);
    const product = mapProductRow(sv);
    if (rel) {
      (product as any).relation_type = rel.relation_type;
    }
    return product;
  });
}

/** Get related courses for a product */
export async function getIntlProductCourses(productId: string, locale: string = 'en'): Promise<IntlCourse[]> {
  const { data: relations } = await supabase
    .from('course_product_relations')
    .select('course_id, relation_type')
    .eq('product_id', productId);

  if (!relations || relations.length === 0) return [];

  const courseIds = relations.map(r => r.course_id);

  const { data: siteViews } = await supabase
    .from('course_site_views')
    .select(`
      *,
      courses!inner (
        id, slug, title, subtitle, description,
        title_en, title_zh, title_th, title_ja,
        description_en, description_zh, description_th, description_ja,
        specialty, level, format, duration_minutes,
        cover_image_url, image_url, target_audience,
        is_free, price_cny, price_usd,
        enrollment_count, avg_rating, growth_tracks, status
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .in('course_id', courseIds);

  if (!siteViews) return [];
  return siteViews.map(row => mapCourseRow(row, locale));
}

/** Get related/similar products for a product (same scene_code) */
export async function getIntlRelatedProducts(productId: string, sceneCode: string | null, limit = 4): Promise<IntlProduct[]> {
  if (!sceneCode) return [];

  const { data } = await supabase
    .from('product_site_views')
    .select(`
      *,
      products!inner (
        id, slug, name, subtitle, description, long_description,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, image_url, specs, price_min, price_max, status
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .eq('products.scene_code', sceneCode)
    .neq('product_id', productId)
    .limit(limit);

  if (!data) return [];
  return data.map((sv) => mapProductRow(sv, 'en'));
}

// ============================================
// Product SKUs
// ============================================

/** SKU data for international site */
export interface IntlProductSku {
  id: string;
  sku_code: string;
  attribute_combination: Record<string, string>;
  // 供货价（仅供参考，不显示给终端用户）
  price: number;
  suggested_retail_price: number | null;
  // 销售价（显示给终端用户）
  selling_price: number | null;
  selling_price_usd: number | null;
  selling_price_jpy: number | null;
  selling_price_thb: number | null;
  // 库存
  stock_quantity: number;
  // SKU级别规格参数
  specs: Record<string, string> | null;
  // 图片和状态
  image_url: string | null;
  is_active: boolean;
}

/** Get SKUs for a product */
export async function getIntlProductSkus(productId: string): Promise<IntlProductSku[]> {
  const { data, error } = await supabase
    .from('product_skus')
    .select(`
      id,
      sku_code,
      attribute_combination,
      price,
      suggested_retail_price,
      selling_price,
      selling_price_usd,
      selling_price_jpy,
      selling_price_thb,
      stock_quantity,
      specs,
      image_url,
      is_active
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sku_code');

  if (error) {
    console.error('Failed to fetch product SKUs:', error);
    return [];
  }

  return (data || []).map(sku => ({
    id: sku.id,
    sku_code: sku.sku_code,
    attribute_combination: sku.attribute_combination || {},
    price: sku.price,
    suggested_retail_price: sku.suggested_retail_price,
    selling_price: sku.selling_price,
    selling_price_usd: sku.selling_price_usd,
    selling_price_jpy: sku.selling_price_jpy,
    selling_price_thb: sku.selling_price_thb,
    stock_quantity: sku.stock_quantity,
    specs: sku.specs,
    image_url: sku.image_url,
    is_active: sku.is_active,
  }));
}

/** Get variant attributes for a product (defines SKU dimensions like color, size) */
export async function getIntlProductVariantAttributes(productId: string): Promise<{ name: string; values: string[] }[]> {
  const { data, error } = await supabase
    .from('product_variant_attributes')
    .select('attribute_name, attribute_values')
    .eq('product_id', productId)
    .order('sort_order');

  if (error) {
    console.error('Failed to fetch variant attributes:', error);
    return [];
  }

  return (data || []).map(attr => ({
    name: attr.attribute_name,
    values: attr.attribute_values || [],
  }));
}

// ============================================
// Clinic Programs
// ============================================

/** Get published INTL clinic programs */
export async function getIntlClinicPrograms(locale?: string): Promise<IntlClinicProgram[]> {
  const { data, error } = await supabase
    .from('clinic_programs')
    .select('*')
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .order('display_order');

  if (error) {
    console.error('Failed to fetch clinic programs:', error);
    return [];
  }
  return data || [];
}

// ============================================
// Leads / Inquiries
// ============================================

export interface IntlLeadSubmission {
  lead_type: 'inquiry' | 'quote_request' | 'consultation' | 'clinic_consultation';
  contact_name: string;
  email?: string;
  mobile?: string;
  clinic_name?: string;
  country?: string;
  interest?: string;
  clinic_stage?: string;
  requirement_text?: string;
  source_page?: string;
  source_product_id?: string;
  source_course_id?: string;
}

/** Submit a lead / inquiry */
export async function submitIntlLead(lead: IntlLeadSubmission): Promise<{ success: boolean; lead_id?: string }> {
  const { data, error } = await supabase
    .from('purchase_leads')
    .insert({
      lead_type: lead.lead_type,
      contact_name: lead.contact_name,
      email: lead.email || null,
      mobile: lead.mobile || null,
      clinic_name: lead.clinic_name || null,
      requirement_text: lead.requirement_text || null,
      source_page: lead.source_page || null,
      source_product_id: lead.source_product_id || null,
      source_course_id: lead.source_course_id || null,
      site_code: SITE_CODE,
      status: 'new',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to submit lead:', error);
    return { success: false };
  }
  return { success: true, lead_id: data?.id };
}

// ============================================
// Homepage aggregated data
// ============================================

/** Get all data needed for INTL homepage in parallel */
export async function getIntlHomePageData(locale?: string) {
  const [
    featuredCoursesResult,
    featuredProductsResult,
    programsResult,
  ] = await Promise.all([
    getIntlCourses({ featured: false, limit: 6, locale }), // 改为获取最新课程而不是精选
    getIntlProducts({ featured: false, limit: 6, locale }), // 改为获取最新产品而不是精选
    getIntlClinicPrograms(locale),
  ]);

  return {
    featuredCourses: featuredCoursesResult.items,
    featuredProducts: featuredProductsResult.items,
    clinicPrograms: programsResult,
  };
}

// ============================================
// Shipping Zones
// ============================================

export interface ShippingZone {
  id: string;
  zoneCode: string;
  zoneName: Record<string, string>;
  region: 'US' | 'EU' | 'SEA';
  countries: string[];
  billingType: 'weight' | 'flat';
  baseFee: number;
  currency: string;
  perUnitFee: number;
  weightUnit: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export interface ShippingRate {
  zoneCode: string;
  zoneName: string;
  shippingCost: number;
  estimatedDays: string;
  currency: string;
}

export interface CartShippingEstimate {
  totalWeight: number;
  weightUnit: string;
  rates: ShippingRate[];
  defaultRate: ShippingRate | null;
}

export interface CategoryWithCount {
  slug: string;
  name: Record<string, string>;
  productCount: number;
  richDescriptionAbove: Record<string, string> | null;
  richDescriptionBelow: Record<string, string> | null;
}

/** Get all active shipping zones */
export async function getShippingZones(): Promise<ShippingZone[]> {
  const { data, error } = await supabase
    .from('shipping_zones')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error || !data) {
    console.error('Failed to fetch shipping zones:', error);
    return [];
  }

  return data.map((zone: any) => ({
    id: zone.id,
    zoneCode: zone.zone_code,
    zoneName: zone.zone_name,
    region: zone.region,
    countries: zone.countries,
    billingType: zone.billing_type,
    baseFee: zone.base_fee,
    currency: zone.currency,
    perUnitFee: zone.per_unit_fee,
    weightUnit: zone.weight_unit,
    estimatedDaysMin: zone.estimated_days_min,
    estimatedDaysMax: zone.estimated_days_max,
  }));
}

/** Get shipping zone for a specific country */
export async function getShippingZoneByCountry(countryCode: string): Promise<ShippingZone | null> {
  const { data, error } = await supabase
    .from('shipping_zones')
    .select('*')
    .eq('is_active', true)
    .contains('countries', [countryCode.toUpperCase()])
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    zoneCode: data.zone_code,
    zoneName: data.zone_name,
    region: data.region,
    countries: data.countries,
    billingType: data.billing_type,
    baseFee: data.base_fee,
    currency: data.currency,
    perUnitFee: data.per_unit_fee,
    weightUnit: data.weight_unit,
    estimatedDaysMin: data.estimated_days_min,
    estimatedDaysMax: data.estimated_days_max,
  };
}

/** Calculate shipping cost for cart items based on total weight */
export async function calculateCartShipping(
  items: Array<{ productId: string; quantity: number }>,
  locale: string = 'en'
): Promise<CartShippingEstimate> {
  if (items.length === 0) {
    return {
      totalWeight: 0,
      weightUnit: 'kg',
      rates: [],
      defaultRate: null,
    };
  }

  // Get product weights from SKUs
  const productIds = items.map(i => i.productId);
  const { data: skus } = await supabase
    .from('product_skus')
    .select('product_id, weight, weight_unit, is_active')
    .in('product_id', productIds)
    .eq('is_active', true);

  // Calculate total weight (normalize to kg)
  let totalWeight = 0;
  let defaultWeightUnit = 'kg';

  for (const item of items) {
    const productSkus = skus?.filter((s: any) => s.product_id === item.productId) || [];
    // Use first active SKU's weight as product weight
    const sku = productSkus[0];
    if (sku?.weight) {
      let weight = sku.weight * item.quantity;
      // Normalize to kg
      if (sku.weight_unit === 'g') weight = weight / 1000;
      else if (sku.weight_unit === 'lb') weight = weight * 0.453592;
      totalWeight += weight;
      defaultWeightUnit = 'kg';
    }
  }

  // Get all active shipping zones
  const zones = await getShippingZones();
  const rates: ShippingRate[] = [];

  for (const zone of zones) {
    let shippingCost = zone.baseFee;

    if (zone.billingType === 'weight' && totalWeight > 0) {
      shippingCost += zone.perUnitFee * totalWeight;
    }

    const estimatedDays = zone.estimatedDaysMin === zone.estimatedDaysMax
      ? `${zone.estimatedDaysMin} days`
      : `${zone.estimatedDaysMin}-${zone.estimatedDaysMax} days`;

    rates.push({
      zoneCode: zone.zoneCode,
      zoneName: zone.zoneName[locale] || zone.zoneName['en'] || zone.zoneCode,
      shippingCost: Math.round(shippingCost * 100) / 100,
      estimatedDays,
      currency: zone.currency,
    });
  }

  return {
    totalWeight: Math.round(totalWeight * 1000) / 1000,
    weightUnit: defaultWeightUnit,
    rates,
    defaultRate: rates[0] || null,
  };
}

// ============================================
// Product Categories (Three-level hierarchy)
// ============================================

export interface ProductCategory {
  id: string;
  name: string;
  name_en?: string;
  name_th?: string;
  name_ja?: string;
  slug: string;
  level: number;
  parent_id: string | null;
  icon: string | null;
  description: string | null;
  site_code: string;
  sort_order: number;
  is_active: boolean;
  children?: ProductCategory[];
  productCount?: number;
}

/**
 * Get full product category tree for INTL site with product counts
 */
export async function getIntlProductCategoryTree(locale: string = 'en'): Promise<ProductCategory[]> {
  // Get all active categories from product_categories table
  const { data: categories, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .or('site_code.eq.intl,site_code.eq.global')
    .order('level')
    .order('sort_order');

  if (error || !categories) {
    console.error('Failed to fetch categories:', error);
    return [];
  }

  // Get product counts for each category
  const { data: products } = await supabase
    .from('product_site_views')
    .select('product_id')
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

  // Get category-product mappings
  const productIds = products?.map(p => p.product_id) || [];
  const { data: mappings } = await supabase
    .from('product_category_mappings')
    .select('category_id, product_id')
    .in('product_id', productIds);

  // Count products per category
  const countMap: Record<string, number> = {};
  if (mappings) {
    for (const mapping of mappings) {
      countMap[mapping.category_id] = (countMap[mapping.category_id] || 0) + 1;
    }
  }

  // Build tree structure
  const buildTree = (parentId: string | null = null, level: number = 1): ProductCategory[] => {
    const levelCategories = categories
      .filter(c => c.parent_id === parentId && c.level === level)
      .sort((a, b) => a.sort_order - b.sort_order);

    return levelCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      name_en: cat.name_en,
      name_th: cat.name_th,
      name_ja: cat.name_ja,
      slug: cat.slug,
      level: cat.level,
      parent_id: cat.parent_id,
      icon: cat.icon,
      description: cat.description,
      site_code: cat.site_code,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
      productCount: countMap[cat.id] || 0,
      children: buildTree(cat.id, level + 1),
    }));
  };

  return buildTree(null, 1);
}

/**
 * Get categories flattened with product counts
 */
export async function getIntlCategoriesWithCounts(locale: string = 'en'): Promise<CategoryWithCount[]> {
  const tree = await getIntlProductCategoryTree(locale);

  // Flatten tree for backward compatibility
  const flattenCategories = (categories: ProductCategory[]): CategoryWithCount[] => {
    const result: CategoryWithCount[] = [];
    for (const cat of categories) {
      result.push({
        slug: cat.slug,
        name: {
          en: cat.name_en || cat.name,
          th: cat.name_th || cat.name,
          ja: cat.name_ja || cat.name,
          zh: cat.name,
        },
        productCount: cat.productCount || 0,
        richDescriptionAbove: null,
        richDescriptionBelow: null,
      });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children));
      }
    }
    return result;
  };

  return flattenCategories(tree);
}

/** Get categories with product counts for INTL site (dynamic visibility) */
export async function getIntlCategoriesWithCountsOld(locale: string = 'en'): Promise<CategoryWithCount[]> {
  // Get clinical categories from product_site_views
  const { data: counts, error } = await supabase
    .from('product_site_views')
    .select('products!inner(clinical_category)')
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

  if (error) {
    console.error('Failed to fetch category counts:', error);
  }

  // Count products per category
  const countMap: Record<string, number> = {};
  if (counts) {
    for (const item of counts) {
      const cat = (item.products as any)?.clinical_category;
      if (cat) {
        countMap[cat] = (countMap[cat] || 0) + 1;
      }
    }
  }

  // Categories from site config
  const categories: CategoryWithCount[] = [
    { slug: 'imaging-diagnostics', name: { en: 'Imaging & Diagnostics', th: 'การถ่ายภาพและการวินิจฉัย', ja: '画像診断' }, productCount: 0, richDescriptionAbove: null, richDescriptionBelow: null },
    { slug: 'surgery-anesthesia', name: { en: 'Surgery & Anesthesia', th: 'ศัลยกรรมและการดมยา', ja: '手術・麻酔' }, productCount: 0, richDescriptionAbove: null, richDescriptionBelow: null },
    { slug: 'in-house-lab', name: { en: 'In-House Laboratory', th: 'ห้องปฏิบัติการในคลินิก', ja: '院内検査室' }, productCount: 0, richDescriptionAbove: null, richDescriptionBelow: null },
    { slug: 'daily-supplies', name: { en: 'Daily Clinical Supplies', th: 'เวชภัณฑ์ประจำวัน', ja: '日常臨床用品' }, productCount: 0, richDescriptionAbove: null, richDescriptionBelow: null },
    { slug: 'course-equipment', name: { en: 'Course-Recommended', th: 'แนะนำจากหลักสูตร', ja: 'コース推奨' }, productCount: 0, richDescriptionAbove: null, richDescriptionBelow: null },
  ];

  // Update counts
  return categories.map(c => ({
    ...c,
    productCount: countMap[c.slug] || 0,
  }));
}
