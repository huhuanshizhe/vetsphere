import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch all inquiries for admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = searchParams.get('limit');

    let query = supabase
      .from('inquiry_requests')
      .select(`
        *,
        product:products(id, name, brand, image_url)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inquiries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inquiries' },
        { status: 500 }
      );
    }

    // Map database fields to client format
    const inquiries = data.map(item => ({
      id: item.id,
      productId: item.product_id,
      customerName: item.customer_name,
      customerEmail: item.customer_email,
      customerPhone: item.customer_phone,
      companyName: item.company_name,
      clinicName: item.clinic_name,
      country: item.country,
      estimatedPurchaseTime: item.estimated_purchase_time,
      budgetRange: item.budget_range,
      quantity: item.quantity,
      message: item.message,
      status: item.status,
      priority: item.priority,
      inquiryType: item.inquiry_type,
      assignedTo: item.assigned_to,
      assignedAt: item.assigned_at,
      adminNotes: item.admin_notes,
      internalNotes: item.internal_notes,
      followUpDate: item.follow_up_date,
      lastContactDate: item.last_contact_date,
      contactCount: item.contact_count,
      createdAt: item.created_at,
      repliedAt: item.replied_at,
      product: item.product ? {
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        imageUrl: item.product.image_url,
      } : null,
    }));

    return NextResponse.json({ inquiries });

  } catch (error) {
    console.error('Admin inquiries API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update inquiry status, priority, assignment, etc.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, priority, assignedTo, internalNotes, followUpDate } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Inquiry ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo || null;
      if (assignedTo) {
        updateData.assigned_at = new Date().toISOString();
      }
    }
    if (internalNotes !== undefined) updateData.internal_notes = internalNotes;
    if (followUpDate !== undefined) updateData.follow_up_date = followUpDate || null;

    // If status is being changed to 'contacted', update last_contact_date and contact_count
    if (status === 'contacted') {
      updateData.last_contact_date = new Date().toISOString();
      // Increment contact count
      const { data: current } = await supabase
        .from('inquiry_requests')
        .select('contact_count')
        .eq('id', id)
        .single();
      updateData.contact_count = (current?.contact_count || 0) + 1;
    }

    const { error } = await supabase
      .from('inquiry_requests')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating inquiry:', error);
      return NextResponse.json(
        { error: 'Failed to update inquiry' },
        { status: 500 }
      );
    }

    // Log activity (if the table exists)
    try {
      await supabase.from('inquiry_activities').insert({
        inquiry_id: id,
        activity_type: 'status_change',
        new_value: JSON.stringify(updateData),
        notes: `Updated: ${Object.keys(updateData).join(', ')}`,
      });
    } catch {
      // Activity logging is optional, don't fail if it doesn't work
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin inquiries PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
