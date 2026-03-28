import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/v1/products/[id]/submit
 * 
 * Submit product for review
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current product to verify ownership
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('supplier_id, audit_status')
      .eq('id', id)
      .single();
    
    if (fetchError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Check if product is already under review
    if (product.audit_status === 'pending_review') {
      return NextResponse.json(
        { success: false, error: 'Product is already under review' },
        { status: 400 }
      );
    }
    
    // Update product status to pending_review
    const { data, error } = await supabase
      .from('products')
      .update({
        audit_status: 'pending_review',
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // TODO: Send notification to admin
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Product submitted for review successfully'
    });
    
  } catch (error) {
    console.error('Failed to submit product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit product',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
