import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/v1/products/[id]/skus/batch
 * 
 * Batch save/update SKUs for a product
 * Body:
 * {
 *   skus: Array<{
 *     id?: string,
 *     sku_code: string,
 *     attributes: JSONB,
 *     price: number,
 *     stock: number,
 *     image_url?: string,
 *     is_active?: boolean
 *   }>,
 *   variantAttributes?: Array<{
 *     name: string,
 *     values: string[]
 *   }>
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await req.json();
    const { skus, variantAttributes } = body;
    
    if (!skus || !Array.isArray(skus)) {
      return NextResponse.json(
        { success: false, error: 'SKUs array is required' },
        { status: 400 }
      );
    }
    
    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, has_variants')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Start a transaction
    const results = [];
    
    for (const skuData of skus) {
      const { id: skuId, ...updateData } = skuData;
      
      if (skuId) {
        // Update existing SKU
        const { data, error } = await supabase
          .from('product_skus')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', skuId)
          .eq('product_id', productId)
          .select()
          .single();
        
        if (error) {
          console.error('Failed to update SKU:', error);
          results.push({ success: false, error: error.message, sku_id: skuId });
        } else {
          results.push({ success: true, data, action: 'updated' });
        }
      } else {
        // Create new SKU
        const newSkuData = {
          ...updateData,
          id: crypto.randomUUID(),
          product_id: productId,
          is_active: updateData.is_active !== undefined ? updateData.is_active : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('product_skus')
          .insert(newSkuData)
          .select()
          .single();
        
        if (error) {
          console.error('Failed to create SKU:', error);
          results.push({ success: false, error: error.message });
        } else {
          results.push({ success: true, data, action: 'created' });
        }
      }
    }
    
    // Update variant attributes if provided
    if (variantAttributes && Array.isArray(variantAttributes)) {
      // First, delete existing variant attributes for this product
      await supabase
        .from('product_variant_attributes')
        .delete()
        .eq('product_id', productId);
      
      // Then insert new ones
      const variantAttrsToInsert = variantAttributes.flatMap((attr: any) => 
        attr.values.map((value: string) => ({
          id: crypto.randomUUID(),
          product_id: productId,
          attribute_name: attr.name,
          attribute_value: value,
          created_at: new Date().toISOString()
        }))
      );
      
      if (variantAttrsToInsert.length > 0) {
        const { error: attrError } = await supabase
          .from('product_variant_attributes')
          .insert(variantAttrsToInsert);
        
        if (attrError) {
          console.error('Failed to save variant attributes:', attrError);
        }
      }
      
      // Update product's has_variants flag
      await supabase
        .from('products')
        .update({
          has_variants: true,
          variant_attributes: JSON.stringify(variantAttributes),
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
    }
    
    // Update product price range and stock
    const activeSkus = skus.filter(s => s.is_active !== false);
    if (activeSkus.length > 0) {
      const prices = activeSkus.map(s => s.price).filter(p => p !== undefined);
      const stocks = activeSkus.map(s => s.stock || 0);
      
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
    
    return NextResponse.json({
      success: true,
      results,
      message: `Successfully processed ${skus.length} SKUs`
    });
    
  } catch (error) {
    console.error('Failed to batch save SKUs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save SKUs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
