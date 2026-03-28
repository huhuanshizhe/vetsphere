import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/v1/products
 * 
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - category: string (category slug or id)
 * - subcategory: string (subcategory slug or id)
 * - brand: string
 * - search: string (search in name, brand, description)
 * - min_price: number
 * - max_price: number
 * - has_price: boolean (filter products with/without price)
 * - is_featured: boolean
 * - is_new: boolean
 * - sort: string (newest, price_asc, price_desc, popularity)
 * - site_code: string (cn, intl, global - default: intl)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Filters
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const brand = searchParams.get('brand');
    const searchQuery = searchParams.get('search');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const hasPrice = searchParams.get('has_price');
    const isFeatured = searchParams.get('is_featured');
    const isNew = searchParams.get('is_new');
    const sort = searchParams.get('sort') || 'newest';
    const siteCode = searchParams.get('site_code') || 'intl';
    
    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });
    
    // Site filtering - check if product is published to this site
    if (siteCode) {
      query = query.eq(`published_sites->>${siteCode}`, 'true');
    }
    
    // Status filter - only show published products
    query = query.eq('audit_status', 'published');
    
    // Category filters
    if (category) {
      query = query.or(`category_id.eq.${category},category_slug.eq.${category}`);
    }
    if (subcategory) {
      query = query.or(`subcategory_id.eq.${subcategory},sub_category.eq.${subcategory}`);
    }
    
    // Brand filter
    if (brand) {
      query = query.eq('brand', brand);
    }
    
    // Search filter
    if (searchQuery) {
      // Simple text search - in production, use PostgreSQL full-text search
      query = query.or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    // Price filters
    if (minPrice) {
      query = query.gte('price_min', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('price_max', parseFloat(maxPrice));
    }
    
    // Boolean filters
    if (hasPrice !== null) {
      query = query.eq('has_price', hasPrice === 'true');
    }
    if (isFeatured !== null) {
      query = query.eq('is_featured', isFeatured === 'true');
    }
    if (isNew !== null) {
      query = query.eq('is_new', isNew === 'true');
    }
    
    // Sorting
    switch (sort) {
      case 'newest':
        query = query.order('published_at', { ascending: false });
        break;
      case 'price_asc':
        query = query.order('price_min', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price_min', { ascending: false });
        break;
      case 'popularity':
        query = query.order('view_count', { ascending: false });
        break;
      default:
        query = query.order('sort_order', { ascending: true });
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/products
 * 
 * Create a new product (for supplier backend)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      );
    }
    
    // Set default values
    const productData = {
      ...body,
      id: body.id || crypto.randomUUID(),
      status: body.status || 'draft',
      audit_status: body.audit_status || 'draft',
      has_variants: body.has_variants || false,
      has_price: body.has_price !== undefined ? body.has_price : true,
      currency: body.currency || 'USD',
      published_sites: body.published_sites || { cn: false, intl: false, global: false },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Product created successfully'
    });
    
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
