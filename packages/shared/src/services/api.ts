import { supabase, getSessionSafe } from './supabase';
import { Order, CartItem, Lead, ShippingTemplate, Quote, Product, Course, Post, Specialty, ProductVariantAttribute, ProductSku } from '../types';
import { PRODUCTS_CN, COURSES_CN } from '../lib/constants';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.vetsphere.net';

// Production mode: disable mock data fallback
const USE_MOCK_FALLBACK = process.env.NODE_ENV === 'development';

// Helper: get authenticated headers for payment API calls
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await getSessionSafe();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch { /* proceed without auth if session unavailable */ }
  return headers;
}

// Seed data for initial setup (only used in development or when DB is empty)
const SEED_POSTS: Post[] = [
  {
    id: 'case-001',
    title: '复杂粉碎性股骨骨折的 TPLO + 锁定钢板联合固定',
    content: '患犬为3岁拉布拉多，遭遇车祸导致股骨远端粉碎性骨折，同时伴有交叉韧带断裂。我们采用了双板固定技术...',
    specialty: Specialty.ORTHOPEDICS,
    media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80' }],
    stats: { likes: 42, comments: 12, saves: 28 },
    createdAt: '2025-05-15',
    isAiAnalyzed: true,
    author: { name: 'Dr. Zhang', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80', level: 'Expert', hospital: '上海中心宠物医院' },
    patientInfo: { species: 'Canine (Labrador)', age: '3y', weight: '32kg' },
    sections: { diagnosis: 'Distal Femoral Comminuted Fracture', plan: 'Dual Plate Fixation + TPLO Stabilization', outcome: 'Post-op 8 weeks: Good weight bearing.' }
  },
  {
    id: 'case-002',
    title: '神经外科：L3-L4 椎间盘突出导致的截瘫病例报告',
    content: '该病例展示了半椎板切除术在急性 IVDD 处理中的应用，术后配合高压氧治疗效果显著。',
    specialty: Specialty.NEUROSURGERY,
    media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80' }],
    stats: { likes: 35, comments: 8, saves: 15 },
    createdAt: '2025-05-18',
    isAiAnalyzed: true,
    author: { name: 'Dr. Emily Smith', avatar: 'https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=100&q=80', level: 'Surgeon', hospital: 'London Vet Clinic' },
    patientInfo: { species: 'Canine (Dachshund)', age: '6y', weight: '8kg' },
    sections: { diagnosis: 'Acute IVDD (Hansen Type I)', plan: 'Hemilaminectomy at L3-L4', outcome: 'Deep pain sensation recovered in 48h.' }
  }
];

// Seed data references (only used when USE_MOCK_FALLBACK is true)
const SEED_PRODUCTS = USE_MOCK_FALLBACK ? [...PRODUCTS_CN] : [];
const SEED_COURSES = USE_MOCK_FALLBACK ? [...COURSES_CN] : [];

// Helper functions to save product related data
async function saveProductImages(productId: string, images: Array<{ url: string; type: string; sortOrder?: number }>): Promise<void> {
  // Delete existing images
  await supabase.from('product_images').delete().eq('product_id', productId);
  
  // Insert new images
  if (images.length > 0) {
    const imageRecords = images.map((img, idx) => ({
      product_id: productId,
      url: img.url,
      type: img.type || 'detail',
      sort_order: img.sortOrder ?? idx,
    }));
    await supabase.from('product_images').insert(imageRecords);
  }
}

async function saveVariantAttributes(productId: string, attributes: ProductVariantAttribute[]): Promise<void> {
  console.log('[saveVariantAttributes] Called with:', { productId, attributesCount: attributes.length, attributes });
  
  // Delete existing attributes
  const { error: deleteError } = await supabase.from('product_variant_attributes').delete().eq('product_id', productId);
  if (deleteError) {
    console.error('[saveVariantAttributes] Delete error:', deleteError);
  } else {
    console.log('[saveVariantAttributes] Deleted existing attributes for', productId);
  }
  
  // Insert new attributes
  if (attributes.length > 0) {
    const attrRecords = attributes.map((attr, idx) => ({
      product_id: productId,
      attribute_name: attr.attributeName,
      attribute_values: attr.attributeValues,
      sort_order: attr.sortOrder ?? idx,
    }));
    console.log('[saveVariantAttributes] Inserting records:', JSON.stringify(attrRecords, null, 2));
    const { error: insertError, data } = await supabase.from('product_variant_attributes').insert(attrRecords).select();
    if (insertError) {
      console.error('[saveVariantAttributes] Insert error:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        fullError: JSON.stringify(insertError, null, 2)
      });
      throw new Error(`Failed to save variant attributes: ${insertError.message}`);
    } else {
      console.log('[saveVariantAttributes] ✓ Saved', attributes.length, 'attributes for product', productId, 'Data:', data);
    }
  } else {
    console.log('[saveVariantAttributes] No attributes to save');
  }
}

async function saveProductSkus(productId: string, skus: ProductSku[]): Promise<void> {
  console.log('[saveProductSkus] Called with:', { productId, skusCount: skus.length });
  
  // Delete existing SKUs
  const { error: deleteError } = await supabase.from('product_skus').delete().eq('product_id', productId);
  if (deleteError) {
    console.error('[saveProductSkus] Delete error:', deleteError);
  } else {
    console.log('[saveProductSkus] Deleted existing SKUs for', productId);
  }
  
  // Insert new SKUs
  if (skus.length > 0) {
    const skuRecords = skus.map((sku, idx) => ({
      product_id: productId,
      sku_code: sku.skuCode,
      attribute_combination: sku.attributeCombination,
      price: sku.price,
      original_price: sku.originalPrice || null,
      stock_quantity: sku.stockQuantity,
      weight: sku.weight ?? null,
      weight_unit: sku.weightUnit || null,
      suggested_retail_price: sku.suggestedRetailPrice ?? null,
      image_url: sku.imageUrl || null,
      specs: sku.specs || null,
      barcode: sku.barcode || null,
      is_active: sku.isActive !== false,
      sort_order: sku.sortOrder ?? idx,
    }));
    console.log('[saveProductSkus] Inserting records:', JSON.stringify(skuRecords, null, 2));
    const { error: insertError, data } = await supabase.from('product_skus').insert(skuRecords).select();
    if (insertError) {
      console.error('[saveProductSkus] Insert error:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        fullError: JSON.stringify(insertError, null, 2)
      });
      throw new Error(`Failed to save product SKUs: ${insertError.message}`);
    } else {
      console.log('[saveProductSkus] ✓ Saved', skus.length, 'SKUs for product', productId, 'Data:', data);
    }
  } else {
    console.log('[saveProductSkus] No SKUs to save');
  }
}

