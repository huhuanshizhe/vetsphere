import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@vetsphere/shared";
import { 
  sendLocalizedEmail, 
  generateLocalizedEmailHTML,
  emailTranslations,
  type SupportedLocale 
} from '@vetsphere/shared/lib/email/localized-email';
import { rateLimiters } from '@vetsphere/shared/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.passwordReset(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { email, locale = 'en' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate locale
    const validLocales: SupportedLocale[] = ['en', 'zh', 'ja', 'th'];
    const safeLocale = validLocales.includes(locale as SupportedLocale) 
      ? (locale as SupportedLocale) 
      : 'en';

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get dynamic site URL from request or environment
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    
    // Debug logging
    console.log('[Password Reset] Environment:', process.env.NODE_ENV);
    console.log('[Password Reset] NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
    console.log('[Password Reset] Host header:', host);
    console.log('[Password Reset] Base URL:', baseUrl);
    console.log('[Password Reset] Redirect to:', `${baseUrl}/${safeLocale}/auth/reset-password`);
    
    // Generate password reset link with proper site URL and locale
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${baseUrl}/${safeLocale}/auth/reset-password`
      }
    });

    if (error) {
      throw error;
    }

    // Get user info for personalization from user metadata
    const userName = data.user?.user_metadata?.display_name || 
                     data.user?.user_metadata?.name || 
                     email.split('@')[0];
    const recoveryLink = data.properties.action_link;

    // Get translations for the locale
    const t = emailTranslations.passwordReset[safeLocale];
    const greeting = typeof t.greeting === 'function' ? t.greeting(userName) : t.greeting;

    // Generate localized HTML email
    const emailHtml = generateLocalizedEmailHTML({
      locale: safeLocale,
      title: t.title,
      greeting: greeting,
      message: t.message,
      ctaUrl: recoveryLink,
      ctaText: t.ctaButton,
      fallbackUrl: recoveryLink,
      fallbackText: t.fallbackLink,
      securityNotice: t.securityNotice,
      signature: t.signature
    });

    // Generate plain text version
    const emailText = `${t.subject}\n\n${greeting}\n\n${t.message}\n\n${t.ctaButton}: ${recoveryLink}\n\n${t.securityNotice}\n\n${t.signature}`;

    // Send email using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      // No Resend API key - log email for development
      console.log('=== PASSWORD RESET EMAIL (DEV MODE) ===');
      console.log('To:', email);
      console.log('Locale:', safeLocale);
      console.log('Subject:', t.subject);
      console.log('Link:', recoveryLink);
      console.log('=====================================');
      
      return NextResponse.json({ 
        success: true, 
        messageId: 'local-dev-no-api-key',
        recoveryLink // Only return in development
      });
    }

    // Send via Resend
    const result = await sendLocalizedEmail({
      to: email,
      subject: t.subject,
      html: emailHtml,
      text: emailText,
      from: 'VetSphere <noreply@support.vetsphere.net>'
    });

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId 
      });
    } else {
      console.error('Resend API error:', result.error);
      
      // Fallback to dev mode - log the email and return success
      console.log('=== PASSWORD RESET EMAIL (RESEND FAILED, FALLBACK TO DEV MODE) ===');
      console.log('To:', email);
      console.log('Subject:', t.subject);
      console.log('Link:', recoveryLink);
      console.log('==================================================================');
      
      return NextResponse.json({ 
        success: true, 
        messageId: 'fallback-dev-mode',
        recoveryLink,
        warning: 'Resend failed, email logged to console'
      });
    }

  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
