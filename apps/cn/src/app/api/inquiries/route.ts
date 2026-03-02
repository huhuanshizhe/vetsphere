import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Admin email for notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@vetsphere.com';

export async function POST(request: NextRequest) {
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

    // Send email notification to admin
    try {
      await sendAdminNotification({
        inquiryId: inquiry.id,
        customerName,
        customerEmail,
        clinicName: clinicName || companyName,
        country,
        productName: referenceItem.name,
        productBrand: referenceItem.brand,
        budgetRange,
        estimatedPurchaseTime,
        message,
        priority,
      });
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send admin notification:', emailError);
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

// Send notification email to admin
async function sendAdminNotification(data: {
  inquiryId: string;
  customerName: string;
  customerEmail: string;
  clinicName?: string;
  country?: string;
  productName: string;
  productBrand?: string;
  budgetRange?: string;
  estimatedPurchaseTime?: string;
  message: string;
  priority: string;
}) {
  const priorityEmoji = {
    urgent: '🔴',
    high: '🟠',
    normal: '🟡',
    low: '🟢',
  }[data.priority] || '🟡';

  const budgetLabels: Record<string, string> = {
    'under5k': 'Under $5,000',
    '5k-15k': '$5,000 - $15,000',
    '15k-50k': '$15,000 - $50,000',
    '50k-100k': '$50,000 - $100,000',
    'over100k': 'Over $100,000',
    'undisclosed': 'Not disclosed',
  };

  const timelineLabels: Record<string, string> = {
    'immediate': 'Immediate (within 1 month)',
    '1-3months': '1-3 months',
    '3-6months': '3-6 months',
    '6-12months': '6-12 months',
    'planning': 'Just planning/researching',
  };

  const emailBody = `
${priorityEmoji} New Clinical Consultation Request

Priority: ${data.priority.toUpperCase()}
Inquiry ID: ${data.inquiryId}

═══════════════════════════════════════
CONTACT INFORMATION
═══════════════════════════════════════
Name: ${data.customerName}
Email: ${data.customerEmail}
Clinic: ${data.clinicName || 'Not provided'}
Country: ${data.country || 'Not provided'}

═══════════════════════════════════════
PRODUCT INTEREST
═══════════════════════════════════════
Product: ${data.productBrand ? `${data.productBrand} - ` : ''}${data.productName}

═══════════════════════════════════════
PURCHASE PLANNING
═══════════════════════════════════════
Budget Range: ${data.budgetRange ? budgetLabels[data.budgetRange] || data.budgetRange : 'Not provided'}
Timeline: ${data.estimatedPurchaseTime ? timelineLabels[data.estimatedPurchaseTime] || data.estimatedPurchaseTime : 'Not provided'}

═══════════════════════════════════════
MESSAGE
═══════════════════════════════════════
${data.message}

---
View in Admin Dashboard: ${process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.vetsphere.com'}/dashboard
  `.trim();

  // Call the email API
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: ADMIN_EMAIL,
      subject: `${priorityEmoji} [VetSphere] New Clinical Consultation: ${data.productName} - ${data.clinicName || data.customerName}`,
      text: emailBody,
      type: 'inquiry_notification',
    }),
  });

  if (!response.ok) {
    throw new Error(`Email API returned ${response.status}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const status = searchParams.get('status');

    let query = supabase
      .from('inquiry_requests')
      .select(`
        *,
        product:products(id, name, brand, image_url)
      `)
      .order('created_at', { ascending: false });

    if (email) {
      query = query.eq('customer_email', email.toLowerCase());
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