// Helper: map DB row to Product
function mapProduct(p: any): Product {
  // Parse images array
  const images = p.images || [];

  // Get main image: from image_url column, or from images array, or first image
  const mainImage = images.find((img: any) => img.type === 'main');
  const imageUrl = p.image_url || mainImage?.url || (images.length > 0 ? images[0]?.url : null);

  // Calculate stock and price from SKUs if hasVariants
  const hasVariants = p.has_variants || false;
  const skus = (p.skus || []).map((sku: any) => ({
    id: sku.id,
    productId: sku.product_id || p.id,
    skuCode: sku.sku_code,
    attributeCombination: sku.attribute_combination,
    price: sku.price,
    originalPrice: sku.original_price,
    stockQuantity: sku.stock_quantity,
    weight: sku.weight,
    weightUnit: sku.weight_unit,
    suggestedRetailPrice: sku.suggested_retail_price,
    sellingPrice: sku.selling_price,
    sellingPriceUsd: sku.selling_price_usd,
    sellingPriceJpy: sku.selling_price_jpy,
    sellingPriceThb: sku.selling_price_thb,
    imageUrl: sku.image_url,
    specs: sku.specs,
    barcode: sku.barcode,
    isActive: sku.is_active,
    sortOrder: sku.sort_order || 0,
  }));

  // Calculate total stock and price range from SKUs when hasVariants
  let qty = p.stock_quantity ?? 0;
  let price = p.price;

  if (hasVariants && skus.length > 0) {
    // Sum stock from all SKUs
    qty = skus.reduce((sum: number, sku: any) => sum + (sku.stockQuantity || 0), 0);
    // Get minimum price from SKUs
    const prices = skus.map((sku: any) => sku.price).filter((pr: number) => pr > 0);
    if (prices.length > 0) {
      price = Math.min(...prices);
    }
  }

  // Determine stock status
  let stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = p.stock_status || 'In Stock';
  if (qty === 0) stockStatus = 'Out of Stock';
  else if (qty < 10) stockStatus = 'Low Stock';
  else stockStatus = 'In Stock';

  return {
    id: p.id, name: p.name, brand: p.brand, price, specialty: p.specialty,
    group: p.group_category, imageUrl, description: p.description,
    longDescription: p.long_description || p.description,
    specs: p.specs || {}, compareData: p.compare_data,
    stockStatus,
    stockQuantity: qty,
    status: p.status || 'Published',
    supplierId: p.supplier_id || undefined,
    rejectionReason: p.rejection_reason || undefined,
    updatedAt: p.updated_at || undefined,
    supplier: p.supplier_info || { name: 'Verified Supplier', origin: 'Global', rating: 5.0 },
    // B2B Commerce fields
    purchaseMode: p.purchase_mode || 'direct',
    clinicalCategory: p.clinical_category || undefined,
    subCategory: p.sub_category || undefined,
    clinicalUseCase: p.clinical_use_case || undefined,
    certifications: p.certifications || undefined,
    instructorRecommendation: p.instructor_recommendation || undefined,
    categorySlug: p.category_slug || undefined,
    // Product form fields
    category_id: p.category_id || null,
    subcategory_id: p.subcategory_id || null,
    level3_category_id: p.level3_category_id || null,
    images: images.map((img: any) => ({
      id: img.id,
      url: img.url,
      type: img.type,
      sortOrder: img.sort_order || 0,
    })),
    hasVariants,
    variantAttributes: (p.variant_attributes || []).map((attr: any) => ({
      id: attr.id,
      productId: attr.product_id || p.id,
      attributeName: attr.attribute_name,
      attributeValues: attr.attribute_values,
      sortOrder: attr.sort_order || 0,
    })),
    skus,
    richDescription: p.rich_description || undefined,
  };
}

