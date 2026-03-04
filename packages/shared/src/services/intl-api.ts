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
  price_cny: number | null;
  price_usd: number | null;
  enrollment_count: number;
  avg_rating: number | null;
  growth_tracks: string[];
  // Instructors (loaded separately)
  instructors?: IntlInstructor[];
  // Equipment count
  equipment_count?: number;
}

export interface IntlProduct {
  id: string;
  product_id: string;
  site_code: string;
  // Site view overrides
  display_name: string;
  slug: string;
  summary: string | null;
  pricing_mode: string;
  display_price: number | null;
  currency_code: string | null;
  purchase_type: string | null;
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

function mapCourseRow(sv: any): IntlCourse {
  const base = sv.courses || {};
  return {
    id: sv.id,
    course_id: sv.course_id,
    site_code: sv.site_code,
    title: sv.title_override || base.title || '',
    slug: sv.slug_override || base.slug || sv.course_id,
    summary: sv.summary_override || base.subtitle || base.description || '',
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
    description: base.description,
    target_audience: base.target_audience,
    is_free: base.is_free || false,
    price_cny: base.price_cny,
    price_usd: base.price_usd,
    enrollment_count: base.enrollment_count || 0,
    avg_rating: base.avg_rating,
    growth_tracks: base.growth_tracks || [],
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
}): Promise<{ items: IntlCourse[]; total: number }> {
  let query = supabase
    .from('course_site_views')
    .select(`
      *,
      courses!inner (
        id, slug, title, subtitle, description,
        specialty, level, format, duration_minutes,
        cover_image_url, image_url, target_audience,
        is_free, price_cny, price_usd,
        enrollment_count, avg_rating, growth_tracks,
        status
      )
    `, { count: 'exact' })
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true);

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
    items: (data || []).map(mapCourseRow),
    total: count || 0,
  };
}

/** Get single INTL course by slug or course_id */
export async function getIntlCourseBySlug(slugOrId: string): Promise<IntlCourse | null> {
  // Try slug_override first, then course_id
  const { data, error } = await supabase
    .from('course_site_views')
    .select(`
      *,
      courses!inner (
        id, slug, title, subtitle, description,
        specialty, level, format, duration_minutes,
        cover_image_url, image_url, target_audience,
        is_free, price_cny, price_usd,
        enrollment_count, avg_rating, growth_tracks,
        status, total_hours
      )
    `)
    .eq('site_code', SITE_CODE)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .or(`slug_override.eq.${slugOrId},course_id.eq.${slugOrId}`)
    .single();

  if (error || !data) return null;
  return mapCourseRow(data);
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

/** Get course instructors for a given course_id */
export async function getIntlCourseInstructors(courseId: string): Promise<IntlInstructor[]> {
  const { data } = await supabase
    .from('course_instructors')
    .select(`
      role,
      instructor:instructors (id, name, title, bio, avatar_url, credentials)
    `)
    .eq('course_id', courseId);

  return (data || []).map((ci: any) => ({
    id: ci.instructor?.id,
    name: ci.instructor?.name || '',
    title: ci.instructor?.title || '',
    bio: ci.instructor?.bio,
    avatar_url: ci.instructor?.avatar_url,
    credentials: ci.instructor?.credentials,
    role: ci.role,
  }));
}

// ============================================
// Product Site Views
// ============================================

function mapProductRow(sv: any): IntlProduct {
  const base = sv.products || {};
  return {
    id: sv.id,
    product_id: sv.product_id,
    site_code: sv.site_code,
    display_name: sv.display_name || base.name || '',
    slug: sv.slug_override || base.slug || sv.product_id,
    summary: sv.summary_override || base.subtitle || base.description,
    pricing_mode: sv.pricing_mode || 'inherit',
    display_price: sv.display_price,
    currency_code: sv.currency_code,
    purchase_type: sv.purchase_type,
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
  };
}

/** Get published INTL products list */
export async function getIntlProducts(options?: {
  featured?: boolean;
  specialty?: string;
  clinical_category?: string;
  purchase_type?: string;
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
        status
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
export async function getIntlProductCourses(productId: string): Promise<IntlCourse[]> {
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
  return siteViews.map(mapCourseRow);
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
