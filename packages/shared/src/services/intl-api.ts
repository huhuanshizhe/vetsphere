/**
 * INTL Site Views API
 * 
 * All INTL frontend data fetching functions.
 * Reads from overlay tables (course_site_views, product_site_views, etc.)
 * JOINed with base tables for resolved display data.
 */
import { supabase } from './supabase';

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
  long_description: string | null;
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
  // Related training
  related_courses?: IntlCourse[];
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
    cover_image_url: base.cover_image_url || base.image_url,
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

function mapProductRow(sv: any): IntlProduct {
  const base = sv.products || {};
  // Determine effective pricing_mode: site view override or base product
  const effectivePricingMode = sv.pricing_mode === 'inherit' || !sv.pricing_mode
    ? (base.pricing_mode || 'fixed')
    : sv.pricing_mode;
  
  return {
    id: sv.id,
    product_id: sv.product_id,
    site_code: sv.site_code,
    display_name: sv.display_name || base.name || '',
    slug: sv.slug_override || base.slug || sv.product_id,
    summary: sv.summary_override || base.subtitle || base.description,
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
    cover_image_url: base.cover_image_url,
    description: base.description,
    long_description: base.long_description,
    specs: base.specs || {},
    price_min: base.price_min,
    price_max: base.price_max,
    // New fields
    base_pricing_mode: base.pricing_mode,
    base_price: base.price,
    stock_quantity: base.stock_quantity,
    supplier_id: base.supplier_uuid,
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
}): Promise<{ items: IntlProduct[]; total: number }> {
  let query = supabase
    .from('product_site_views')
    .select(`
      *,
      products!inner (
        id, slug, name, subtitle, description, long_description,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, specs, price_min, price_max,
        status, pricing_mode, price, stock_quantity,
        supplier_uuid
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

  query = query.order('display_order').order('published_at', { ascending: false });

  if (options?.limit) {
    const offset = options.offset || 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Failed to fetch INTL products:', error);
    return { items: [], total: 0 };
  }

  return {
    items: (data || []).map(mapProductRow),
    total: count || 0,
  };
}

/** Get single INTL product by slug or product_id */
export async function getIntlProductBySlug(slugOrId: string): Promise<IntlProduct | null> {
  const { data, error } = await supabase
    .from('product_site_views')
    .select(`
      *,
      products!inner (
        id, slug, name, subtitle, description, long_description,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, specs, price_min, price_max,
        status,
        product_images (id, image_url, image_type, alt_text, display_order)
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .or(`slug_override.eq.${slugOrId},product_id.eq.${slugOrId}`)
    .single();

  if (error || !data) return null;
  return mapProductRow(data);
}

/** Get product images for a given product_id */
export async function getIntlProductImages(productId: string) {
  const { data } = await supabase
    .from('product_images')
    .select('id, image_url, image_type, alt_text, display_order')
    .eq('product_id', productId)
    .order('display_order');
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
        id, slug, name, subtitle, description, long_description,
        brand, specialty, scene_code, clinical_category,
        cover_image_url, specs, price_min, price_max, status
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
        cover_image_url, specs, price_min, price_max, status
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .eq('products.scene_code', sceneCode)
    .neq('product_id', productId)
    .limit(limit);

  if (!data) return [];
  return data.map(mapProductRow);
}

// ============================================
// Clinic Programs
// ============================================

/** Get published INTL clinic programs */
export async function getIntlClinicPrograms(): Promise<IntlClinicProgram[]> {
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
export async function getIntlHomePageData() {
  const [
    featuredCoursesResult,
    featuredProductsResult,
    programsResult,
  ] = await Promise.all([
    getIntlCourses({ featured: true, limit: 6 }),
    getIntlProducts({ featured: true, limit: 6 }),
    getIntlClinicPrograms(),
  ]);

  return {
    featuredCourses: featuredCoursesResult.items,
    featuredProducts: featuredProductsResult.items,
    clinicPrograms: programsResult,
  };
}