export const api = {
  // =====================================================
  // POINTS SYSTEM (Database-backed)
  // =====================================================
  async awardPoints(userId: string, amount: number, reason: string): Promise<{ points: number; level: string }> {
    try {
      const { data, error } = await supabase.rpc('award_user_points', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason
      });
      
      if (error) throw error;
      
      const result = data?.[0] || { new_total: 500, new_level: 'Resident' };
      return { points: result.new_total, level: result.new_level };
    } catch (e) {
      console.error('Award points error:', e);
      // Fallback to localStorage if DB fails
      const current = parseInt(localStorage.getItem(`pts_${userId}`) || "500");
      const updated = current + amount;
      localStorage.setItem(`pts_${userId}`, updated.toString());
      return { points: updated, level: this.calculateLevel(updated) };
    }
  },

  async fetchUserPoints(userId: string): Promise<{ points: number; level: string }> {
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('total_points, level')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        // Initialize points for new user
        await supabase.from('user_points').insert({ user_id: userId, total_points: 500, level: 'Resident' });
        return { points: 500, level: 'Resident' };
      }
      
      return { points: data.total_points, level: data.level };
    } catch {
      return { points: 500, level: 'Resident' };
    }
  },

  async getPointsHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) return [];
      return data.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        balanceAfter: t.balance_after,
        createdAt: t.created_at
      }));
    } catch {
      return [];
    }
  },

  calculateLevel(points: number): string {
    if (points >= 10000) return 'Master';
    if (points >= 5000) return 'Expert';
    if (points >= 2000) return 'Senior';
    if (points >= 1000) return 'Specialist';
    return 'Resident';
  },

  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase.from('products').select(`
        *,
        images:product_images(id, url, type, sort_order),
        skus:product_skus(id, sku_code, attribute_combination, price, original_price, stock_quantity, weight, weight_unit, suggested_retail_price, selling_price, image_url, is_active, sort_order)
      `);
      if (error || !data || data.length === 0) return USE_MOCK_FALLBACK ? SEED_PRODUCTS : [];
      return data.map(mapProduct);
    } catch { return USE_MOCK_FALLBACK ? SEED_PRODUCTS : []; }
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(id, url, type, sort_order),
          variant_attributes:product_variant_attributes(id, attribute_name, attribute_values, sort_order),
          skus:product_skus(id, sku_code, attribute_combination, price, original_price, stock_quantity, weight, weight_unit, suggested_retail_price, selling_price, image_url, is_active, sort_order)
        `)
        .eq('id', id)
        .single();
        
      console.log('[API] getProductById - Raw data:', JSON.stringify(data, null, 2));
      console.log('[API] getProductById - variant_attributes:', data?.variant_attributes);
      console.log('[API] getProductById - skus:', data?.skus);
      console.log('[API] getProductById - Error:', error);
      
      if (error || !data) {
        if (USE_MOCK_FALLBACK) {
          return SEED_PRODUCTS.find(p => p.id === id) || null;
        }
        return null;
      }
      
      const mapped = mapProduct(data);
      console.log('[API] getProductById - Mapped product:', mapped);
      return mapped;
    } catch (err) {
      console.error('[API] getProductById - Exception:', err);
      if (USE_MOCK_FALLBACK) {
        return SEED_PRODUCTS.find(p => p.id === id) || null;
      }
      return null;
    }
  },

  async manageProduct(action: 'create' | 'update' | 'delete', product: Partial<Product>): Promise<string | void> {
    console.log('[manageProduct] Called with action:', action, 'product:', {
      id: product.id,
      name: product.name,
      hasVariants: product.hasVariants,
      variantAttributesCount: product.variantAttributes?.length,
      skusCount: product.skus?.length
    });
    
    if (action === 'create') {
      const productId = product.id || `p-${Date.now()}`;
      console.log('[manageProduct] Creating new product with ID:', productId);
      const payload = {
        id: productId,
        name: product.name, brand: product.brand, price: product.price,
        specialty: product.specialty, group_category: product.group,
        image_url: product.imageUrl, description: product.description,
        long_description: product.longDescription, specs: product.specs,
        stock_status: product.stockStatus || 'In Stock',
        stock_quantity: product.stockQuantity ?? 0,
        status: product.status || 'Draft',
        supplier_id: product.supplierId,
        supplier_info: product.supplier,
        // Category fields
        category_id: product.category_id || null,
        subcategory_id: product.subcategory_id || null,
        level3_category_id: product.level3_category_id || null,
        category_slug: product.categorySlug || null,
        // Variant fields
        has_variants: product.hasVariants || false,
        rich_description: product.richDescription || null,
        // Trade & Logistics fields
        delivery_time: (product as any).delivery_time || null,
        packaging_info: (product as any).packaging_info || null,
        warranty_info: (product as any).warranty_info || null,
        min_order_quantity: (product as any).min_order_quantity || 1,
        video_url: (product as any).video_url || null,
        dimensions: (product as any).dimensions || null,
        certifications: (product as any).certifications || null,
        // SEO fields
        faq: product.faq || null,
        meta_title: product.metaTitle || null,
        meta_description: product.metaDescription || null,
        focus_keyword: product.focusKeyword || null,
      };
      const { error: productError } = await supabase.from('products').insert(payload as any);
      if (productError) {
        console.error('[manageProduct] Failed to create product:', productError);
        throw new Error(`Failed to create product: ${productError.message}`);
      }
      console.log('[manageProduct] ✓ Product created with ID:', productId);
      
      // Save related data (images, variant attributes, SKUs)
      if (product.images && product.images.length > 0) {
        console.log('[manageProduct] Saving product images...');
        await saveProductImages(productId, product.images);
      }
      if (product.variantAttributes && product.variantAttributes.length > 0) {
        console.log('[manageProduct] Saving variant attributes...');
        await saveVariantAttributes(productId, product.variantAttributes);
      } else {
        console.log('[manageProduct] No variant attributes to save');
      }
      if (product.skus && product.skus.length > 0) {
        console.log('[manageProduct] Saving product SKUs...');
        await saveProductSkus(productId, product.skus);
      } else {
        console.log('[manageProduct] No SKUs to save');
      }
      
      // Save spec templates (自动保存规格参数模板)
      if (product.specs && Object.keys(product.specs).length > 0 && product.category_id) {
        const specsArray = Object.entries(product.specs).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        this.saveSpecTemplates({
          categoryId: product.category_id,
          subcategoryId: product.subcategory_id,
          level3CategoryId: product.level3_category_id,
          specs: specsArray
        }).catch(err => console.error('Failed to save spec templates:', err));
      }
      
      // 返回产品 ID
      return productId;
    } else if (action === 'update' && product.id) {
      console.log('[manageProduct] Updating product ID:', product.id);
      const payload: any = {};
      if (product.name !== undefined) payload.name = product.name;
      if (product.brand !== undefined) payload.brand = product.brand;
      if (product.price !== undefined) payload.price = product.price;
      if (product.specialty !== undefined) payload.specialty = product.specialty;
      if (product.group !== undefined) payload.group_category = product.group;
      if (product.imageUrl !== undefined) payload.image_url = product.imageUrl;
      if (product.description !== undefined) payload.description = product.description;
      if (product.longDescription !== undefined) payload.long_description = product.longDescription;
      if (product.specs !== undefined) payload.specs = product.specs;
      if (product.stockStatus !== undefined) payload.stock_status = product.stockStatus;
      if (product.stockQuantity !== undefined) payload.stock_quantity = product.stockQuantity;
      if (product.status !== undefined) payload.status = product.status;
      if (product.supplier !== undefined) payload.supplier_info = product.supplier;
      if (product.rejectionReason !== undefined) payload.rejection_reason = product.rejectionReason;
      // Category fields
      if (product.category_id !== undefined) payload.category_id = product.category_id;
      if (product.subcategory_id !== undefined) payload.subcategory_id = product.subcategory_id;
      if (product.level3_category_id !== undefined) payload.level3_category_id = product.level3_category_id;
      if (product.categorySlug !== undefined) payload.category_slug = product.categorySlug;
      // Variant fields
      if (product.hasVariants !== undefined) payload.has_variants = product.hasVariants;
      if (product.richDescription !== undefined) payload.rich_description = product.richDescription;
      // Trade & Logistics fields
      if ((product as any).delivery_time !== undefined) payload.delivery_time = (product as any).delivery_time;
      if ((product as any).packaging_info !== undefined) payload.packaging_info = (product as any).packaging_info;
      if ((product as any).warranty_info !== undefined) payload.warranty_info = (product as any).warranty_info;
      if ((product as any).min_order_quantity !== undefined) payload.min_order_quantity = (product as any).min_order_quantity;
      if ((product as any).video_url !== undefined) payload.video_url = (product as any).video_url;
      if ((product as any).dimensions !== undefined) payload.dimensions = (product as any).dimensions;
      if ((product as any).certifications !== undefined) payload.certifications = (product as any).certifications;
      // SEO fields
      if (product.faq !== undefined) payload.faq = product.faq;
      if (product.metaTitle !== undefined) payload.meta_title = product.metaTitle;
      if (product.metaDescription !== undefined) payload.meta_description = product.metaDescription;
      if (product.focusKeyword !== undefined) payload.focus_keyword = product.focusKeyword;
      
      console.log('[manageProduct] Update payload:', payload);
      const { error } = await supabase.from('products').update(payload).eq('id', product.id);
      if (error) {
        console.error('[manageProduct] Failed to update product:', error);
        throw new Error(`Failed to update product: ${error.message}`);
      }
      console.log('[manageProduct] ✓ Product updated');
      
      // Update related data (images, variant attributes, SKUs)
      if (product.images !== undefined) {
        console.log('[manageProduct] Updating product images...');
        await saveProductImages(product.id, product.images);
      }
      if (product.variantAttributes !== undefined) {
        console.log('[manageProduct] Updating variant attributes...');
        await saveVariantAttributes(product.id, product.variantAttributes);
      } else {
        console.log('[manageProduct] No variant attributes to update (undefined)');
      }
      if (product.skus !== undefined) {
        console.log('[manageProduct] Updating product SKUs...');
        await saveProductSkus(product.id, product.skus);
      } else {
        console.log('[manageProduct] No SKUs to update (undefined)');
      }
      
      // Save spec templates (自动保存规格参数模板)
      if (product.specs && Object.keys(product.specs).length > 0 && product.category_id) {
        const specsArray = Object.entries(product.specs).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        this.saveSpecTemplates({
          categoryId: product.category_id,
          subcategoryId: product.subcategory_id,
          level3CategoryId: product.level3_category_id,
          specs: specsArray
        }).catch(err => console.error('Failed to save spec templates:', err));
      }
    } else if (action === 'delete' && product.id) {
      await supabase.from('products').delete().eq('id', product.id);
    }
  },

  async updateProductStatus(productId: string, status: 'Published' | 'Rejected', reason?: string): Promise<boolean> {
    try {
      const payload: any = { status };
      if (status === 'Rejected' && reason) payload.rejection_reason = reason;
      if (status === 'Published') payload.rejection_reason = null;
      const { error } = await supabase.from('products').update(payload).eq('id', productId);
      return !error;
    } catch { return false; }
  },

  async getCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase.from('courses').select('*').order('start_date', { ascending: true });
      if (error || !data || data.length === 0) return USE_MOCK_FALLBACK ? SEED_COURSES : [];
      // Map DB rows to Course objects with safe defaults for optional columns
      return data.map((c: any) => ({
        id: c.id, title: c.title, 
        title_en: c.title_en || null, title_zh: c.title_zh || null, 
        title_th: c.title_th || null, title_ja: c.title_ja || null,
        specialty: c.specialty, level: c.level,
        price: c.price, currency: c.currency || 'USD',
        price_cny: c.price_cny || null,
        price_usd: c.price_usd || null,
        price_jpy: c.price_jpy || null,
        price_thb: c.price_thb || null,
        startDate: c.start_date, endDate: c.end_date,
        location: c.location || {}, instructor: c.instructor || {},
        imageUrl: c.image_url, description: c.description,
        description_en: c.description_en || null, description_zh: c.description_zh || null, 
        description_th: c.description_th || null, description_ja: c.description_ja || null,
        status: c.status || 'published', agenda: c.agenda || [],
        maxCapacity: c.max_enrollment ?? 30,
        enrolledCount: c.current_enrollment ?? 0,
        enrollmentDeadline: c.enrollment_deadline || null,
        targetAudience: c.target_audience || 'Small Animal Veterinarians',
        targetAudience_zh: c.target_audience_zh || '小动物临床兽医',
        totalHours: c.total_hours || null,
        rejectionReason: c.rejection_reason || null,
        publishLanguage: c.publish_language || 'zh',
        teachingLanguages: c.teaching_languages || [],
        previewVideoUrl: c.preview_video_url || null,
        services: c.services || {},
        translationsComplete: c.translations_complete || false,
        translatedAt: c.translated_at || null,
      }));
    } catch { return USE_MOCK_FALLBACK ? SEED_COURSES : []; }
  },

  // Get courses by provider ID (for CourseProvider dashboard)
  async getProviderCourses(providerId: string): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      
      if (error || !data || data.length === 0) return [];
      
      // Map DB rows to Course objects with safe defaults for optional columns
      return data.map((c: any) => ({
        id: c.id, title: c.title, 
        title_zh: c.title_zh || null, title_th: c.title_th || null,
        specialty: c.specialty, level: c.level,
        price: c.price_cny || c.price, currency: 'CNY',
        startDate: c.start_date, endDate: c.end_date,
        location: c.location || {}, instructor: c.instructor || {},
        imageUrl: c.image_url, description: c.description,
        description_zh: c.description_zh || null, description_th: c.description_th || null,
        status: c.status || 'draft', agenda: c.agenda || [],
        maxCapacity: c.max_enrollment ?? 30,
        enrolledCount: c.current_enrollment ?? 0,
        enrollmentDeadline: c.enrollment_deadline || null,
        targetAudience: c.target_audience || null,
        targetAudience_zh: c.target_audience_zh || null,
        totalHours: c.total_hours || null,
        rejectionReason: c.rejection_reason || null,
        publishLanguage: c.publish_language || 'zh',
        teachingLanguages: c.teaching_languages || [],
        previewVideoUrl: c.preview_video_url || null,
        services: c.services || {},
      }));
    } catch { return []; }
  },

  // Course Search and Filter
  async searchCourses(params: {
    query?: string;
    specialty?: string;
    level?: string;
    minPrice?: number;
    maxPrice?: number;
    startDateFrom?: string;
    startDateTo?: string;
    sortBy?: 'price' | 'date' | 'title';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Course[]> {
    try {
      let query = supabase.from('courses').select('*').in('status', ['published', 'Published']);
      
      // 过滤已过期课程（end_date 为空或未过期的课程才显示）
      const today = new Date().toISOString().split('T')[0];
      query = query.or(`end_date.is.null,end_date.gte.${today}`);
      
      if (params.query) {
        query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`);
      }
      if (params.specialty) {
        query = query.eq('specialty', params.specialty);
      }
      if (params.level) {
        query = query.eq('level', params.level);
      }
      if (params.minPrice !== undefined) {
        query = query.gte('price', params.minPrice);
      }
      if (params.maxPrice !== undefined) {
        query = query.lte('price', params.maxPrice);
      }
      if (params.startDateFrom) {
        query = query.gte('start_date', params.startDateFrom);
      }
      if (params.startDateTo) {
        query = query.lte('start_date', params.startDateTo);
      }
      
      // Sorting
      const sortColumn = params.sortBy === 'price' ? 'price' : params.sortBy === 'title' ? 'title' : 'start_date';
      query = query.order(sortColumn, { ascending: params.sortOrder !== 'desc' });
      
      const { data, error } = await query;
      if (error || !data) return [];
      
      // Map DB rows to Course objects with safe defaults for optional columns
      return data.map((c: any) => ({
        id: c.id, title: c.title, 
        title_zh: c.title_zh || null, title_th: c.title_th || null,
        specialty: c.specialty, level: c.level,
        price: c.price, currency: c.currency || 'USD',
        startDate: c.start_date, endDate: c.end_date,
        location: c.location || {}, instructor: c.instructor || {},
        imageUrl: c.image_url, description: c.description,
        description_zh: c.description_zh || null, description_th: c.description_th || null,
        status: c.status || 'published', agenda: c.agenda || [],
        maxCapacity: c.max_enrollment ?? 30,
        enrolledCount: c.current_enrollment ?? 0,
        enrollmentDeadline: c.enrollment_deadline || null,
        targetAudience: c.target_audience || 'Small Animal Veterinarians',
        targetAudience_zh: c.target_audience_zh || '小动物临床兽医',
        totalHours: c.total_hours || null,
        rejectionReason: c.rejection_reason || null,
        publishLanguage: c.publish_language || 'zh',
        teachingLanguages: c.teaching_languages || [],
        previewVideoUrl: c.preview_video_url || null,
        services: c.services || {},
      }));
    } catch {
      return [];
    }
  },

  // Product Search and Filter
  async searchProducts(params: {
    query?: string;
    specialty?: string;
    group?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    stockStatus?: string;
    status?: string;
    sortBy?: 'price' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Product[]> {
    try {
      let query = supabase.from('products').select('*');
      
      if (params.query) {
        query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%,brand.ilike.%${params.query}%`);
      }
      if (params.specialty) {
        query = query.eq('specialty', params.specialty);
      }
      if (params.group) {
        query = query.eq('group_category', params.group);
      }
      if (params.brand) {
        query = query.eq('brand', params.brand);
      }
      if (params.minPrice !== undefined) {
        query = query.gte('price', params.minPrice);
      }
      if (params.maxPrice !== undefined) {
        query = query.lte('price', params.maxPrice);
      }
      if (params.stockStatus) {
        query = query.eq('stock_status', params.stockStatus);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      }
      
      // Sorting
      const sortColumn = params.sortBy === 'name' ? 'name' : 'price';
      query = query.order(sortColumn, { ascending: params.sortOrder !== 'desc' });
      
      const { data, error } = await query;
      if (error || !data) return [];
      
      return data.map(mapProduct);
    } catch {
      return [];
    }
  },

  async manageCourse(action: 'create' | 'update' | 'delete', course: Partial<Course>): Promise<void> {
    // Helper: convert empty string to null for date fields
    const toDateOrNull = (val: any) => (val && val !== '') ? val : null;
    
    if (action === 'create') {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Core payload with only columns that exist in the database
      // Optional columns (title_zh, description_zh, etc.) will be added via migration later
      const payload: Record<string, any> = {
        id: `c-${Date.now()}`,
        title: course.title,
        specialty: course.specialty,
        level: course.level,
        price: course.price,
        currency: course.currency || 'CNY',
        format: course.format || 'offline',
        start_date: toDateOrNull(course.startDate),
        end_date: toDateOrNull(course.endDate),
        location: course.location || {},
        instructor: course.instructor || {},
        image_url: course.imageUrl,
        description: course.description,
        status: course.status || 'pending',
        agenda: course.agenda || [],
        provider_id: user?.id || null,
      };
      
      // Try to add optional columns - they may not exist yet in DB
      // These will silently fail if columns don't exist, handled by wrapper
      const optionalFields: Record<string, any> = {
        title_zh: course.title_zh || null,
        title_th: course.title_th || null,
        description_zh: course.description_zh || null,
        description_th: course.description_th || null,
        max_enrollment: course.maxCapacity || 30,
        current_enrollment: 0,
        enrollment_deadline: toDateOrNull(course.enrollmentDeadline),
        target_audience: course.targetAudience || null,
        target_audience_zh: course.targetAudience_zh || null,
        total_hours: course.totalHours || null,
        // New fields
        publish_language: (course as any).publishLanguage || 'zh',
        teaching_languages: (course as any).teachingLanguages || [],
        preview_video_url: (course as any).previewVideoUrl || null,
        services: (course as any).services || {},
      };
      
      // First try with all fields
      let { error } = await supabase.from('courses').insert({ ...payload, ...optionalFields } as any);
      
      // If error mentions missing column, retry with core fields only
      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
        console.warn('Optional columns not found, retrying with core fields only');
        const retryResult = await supabase.from('courses').insert(payload as any);
        error = retryResult.error;
      }
      
      if (error) {
        console.error('Create course error:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Failed to create course');
      }
    } else if (action === 'update' && course.id) {
      // Core fields that definitely exist
      const corePayload: Record<string, any> = {
        title: course.title,
        specialty: course.specialty,
        level: course.level,
        price: course.price,
        currency: course.currency,
        start_date: toDateOrNull(course.startDate),
        end_date: toDateOrNull(course.endDate),
        location: course.location,
        instructor: course.instructor,
        image_url: course.imageUrl,
        description: course.description,
        status: course.status,
        agenda: course.agenda,
      };
      
      // Optional fields that may not exist in DB yet
      const optionalPayload: Record<string, any> = {
        title_zh: course.title_zh,
        title_th: course.title_th,
        description_zh: course.description_zh,
        description_th: course.description_th,
        max_enrollment: course.maxCapacity,
        enrollment_deadline: toDateOrNull(course.enrollmentDeadline),
        target_audience: course.targetAudience,
        target_audience_zh: course.targetAudience_zh,
        total_hours: course.totalHours,
        rejection_reason: course.rejectionReason,
        // New fields
        publish_language: (course as any).publishLanguage,
        teaching_languages: (course as any).teachingLanguages,
        preview_video_url: (course as any).previewVideoUrl,
        services: (course as any).services,
      };
      
      // Remove undefined values
      Object.keys(corePayload).forEach(key => corePayload[key] === undefined && delete corePayload[key]);
      Object.keys(optionalPayload).forEach(key => optionalPayload[key] === undefined && delete optionalPayload[key]);
      
      // Try with all fields first
      let { error } = await supabase.from('courses').update({ ...corePayload, ...optionalPayload } as any).eq('id', course.id);
      
      // If error mentions missing column, retry with core fields only
      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
        console.warn('Optional columns not found, retrying with core fields only');
        const retryResult = await supabase.from('courses').update(corePayload as any).eq('id', course.id);
        error = retryResult.error;
      }
      
      if (error) {
        console.error('Update course error:', error);
        throw error;
      }
    } else if (action === 'delete' && course.id) {
      await supabase.from('courses').delete().eq('id', course.id);
    }
  },

  async getPosts(): Promise<Post[]> {
    try {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return USE_MOCK_FALLBACK ? SEED_POSTS : [];
      return data.map((p: any) => ({
        id: p.id, title: p.title, content: p.content, specialty: p.specialty,
        media: p.media || [], stats: p.stats || { likes: 0, comments: 0, saves: 0 },
        createdAt: new Date(p.created_at).toLocaleDateString(),
        isAiAnalyzed: p.is_ai_analyzed, author: p.author_info,
        patientInfo: p.patient_info, sections: p.sections
      }));
    } catch { return USE_MOCK_FALLBACK ? SEED_POSTS : []; }
  },

  async createPost(post: Partial<Post>, user: any): Promise<void> {
    const newPost = {
      id: `post-${Date.now()}`, author_id: user.id, author_info: post.author,
      title: post.title, content: post.content, specialty: post.specialty,
      media: post.media, patient_info: post.patientInfo, sections: post.sections,
      is_ai_analyzed: true, stats: { likes: 0, comments: 0, saves: 0 }
    };
    await supabase.from('posts').insert(newPost);
    await this.awardPoints(user.id, 200, "Publishing Clinical Case");
  },

  // =====================================================
  // POST INTERACTIONS (Likes, Saves - Database-backed)
  // =====================================================
  async interactWithPost(postId: string, type: 'like' | 'save', userId?: string): Promise<{ success: boolean; newCount: number }> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      
      if (!userId) return { success: false, newCount: 0 };
      
      // Check if interaction already exists
      const { data: existing } = await supabase
        .from('post_interactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('interaction_type', type)
        .single();
      
      if (existing) {
        // Remove interaction (toggle off)
        await supabase.from('post_interactions').delete().eq('id', existing.id);
      } else {
        // Add interaction
        await supabase.from('post_interactions').insert({
          post_id: postId,
          user_id: userId,
          interaction_type: type
        });
      }
      
      // Get updated count
      const { count } = await supabase
        .from('post_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('interaction_type', type);
      
      return { success: true, newCount: count || 0 };
    } catch (e) {
      console.error('Post interaction error:', e);
      return { success: false, newCount: 0 };
    }
  },

  async getUserInteractions(postIds: string[], userId?: string): Promise<Record<string, { liked: boolean; saved: boolean }>> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      
      if (!userId) return {};
      
      const { data } = await supabase
        .from('post_interactions')
        .select('post_id, interaction_type')
        .eq('user_id', userId)
        .in('post_id', postIds);
      
      const result: Record<string, { liked: boolean; saved: boolean }> = {};
      postIds.forEach(id => { result[id] = { liked: false, saved: false }; });
      
      data?.forEach((i: any) => {
        if (result[i.post_id]) {
          if (i.interaction_type === 'like') result[i.post_id].liked = true;
          if (i.interaction_type === 'save') result[i.post_id].saved = true;
        }
      });
      
      return result;
    } catch {
      return {};
    }
  },

  // =====================================================
  // POST COMMENTS (Database-backed)
  // =====================================================
  async addComment(postId: string, content: string, user: any, parentId?: string): Promise<any> {
    try {
      const newComment = {
        post_id: postId,
        user_id: user.id,
        author_name: user.name || user.email?.split('@')[0] || 'Anonymous',
        author_avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random`,
        content,
        parent_id: parentId || null
      };
      
      const { data, error } = await supabase
        .from('post_comments')
        .insert(newComment)
        .select()
        .single();
      
      if (error) throw error;
      
      // Award points for commenting
      await this.awardPoints(user.id, 10, 'Commenting on clinical case');
      
      return {
        id: data.id,
        postId: data.post_id,
        authorName: data.author_name,
        authorAvatar: data.author_avatar,
        content: data.content,
        parentId: data.parent_id,
        createdAt: data.created_at
      };
    } catch (e) {
      console.error('Add comment error:', e);
      return null;
    }
  },

  async getComments(postId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) return [];
      
      return data.map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        authorName: c.author_name,
        authorAvatar: c.author_avatar,
        content: c.content,
        parentId: c.parent_id,
        createdAt: c.created_at
      }));
    } catch {
      return [];
    }
  },

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);
      
      return !error;
    } catch {
      return false;
    }
  },

  async getShippingTemplates(): Promise<ShippingTemplate[]> {
    const { data, error } = await supabase.from('shipping_templates').select('*');
    if (error || !data) return [];
    return data.map((t: any) => ({ id: t.id, name: t.name, regionCode: t.region_code, baseFee: t.base_fee, perItemFee: t.per_item_fee, currency: 'CNY', estimatedDays: t.estimated_days }));
  },

  async saveShippingTemplate(template: ShippingTemplate): Promise<void> {
    const payload = { id: template.id, name: template.name, region_code: template.regionCode, base_fee: template.baseFee, per_item_fee: template.perItemFee, estimated_days: template.estimatedDays };
    const { error } = await supabase.from('shipping_templates').upsert(payload);
    if (error) throw error;
  },

  async deleteShippingTemplate(id: string): Promise<void> {
    await supabase.from('shipping_templates').delete().eq('id', id);
  },

  async createLead(data: Partial<Lead>): Promise<void> {
    const newLead = { id: `LEAD-${Date.now()}`, source: 'AI Chat', contact_info: data.contactInfo || 'Unknown', interest_summary: data.interestSummary || 'General Inquiry', full_chat_log: data.fullChatLog || [], status: 'New', organization: data.organization, created_at: new Date().toISOString() };
    await supabase.from('leads').insert(newLead);
  },

  async getLeads(): Promise<Lead[]> {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data.map((l: any) => ({ id: l.id, source: l.source, contactInfo: l.contact_info, interestSummary: l.interest_summary, fullChatLog: l.full_chat_log, status: l.status, createdAt: l.created_at, organization: l.organization }));
  },

  async updateLeadStatus(id: string, status: 'New' | 'Contacted' | 'Converted' | 'Archived'): Promise<void> {
    await supabase.from('leads').update({ status }).eq('id', id);
  },

  async createQuote(items: CartItem[], totalAmount: number, clinicInfo: any): Promise<{ quoteId: string }> {
    const quoteId = `QT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    const quotePayload = { id: quoteId, customer_email: clinicInfo.customerEmail, customer_info: clinicInfo, items, total_amount: totalAmount, status: 'Active', valid_until: validUntil.toISOString(), created_at: new Date().toISOString() };
    await supabase.from('quotes').insert(quotePayload);
    return { quoteId };
  },

  async getQuotes(email?: string): Promise<Quote[]> {
    let query = supabase.from('quotes').select('*').order('created_at', { ascending: false });
    if (email) query = query.eq('customer_email', email);
    const { data, error } = await query;
    if (error) return [];
    return data.map((q: any) => ({ id: q.id, customerEmail: q.customer_email, customerInfo: q.customer_info, items: q.items || [], totalAmount: q.total_amount, status: q.status, validUntil: q.valid_until, createdAt: q.created_at }));
  },

  async createOrder(items: CartItem[], totalAmount: number, clinicInfo: any): Promise<{ orderId: string }> {
    // Validate capacity for course items before creating order
    const courseItems = items.filter(item => item.type === 'course');
    for (const item of courseItems) {
      const { data: course } = await supabase.from('courses').select('id, title, max_enrollment, current_enrollment, enrollment_deadline').eq('id', item.id).single();
      if (course) {
        const maxEnroll = course.max_enrollment || 30;
        const currentEnroll = course.current_enrollment || 0;
        if (currentEnroll >= maxEnroll) {
          throw new Error(`Course "${course.title}" is fully booked (${currentEnroll}/${maxEnroll}).`);
        }
        if (course.enrollment_deadline && new Date(course.enrollment_deadline) < new Date()) {
          throw new Error(`Enrollment deadline for "${course.title}" has passed.`);
        }
      }
    }

    const orderId = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: { user } } = await supabase.auth.getUser();
    const orderPayload = { id: orderId, user_id: user?.id, customer_name: clinicInfo.doctorName || 'Unknown Doctor', customer_email: clinicInfo.customerEmail, items, total_amount: totalAmount, status: 'Pending', date: new Date().toISOString().split('T')[0], shipping_address: clinicInfo.address || 'Unknown Address' };
    const { error } = await supabase.from('orders').insert(orderPayload);
    if (error) throw error;
    
    // Create enrollment records for course items
    if (user?.id) {
      for (const course of courseItems) {
        await this.createEnrollment(user.id, course.id, orderId);
      }
    }
    
    return { orderId };
  },

  // Course Enrollment Functions
  async createEnrollment(userId: string, courseId: string, orderId: string): Promise<void> {
    const { error } = await supabase.from('course_enrollments').insert({
      user_id: userId,
      course_id: courseId,
      order_id: orderId,
      payment_status: 'pending',
      completion_status: 'enrolled'
    });
    if (error && !error.message.includes('duplicate')) {
      console.error('Enrollment creation error:', error);
    }
  },

  async getEnrollments(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', userId)
        .order('enrollment_date', { ascending: false });
      
      if (error || !data) return [];
      
      // Fetch course details for each enrollment
      const enrollmentsWithCourses = await Promise.all(
        data.map(async (enrollment: any) => {
          const courses = await this.getCourses();
          const course = courses.find(c => c.id === enrollment.course_id);
          return {
            id: enrollment.id,
            courseId: enrollment.course_id,
            orderId: enrollment.order_id,
            paymentStatus: enrollment.payment_status,
            enrollmentDate: enrollment.enrollment_date,
            completionStatus: enrollment.completion_status,
            certificateIssued: enrollment.certificate_issued,
            course: course || null
          };
        })
      );
      
      return enrollmentsWithCourses;
    } catch {
      return [];
    }
  },

  async getCourseEnrollments(courseId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .order('enrollment_date', { ascending: false });
      
      if (error || !data) return [];
      return data.map((e: any) => ({
        id: e.id,
        userId: e.user_id,
        paymentStatus: e.payment_status,
        enrollmentDate: e.enrollment_date,
        completionStatus: e.completion_status
      }));
    } catch {
      return [];
    }
  },

  async updateEnrollmentPaymentStatus(enrollmentId: string, status: 'pending' | 'paid' | 'refunded'): Promise<void> {
    await supabase.from('course_enrollments').update({ payment_status: status }).eq('id', enrollmentId);
  },

  async updateEnrollmentsByOrderId(orderId: string, paymentStatus: 'paid' | 'refunded'): Promise<void> {
    await supabase.from('course_enrollments').update({ payment_status: paymentStatus }).eq('order_id', orderId);
  },

  async getOrders(userEmail?: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((o: any) => ({ id: o.id, customerName: o.customer_name, customerEmail: o.customer_email, items: o.items || [], totalAmount: o.total_amount, currency: o.currency || 'USD', status: o.status, date: o.date || o.created_at, shippingAddress: o.shipping_address }));
    } catch { return []; }
  },

  async updateOrderStatus(orderId: string, status: 'Paid' | 'Shipped' | 'Completed'): Promise<void> {
    await supabase.from('orders').update({ status }).eq('id', orderId);
  },

  // ==========================================
  // Course Order Management
  // ==========================================

  async getCourseOrders(): Promise<any[]> {
    try {
      // Get all orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !orders) return [];

      // Filter to only course orders
      const courseOrders = orders.filter((o: any) =>
        (o.items || []).some((item: any) => item.type === 'course')
      );

      // Get all enrollments for these orders
      const orderIds = courseOrders.map((o: any) => o.id);
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('*')
        .in('order_id', orderIds.length > 0 ? orderIds : ['__none__']);

      const enrollmentMap = new Map<string, any[]>();
      (enrollments || []).forEach((e: any) => {
        const list = enrollmentMap.get(e.order_id) || [];
        list.push({
          id: e.id,
          courseId: e.course_id,
          paymentStatus: e.payment_status,
          completionStatus: e.completion_status,
          certificateIssued: e.certificate_issued,
          enrollmentDate: e.enrollment_date,
        });
        enrollmentMap.set(e.order_id, list);
      });

      return courseOrders.map((o: any) => ({
        id: o.id,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        items: o.items || [],
        totalAmount: o.total_amount,
        status: o.status,
        date: o.date || o.created_at,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        currency: o.currency || 'CNY',
        refundStatus: o.refund_status,
        enrollments: enrollmentMap.get(o.id) || [],
      }));
    } catch {
      return [];
    }
  },

  async getCourseOrderDetail(orderId: string): Promise<any | null> {
    try {
      // Get order
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error || !order) return null;

      // Get enrollments
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('order_id', orderId);

      // Get course details for each enrollment
      const courseIds = (enrollments || []).map((e: any) => e.course_id);
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, title_zh, start_date, end_date, location, provider_id, specialty, price, max_enrollment, current_enrollment')
        .in('id', courseIds.length > 0 ? courseIds : ['__none__']);

      const courseMap = new Map<string, any>();
      (courses || []).forEach((c: any) => courseMap.set(c.id, c));

      return {
        id: order.id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        items: order.items || [],
        totalAmount: order.total_amount,
        status: order.status,
        date: order.date || order.created_at,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        paidAt: order.paid_at,
        currency: order.currency || 'CNY',
        refundStatus: order.refund_status,
        refundedAmount: order.refunded_amount,
        enrollments: (enrollments || []).map((e: any) => ({
          id: e.id,
          courseId: e.course_id,
          paymentStatus: e.payment_status,
          completionStatus: e.completion_status,
          certificateIssued: e.certificate_issued,
          enrollmentDate: e.enrollment_date,
          course: courseMap.get(e.course_id) || null,
        })),
      };
    } catch {
      return null;
    }
  },

  async confirmEnrollment(enrollmentId: string, action: 'confirm' | 'complete' | 'issue_cert'): Promise<boolean> {
    try {
      const updates: Record<string, any> = {};
      if (action === 'confirm') {
        updates.completion_status = 'in_progress';
      } else if (action === 'complete') {
        updates.completion_status = 'completed';
      } else if (action === 'issue_cert') {
        updates.certificate_issued = true;
      }
      const { error } = await supabase
        .from('course_enrollments')
        .update(updates)
        .eq('id', enrollmentId);
      return !error;
    } catch {
      return false;
    }
  },

  async initiateStripePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/payment/stripe/create-intent`, { method: 'POST', headers, body: JSON.stringify({ orderId, amount, currency }) });
      if (!response.ok) throw new Error('Stripe backend initialization failed');
      return await response.json();
    } catch { return { mock: true }; }
  },

  async createStripeCheckoutSession(orderId: string, items: CartItem[]): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/payment/stripe/create-checkout-session`, { method: 'POST', headers, body: JSON.stringify({ orderId, items, returnUrl: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '' }) });
      if (!response.ok) throw new Error('Failed to create Checkout session');
      return await response.json();
    } catch { return { mock: true }; }
  },

  async initiatePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/payment/airwallex/create-intent`, { method: 'POST', headers, body: JSON.stringify({ orderId, amount, currency, description: `VetSphere Order #${orderId}` }) });
      if (!response.ok) throw new Error('Backend payment initialization failed');
      return await response.json();
    } catch { return { status: 'success', mock: true, client_secret: 'mock_secret_123' }; }
  },

  async verifyPayment(orderId: string): Promise<boolean> {
    await this.updateOrderStatus(orderId, 'Paid');
    return true;
  },

  async login(email: string, password?: string): Promise<{ token: string; user: any }> {
    if (!password) throw new Error("Password is required");
    
    // Try to sign in with existing account
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Handle "Email not confirmed" for previously registered but unconfirmed users
    if (error && error.message.includes('Email not confirmed')) {
      await this._autoConfirmAndRetry(email);
      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (retry.error) throw new Error(retry.error.message);
      data = { user: retry.data.user, session: retry.data.session };
      error = null;
    }

    // Authentication failed - show appropriate error message
    if (error || !data.user) {
      // Map Supabase errors to user-friendly messages
      if (error?.status === 400 || error?.message?.includes('Invalid')) {
        throw new Error("Invalid email or password. Please try again.");
      }
      throw new Error(error?.message || "Authentication failed. Please check your credentials.");
    }
    
    return { 
      token: data.session?.access_token || "", 
      user: { 
        id: data.user.id, 
        email: data.user.email, 
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0], 
        role: data.user.user_metadata?.role || 'Doctor', 
        points: 500, 
        level: 'Resident' 
      } 
    };
  },

  async _autoConfirmAndRetry(email: string): Promise<void> {
    const res = await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to confirm email. Please contact support.');
    }
  },

  // =====================================================
  // USER PROFILE MANAGEMENT
  // =====================================================
  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        // Return default profile if not found
        return {
          id: userId,
          displayName: '',
          avatarUrl: '',
          hospital: '',
          specialty: '',
          bio: '',
          phone: '',
          role: 'Doctor'
        };
      }
      
      return {
        id: data.id,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        hospital: data.hospital,
        specialty: data.specialty,
        bio: data.bio,
        phone: data.phone,
        role: data.role
      };
    } catch {
      return null;
    }
  },

  async saveUserProfile(userId: string, profile: {
    displayName?: string;
    avatarUrl?: string;
    hospital?: string;
    specialty?: string;
    bio?: string;
    phone?: string;
  }): Promise<boolean> {
    try {
      const payload = {
        id: userId,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        hospital: profile.hospital,
        specialty: profile.specialty,
        bio: profile.bio,
        phone: profile.phone,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'id' });
      
      if (error) {
        console.error('Save profile error:', error);
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Save profile error:', e);
      return false;
    }
  },

  async updateUserAvatar(userId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      await this.saveUserProfile(userId, { avatarUrl: publicUrl });

      return publicUrl;
    } catch {
      return null;
    }
  },

  async addToLearningPlan(courseId: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/learning/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ course_id: courseId, progress_percent: 0 })
    });
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || '加入学习计划失败');
    }
    return result.data;
  },

  async getLearningProgress(): Promise<{ items: any[]; stats: { total_courses: number; completed_courses: number; total_study_time_minutes: number } }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/learning/progress', {
        method: 'GET',
        headers
      });
      const result = await response.json();
      if (result.code === 200 && result.data) {
        return result.data;
      }
      return { items: [], stats: { total_courses: 0, completed_courses: 0, total_study_time_minutes: 0 } };
    } catch {
      return { items: [], stats: { total_courses: 0, completed_courses: 0, total_study_time_minutes: 0 } };
    }
  },

  // =====================================================
  // SPEC TEMPLATES (规格参数模板)
  // =====================================================

  async saveSpecTemplates(params: {
    categoryId: string;
    subcategoryId?: string | null;
    level3CategoryId?: string | null;
    specs: Array<{ key: string; value: string }>;
  }): Promise<void> {
    try {
      // 将数组转换为 JSONB 格式
      const specsJson = JSON.stringify(params.specs);
      
      // 去掉 'cat-' 前缀，因为数据库存储的是 slug
      const categoryId = params.categoryId?.startsWith('cat-') ? params.categoryId.substring(4) : params.categoryId;
      const subcategoryId = params.subcategoryId?.startsWith('cat-') ? params.subcategoryId.substring(4) : params.subcategoryId;
      const level3CategoryId = params.level3CategoryId?.startsWith('cat-') ? params.level3CategoryId.substring(4) : params.level3CategoryId;
      
      const { data, error } = await supabase.rpc('save_spec_templates', {
        p_category_id: categoryId,
        p_subcategory_id: subcategoryId || null,
        p_level3_category_id: level3CategoryId || null,
        p_specs: specsJson
      });
      
      if (error) {
        console.error('Failed to save spec templates:', error);
      } else {
        console.log('[API] Spec templates saved successfully:', data);
      }
    } catch (err) {
      console.error('Failed to save spec templates:', err);
      throw err;
    }
  },

  async getSpecTemplates(params: {
    categoryId: string;
    subcategoryId?: string | null;
    level3CategoryId?: string | null;
  }): Promise<Array<{
    id: string;
    specName: string;
    specNameEn?: string;
    unit?: string;
    inputType: string;
    isRequired: boolean;
    displayOrder: number;
    values: string[];
  }>> {
    try {
      // 去掉 'cat-' 前缀，因为数据库存储的是 slug
      const categoryId = params.categoryId?.startsWith('cat-') ? params.categoryId.substring(4) : params.categoryId;
      const subcategoryId = params.subcategoryId?.startsWith('cat-') ? params.subcategoryId.substring(4) : params.subcategoryId;
      const level3CategoryId = params.level3CategoryId?.startsWith('cat-') ? params.level3CategoryId.substring(4) : params.level3CategoryId;
      
      const { data, error } = await supabase.rpc('get_spec_templates', {
        p_category_id: categoryId,
        p_subcategory_id: subcategoryId || null,
        p_level3_category_id: level3CategoryId || null
      });
      
      if (error || !data) {
        return [];
      }
      
      return data.map((t: any) => ({
        id: t.id,
        specName: t.spec_name,
        specNameEn: t.spec_name_en,
        unit: t.unit,
        inputType: t.input_type || 'text',
        isRequired: t.is_required || false,
        displayOrder: t.display_order || 0,
        values: t.spec_values || []
      }));
    } catch {
      return [];
    }
  }
};
