import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { 
  sendLocalizedEmail, 
  generateLocalizedEmailHTML,
  emailTranslations,
  type SupportedLocale 
} from '@vetsphere/shared/lib/email/localized-email';
import { rateLimiters } from '@vetsphere/shared/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.register(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { email, password, role, fullName, locale = 'en' } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co';

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const userName = fullName || email.split('@')[0];

    // Create user via admin API: bypasses rate limits and auto-confirms email
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: role || 'Doctor',
        name: userName,
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Send localized welcome email (non-blocking)
    const safeLocale = ['en', 'zh', 'ja', 'th'].includes(locale) ? locale as SupportedLocale : 'en';
    const t = emailTranslations.welcome[safeLocale];
    const greeting = typeof t.greeting === 'function' ? t.greeting(userName) : t.greeting;
    const featuresHtml = t.features.map((f: string) => `<li style="color: #475569; line-height: 2;">${f}</li>`).join('');
    
    const html = `
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
            <a href="https://vetsphere.net/${safeLocale}/auth" style="display: inline-block; background: #10B981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
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
    
    const text = `${t.subject}\n\n${greeting}\n\n${t.message}\n\n${t.features.join('\n')}\n\n${t.ctaButton}: https://vetsphere.net/${safeLocale}/auth`;

    sendLocalizedEmail({
      to: email,
      subject: t.subject,
      html,
      text,
      from: 'VetSphere <noreply@support.vetsphere.net>'
    }).catch(err => {
      console.error('[Register] Failed to send welcome email:', err);
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role,
        name: data.user.user_metadata?.name
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
