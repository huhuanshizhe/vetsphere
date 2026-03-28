import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/v1/products/[id]
 * 
 * Get product details by ID or slug
 * Query parameters:
 * - site_code: string (cn, intl, global)
 * - lang: string (zh, en, th, ja)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteCode = searchParams.get('site_code') || 'intl';
    const lang = searchParams.get('lang') || 'en';
    
    // Determine if id is UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let query;
    if (isUuid) {
      query = supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
    } else {
      // Try to find by slug
      query = supabase
        .from('products')
        .select('*')
        .eq('slug', id)
        .single();
    }
    
    const { data: product, error } = await query;
    
    if (error || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Check if product is published to the requested site
    const publishedSites = product.published_sites || {};
    if (!publishedSites[siteCode]) {
      return NextResponse.json(
        { success: false, error: 'Product not available on this site' },
        { status: 404 }
      );
    }
    
    // Check if product is published
    if (product.audit_status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Product not available' },
        { status: 404 }
      );
    }
    
    // Get localized content based on language
    const localizedProduct = {
      ...product,
      // Use localized fields if available, fallback to base fields
      name: product[`name_${lang}`] || product.name,
      brand: product[`brand_${lang}`] || product.brand,
      description: product[`description_${lang}`] || product.description,
      rich_description: product[`rich_description_${lang}`] || product.rich_description,
      subtitle: product[`subtitle_${lang}`] || product.subtitle,
      meta_title: product[`meta_title_${lang}`] || product.meta_title,
      meta_description: product[`meta_description_${lang}`] || product.meta_description,
      packaging_info: product[`packaging_info_${lang}`] || product.packaging_info,
      delivery_time: product[`delivery_time_${lang}`] || product.delivery_time,
      warranty_info: product[`warranty_info_${lang}`] || product.warranty_info,
    };
    
    // Get SKU data if product has variants
    let skus = [];
    if (product.has_variants) {
      const { data: skuData } = await supabase
        .from('product_skus')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true);
      
      skus = skuData || [];
    }
    
    // Get product images
    const { data: images } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true });
    
    // Get specifications
    const { data: specifications } = await supabase
      .from('specification_definitions')
      .select(`
        *,
        spec_values:specification_values(*)
      `)
      .eq('product_id', product.id);
    
    // Increment view count (async, don't wait)
    supabase
      .from('products')
      .update({ view_count: product.view_count + 1 })
      .eq('id', product.id);
    
    return NextResponse.json({
      success: true,
      data: {
        ...localizedProduct,
        skus,
        images: images || [],
        specifications: specifications || []
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/products/[id]
 * 
 * Update product (for supplier/admin backend)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Remove fields that shouldn't be updated directly
    const { id: _, created_at, ...updateData } = body;
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Product updated successfully'
    });
    
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/products/[id]
 * 
 * Soft delete product
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Soft delete - set deleted_at and is_deleted
    const { error } = await supabase
      .from('products')
      .update({
        deleted_at: new Date().toISOString(),
        is_deleted: true,
        status: 'offline',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
