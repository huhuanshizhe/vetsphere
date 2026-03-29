import { NextRequest, NextResponse } from 'next/server';


async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

export const dynamic = 'force-dynamic';
import {
  sendEmail,
  inquiryNotificationEmailTemplate,
  inquiryConfirmationEmailTemplate,
} from '@vetsphere/shared/services/email';


// Admin email for notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@vetsphere.com';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseAdmin();
  try {
    const body = await request.json();

    const {
      productId,
      customerName,
      customerEmail,
      customerPhone,
      companyName,
      clinicName,
      country,
      estimatedPurchaseTime,
      budgetRange,
      quantity,
      message,
      inquiryType,
      source,
    } = body;

    // Validate required fields
    if (!productId || !customerName || !customerEmail || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, customerName, customerEmail, message' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Verify product or course exists
    let referenceItem: { id: string; name: string; brand?: string; supplier_id?: string } | null = null;
    let referenceType: 'product' | 'course' = 'product';

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, brand, supplier_id')
      .eq('id', productId)
      .single();

    if (!productError && product) {
      referenceItem = product;
      referenceType = 'product';
    } else {
      // Fallback: check if this is a course ID
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', productId)
        .single();

      if (!courseError && course) {
        referenceItem = { id: course.id, name: course.title };
        referenceType = 'course';
      }
    }

    if (!referenceItem) {
      return NextResponse.json(
        { error: 'Product or course not found' },
        { status: 404 }
      );
    }

    // Get IP and user agent for tracking
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Determine priority based on budget
    let priority = 'normal';
    if (budgetRange === 'over100k') priority = 'urgent';
    else if (budgetRange === '50k-100k') priority = 'high';
    else if (budgetRange === '15k-50k') priority = 'normal';
    else if (budgetRange === 'under5k' || budgetRange === '5k-15k') priority = 'low';

    // Insert inquiry request with extended fields
    const { data: inquiry, error: insertError } = await supabase
      .from('inquiry_requests')
      .insert({
        product_id: productId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        customer_phone: customerPhone?.trim() || null,
        company_name: companyName?.trim() || clinicName?.trim() || null,
        clinic_name: clinicName?.trim() || null,
        country: country || null,
        estimated_purchase_time: estimatedPurchaseTime || null,
        budget_range: budgetRange || null,
        quantity: quantity || null,
        message: message.trim(),
        status: 'new',
        priority,
        inquiry_type: inquiryType || (referenceType === 'course' ? 'consultation' : 'quote'),
        ip_address: ipAddress,
        user_agent: userAgent.substring(0, 500),
        source: source || (referenceType === 'course' ? 'course_page' : 'product_page'),
        lead_source: 'website',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting inquiry:', insertError);
      return NextResponse.json(
        { error: 'Failed to create inquiry' },
        { status: 500 }
      );
    }

    // Send email notification to admin (using Resend)
    try {
      const adminEmail = inquiryNotificationEmailTemplate({
        type: inquiryType || 'Product Inquiry',
        name: customerName,
        email: customerEmail,
        company: companyName || clinicName,
        phone: customerPhone,
        message,
        product: referenceItem.name,
        courseId: referenceType === 'course' ? referenceItem.id : undefined,
      });

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: adminEmail.subject,
        html: adminEmail.html,
      });
    } catch (emailError) {
      // Log but don't fail request if email fails
      console.error('Failed to send admin notification:', emailError);
    }

    // Send confirmation email to customer (using Resend)
    try {
      const confirmationEmail = inquiryConfirmationEmailTemplate(
        customerName,
        inquiryType || 'Product Inquiry',
        inquiry.id,
        'en'
      );

      await sendEmail({
        to: customerEmail,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
      });
    } catch (emailError) {
      // Log but don't fail request if email fails
      console.error('Failed to send confirmation email:', emailError);
    }

    console.log(`New inquiry created: ${inquiry.id} for ${referenceType} ${referenceItem.name} (Priority: ${priority})`);

    return NextResponse.json({
      success: true,
      inquiryId: inquiry.id,
      message: 'Inquiry submitted successfully',
    });
  } catch (error) {
    console.error('Inquiry API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseAdmin();
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.role === 'Admin' || user.user_metadata?.role === 'Admin';

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const status = searchParams.get('status');

    // Non-admin users can only see their own inquiries
    if (!isAdmin && email && email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Non-admin users without email filter get their own inquiries
    const queryEmail = isAdmin ? email : (email || user.email);

    let query = supabase
      .from('inquiry_requests')
      .select(`
        *,
        product:products(id, name, brand, image_url)
      `)
      .order('created_at', { ascending: false });

    if (queryEmail) {
      query = query.eq('customer_email', queryEmail.toLowerCase());
    }

    if (status) {
      query = query.eq('status', status);
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
    console.error('Inquiry API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
