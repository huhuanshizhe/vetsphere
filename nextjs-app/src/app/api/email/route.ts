import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/email/send - Send email (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data } = body;

    if (!type || !to) {
      return NextResponse.json({ error: 'Missing required fields: type, to' }, { status: 400 });
    }

    let template;
    switch (type) {
      case 'welcome':
        template = emailTemplates.welcome(data.userName, data.loginUrl);
        break;
      case 'order_confirmation':
        template = emailTemplates.orderConfirmation(data);
        break;
      case 'course_enrollment':
        template = emailTemplates.courseEnrollment(data);
        break;
      case 'course_reminder':
        template = emailTemplates.courseReminder(data);
        break;
      case 'payment_received':
        template = emailTemplates.paymentReceived(data);
        break;
      case 'custom':
        template = { subject: data.subject, html: data.html, text: data.text };
        break;
      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
