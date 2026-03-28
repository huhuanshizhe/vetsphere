import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/v1/inquiries
 * 
 * Submit a product inquiry
 * Body:
 * {
 *   product_id: string,
 *   sku_id?: string,
 *   name: string,
 *   email: string,
 *   company?: string,
 *   country?: string,
 *   phone?: string,
 *   message: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    const { product_id, name, email, message } = body;
    
    if (!product_id || !name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, supplier_id, name')
      .eq('id', product_id)
      .single();
    
    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create inquiry
    const inquiryData = {
      id: crypto.randomUUID(),
      product_id,
      user_id: user?.id || null,
      sku_id: body.sku_id || null,
      name,
      email,
      company: body.company || null,
      country: body.country || null,
      phone: body.phone || null,
      message,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('product_inquiries')
      .insert(inquiryData)
      .select()
      .single();
    
    if (error) throw error;
    
    // TODO: Send email notification to supplier
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Inquiry submitted successfully'
    });
    
  } catch (error) {
    console.error('Failed to submit inquiry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit inquiry',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
