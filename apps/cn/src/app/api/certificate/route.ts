import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const dynamic = 'force-dynamic';

interface CertificateData {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  instructorName: string;
  certificateId: string;
  specialty: string;
}

function generateCertificateSVG(data: CertificateData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 842 595" width="842" height="595">
  <!-- Background -->
  <rect width="842" height="595" fill="#FAFAFA"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="802" height="555" fill="none" stroke="#10B981" stroke-width="3"/>
  <rect x="30" y="30" width="782" height="535" fill="none" stroke="#10B981" stroke-width="1"/>
  
  <!-- Corner Decorations -->
  <path d="M40 60 L40 40 L60 40" fill="none" stroke="#10B981" stroke-width="2"/>
  <path d="M802 60 L802 40 L782 40" fill="none" stroke="#10B981" stroke-width="2"/>
  <path d="M40 535 L40 555 L60 555" fill="none" stroke="#10B981" stroke-width="2"/>
  <path d="M802 535 L802 555 L782 555" fill="none" stroke="#10B981" stroke-width="2"/>
  
  <!-- Logo/Brand -->
  <text x="421" y="80" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#10B981" text-anchor="middle">VetSphere</text>
  <text x="421" y="100" font-family="Arial, sans-serif" font-size="10" fill="#64748B" text-anchor="middle">PROFESSIONAL VETERINARY EDUCATION</text>
  
  <!-- Title -->
  <text x="421" y="160" font-family="Georgia, serif" font-size="36" fill="#1E293B" text-anchor="middle">Certificate of Completion</text>
  
  <!-- Decorative Line -->
  <line x1="200" y1="180" x2="642" y2="180" stroke="#10B981" stroke-width="1"/>
  
  <!-- Body Text -->
  <text x="421" y="230" font-family="Arial, sans-serif" font-size="14" fill="#64748B" text-anchor="middle">This is to certify that</text>
  
  <!-- Student Name -->
  <text x="421" y="280" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#1E293B" text-anchor="middle">${escapeXml(data.studentName)}</text>
  
  <!-- Course Info -->
  <text x="421" y="330" font-family="Arial, sans-serif" font-size="14" fill="#64748B" text-anchor="middle">has successfully completed the course</text>
  
  <!-- Course Title -->
  <text x="421" y="370" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#10B981" text-anchor="middle">${escapeXml(data.courseTitle)}</text>
  
  <!-- Specialty -->
  <text x="421" y="400" font-family="Arial, sans-serif" font-size="12" fill="#64748B" text-anchor="middle">Specialty: ${escapeXml(data.specialty)}</text>
  
  <!-- Date -->
  <text x="421" y="450" font-family="Arial, sans-serif" font-size="12" fill="#64748B" text-anchor="middle">Completed on ${data.completionDate}</text>
  
  <!-- Signatures Area -->
  <line x1="150" y1="500" x2="350" y2="500" stroke="#CBD5E1" stroke-width="1"/>
  <text x="250" y="520" font-family="Arial, sans-serif" font-size="10" fill="#64748B" text-anchor="middle">${escapeXml(data.instructorName)}</text>
  <text x="250" y="535" font-family="Arial, sans-serif" font-size="8" fill="#94A3B8" text-anchor="middle">Course Instructor</text>
  
  <line x1="492" y1="500" x2="692" y2="500" stroke="#CBD5E1" stroke-width="1"/>
  <text x="592" y="520" font-family="Arial, sans-serif" font-size="10" fill="#64748B" text-anchor="middle">VetSphere Academy</text>
  <text x="592" y="535" font-family="Arial, sans-serif" font-size="8" fill="#94A3B8" text-anchor="middle">Issuing Authority</text>
  
  <!-- Certificate ID -->
  <text x="421" y="570" font-family="monospace" font-size="8" fill="#94A3B8" text-anchor="middle">Certificate ID: ${data.certificateId}</text>
  
  <!-- Verification URL -->
  <text x="421" y="582" font-family="Arial, sans-serif" font-size="7" fill="#CBD5E1" text-anchor="middle">Verify at: vetsphere.pro/verify/${data.certificateId}</text>
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');
    const format = searchParams.get('format') || 'svg'; // svg or html

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }

    // Fetch enrollment with course details
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('course_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Check if certificate can be issued
    if (enrollment.completion_status !== 'completed') {
      return NextResponse.json({ error: 'Course not completed' }, { status: 400 });
    }

    if (enrollment.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 400 });
    }

    // Fetch course details
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', enrollment.course_id)
      .single();

    // Fetch user details
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);

    const certificateData: CertificateData = {
      studentName: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student',
      courseTitle: course?.title || 'Professional Course',
      completionDate: new Date(enrollment.updated_at || enrollment.enrollment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      instructorName: course?.instructor?.name || 'VetSphere Instructor',
      certificateId: `VS-${enrollment.id.slice(0, 8).toUpperCase()}`,
      specialty: course?.specialty || 'Veterinary Medicine'
    };

    // Update certificate_issued flag
    if (!enrollment.certificate_issued) {
      await supabaseAdmin
        .from('course_enrollments')
        .update({ certificate_issued: true })
        .eq('id', enrollmentId);
    }

    const svg = generateCertificateSVG(certificateData);

    if (format === 'html') {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate - ${certificateData.studentName}</title>
  <style>
    body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; }
    .certificate { box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    @media print { body { background: white; } .certificate { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="certificate">${svg}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="certificate-${certificateData.certificateId}.svg"`
      }
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 });
  }
}

// Issue certificate (mark as completed and generate)
export async function POST(request: NextRequest) {
  try {
    const { enrollmentId } = await request.json();

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }

    // Update enrollment to completed
    const { data, error } = await supabaseAdmin
      .from('course_enrollments')
      .update({
        completion_status: 'completed',
        certificate_issued: true
      })
      .eq('id', enrollmentId)
      .eq('payment_status', 'paid')
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to issue certificate' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate issued successfully',
      certificateUrl: `/api/certificate?enrollmentId=${enrollmentId}`
    });

  } catch (error) {
    console.error('Certificate issue error:', error);
    return NextResponse.json({ error: 'Failed to issue certificate' }, { status: 500 });
  }
}
