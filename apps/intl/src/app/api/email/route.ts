import { NextRequest, NextResponse } from 'next/server';
import { 
  sendLocalizedEmail, 
  generateLocalizedEmailHTML,
  emailTranslations,
  type SupportedLocale 
} from '@vetsphere/shared/lib/email/localized-email';

export const dynamic = 'force-dynamic';

// POST /api/email/send - Send localized email (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data, locale = 'en' } = body;

    if (!type || !to) {
      return NextResponse.json({ error: 'Missing required fields: type, to' }, { status: 400 });
    }

    // Validate locale
    const validLocales: SupportedLocale[] = ['en', 'zh', 'ja', 'th'];
    const safeLocale = validLocales.includes(locale as SupportedLocale) 
      ? (locale as SupportedLocale) 
      : 'en';

    // Get dynamic site URL
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    let subject: string;
    let html: string;
    let text: string;

    switch (type) {
      case 'welcome': {
        const t = emailTranslations.welcome[safeLocale];
        const greeting = typeof t.greeting === 'function' ? t.greeting(data.userName) : t.greeting;
        const featuresHtml = t.features.map((f: string) => `<li style="color: #475569; line-height: 2;">${f}</li>`).join('');
        
        subject = t.subject;
        html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10B981; font-size: 28px; margin: 0;">VetSphere</h1>
            <p style="color: #64748b; font-size: 12px; margin: 5px 0;">PROFESSIONAL VETERINARY EDUCATION</p>
          </div>
          
          <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 20px;">${t.title} 🎉</h2>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
            ${greeting}
          </p>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
            ${t.message}
          </p>
          
          <ul style="color: #475569; line-height: 2; padding-left: 20px;">
            ${featuresHtml}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="display: inline-block; background: #10B981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              ${t.ctaButton}
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
            Questions? Contact us at ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@vetsphere.net'}
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
        text = `${t.subject}\n\n${greeting}\n\n${t.message}\n\n${t.features.join('\n')}\n\n${t.ctaButton}: ${data.loginUrl}`;
        break;
      }

      case 'order_confirmation': {
        const t = emailTranslations.orderConfirmation[safeLocale];
        const greeting = typeof t.greeting === 'function' ? t.greeting(data.customerName) : t.greeting;
        const subjectFn = t.subject as (orderId: string) => string;
        
        subject = subjectFn(data.orderId);
        
        const itemsHtml = data.items.map((item: any) => `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600; color: #1e293b;">${item.name}</div>
                  <div style="font-size: 14px; color: #64748b;">Qty: ${item.quantity}</div>
                </div>
                <div style="font-weight: 600; color: #10B981;">$${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            </td>
          </tr>
        `).join('');

        html = generateLocalizedEmailHTML({
          locale: safeLocale,
          title: t.title,
          greeting: greeting,
          message: t.message,
          ctaUrl: data.orderUrl,
          ctaText: t.viewOrder,
          signature: t.signature,
          additionalContent: `
            <div style="margin: 30px 0; padding: 20px; background: #f8fafb; border-radius: 8px;">
              <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 15px 0;">${t.orderDetails}</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
                <tr>
                  <td style="padding: 15px 0 0 0; border-top: 2px solid #10B981;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div style="font-weight: 700; color: #1e293b; font-size: 16px;">Total</div>
                      <div style="font-weight: 700; color: #10B981; font-size: 18px;">$${data.totalAmount.toFixed(2)}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          `
        });
        text = `${subject}\n\n${greeting}\n\n${t.message}\n\n${t.orderDetails}:\n${data.items.map((i: any) => `- ${i.name} (x${i.quantity}): $${(i.price * i.quantity).toFixed(2)}`).join('\n')}\nTotal: $${data.totalAmount.toFixed(2)}\n\n${t.viewOrder}: ${data.orderUrl}\n\n${t.signature}`;
        break;
      }

      case 'course_enrollment': {
        const t = emailTranslations.courseEnrollment[safeLocale];
        const greeting = typeof t.greeting === 'function' ? t.greeting(data.userName) : t.greeting;
        const subjectFn = t.subject as (courseName: string) => string;
        
        subject = subjectFn(data.courseName);
        
        html = generateLocalizedEmailHTML({
          locale: safeLocale,
          title: t.title,
          greeting: greeting,
          message: t.message,
          ctaUrl: data.courseUrl,
          ctaText: t.startLearning,
          signature: t.signature
        });
        text = `${subject}\n\n${greeting}\n\n${t.message}\n\n${t.startLearning}: ${data.courseUrl}\n\n${t.signature}`;
        break;
      }

      case 'course_reminder': {
        // Similar structure to course_enrollment but with reminder-specific content
        const t = emailTranslations.courseEnrollment[safeLocale]; // Reuse translations
        const greeting = typeof t.greeting === 'function' ? t.greeting(data.userName) : t.greeting;
        
        subject = `Reminder: ${data.courseName}`;
        
        html = generateLocalizedEmailHTML({
          locale: safeLocale,
          title: 'Course Reminder',
          greeting: greeting,
          message: `This is a friendly reminder that your course "${data.courseName}" ${data.startDate ? `starts on ${data.startDate}` : 'is starting soon'}.`,
          ctaUrl: data.courseUrl,
          ctaText: t.startLearning,
          signature: t.signature
        });
        text = `${subject}\n\n${greeting}\n\nThis is a friendly reminder that your course "${data.courseName}" ${data.startDate ? `starts on ${data.startDate}` : 'is starting soon'}.\n\n${t.startLearning}: ${data.courseUrl}\n\n${t.signature}`;
        break;
      }

      case 'payment_received': {
        const t = emailTranslations.paymentReceived[safeLocale];
        const greeting = typeof t.greeting === 'function' ? t.greeting(data.userName) : t.greeting;
        const subjectFn = t.subject as (amount: string) => string;
        
        subject = subjectFn(data.amount);
        
        html = generateLocalizedEmailHTML({
          locale: safeLocale,
          title: t.title,
          greeting: greeting,
          message: t.message,
          ctaUrl: data.receiptUrl,
          ctaText: t.viewReceipt,
          signature: t.signature,
          additionalContent: data.description ? `<p style="color: #4b5563; line-height: 1.6;">${data.description}</p>` : undefined
        });
        text = `${subject}\n\n${greeting}\n\n${t.message}\n\n${t.viewReceipt}: ${data.receiptUrl}\n\n${t.signature}`;
        break;
      }

      case 'custom':
        subject = data.subject;
        html = data.html;
        text = data.text || data.html.replace(/<[^>]*>/g, '');
        break;

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    }

    const result = await sendLocalizedEmail({
      to,
      subject,
      html,
      text
    });

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
