import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/v1/products/[id]/skus/[sku_id]
 * 
 * Get single SKU details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sku_id: string }> }
) {
  try {
    const { id: productId, sku_id: skuId } = await params;
    
    const { data, error } = await supabase
      .from('product_skus')
      .select('*')
      .eq('id', skuId)
      .eq('product_id', productId)
      .single();
    
    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'SKU not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Failed to fetch SKU:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch SKU',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/products/[id]/skus/[sku_id]
 * 
 * Update single SKU
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sku_id: string }> }
) {
  try {
    const { id: productId, sku_id: skuId } = await params;
    const body = await req.json();
    
    const { data, error } = await supabase
      .from('product_skus')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', skuId)
      .eq('product_id', productId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update product price range and stock
    await updateProductPriceRange(productId);
    
    return NextResponse.json({
      success: true,
      data,
      message: 'SKU updated successfully'
    });
    
  } catch (error) {
    console.error('Failed to update SKU:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update SKU',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/products/[id]/skus/[sku_id]
 * 
 * Delete single SKU
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sku_id: string }> }
) {
  try {
    const { id: productId, sku_id: skuId } = await params;
    
    const { error } = await supabase
      .from('product_skus')
      .delete()
      .eq('id', skuId)
      .eq('product_id', productId);
    
    if (error) throw error;
    
    // Update product price range and stock
    await updateProductPriceRange(productId);
    
    return NextResponse.json({
      success: true,
      message: 'SKU deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete SKU:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete SKU',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * Helper function to update product price range based on SKUs
 */
async function updateProductPriceRange(productId: string) {
  try {
    const { data: skus } = await supabase
      .from('product_skus')
      .select('price, stock')
      .eq('product_id', productId)
      .eq('is_active', true);
    
    if (skus && skus.length > 0) {
      const prices = skus.map(s => s.price).filter((p): p is number => p !== null && p !== undefined);
      const stocks = skus.map(s => s.stock || 0);
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        await supabase
          .from('products')
          .update({
            price_min: minPrice,
            price_max: maxPrice,
            total_stock: stocks.reduce((sum, s) => sum + s, 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', productId);
      }
    }
  } catch (error) {
    console.error('Failed to update product price range:', error);
  }
}
