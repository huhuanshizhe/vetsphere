# VetSphere Email Localization Guide

## 🌍 Overview

All VetSphere emails are now fully localized with dynamic site URL detection. Emails automatically adapt to:

1. **User's current locale** (EN/ZH/JA/TH)
2. **Current site domain** (vetsphere.net, vetsphere.cn, or localhost)
3. **Proper redirect URLs** back to the correct site and locale

## ✅ Implemented Email Types

### 1. Password Reset Email
**File:** `apps/intl/src/app/api/auth/send-password-reset/route.ts`

**Features:**
- ✅ Dynamic locale detection from request
- ✅ Dynamic site URL (production: vetsphere.net, dev: localhost)
- ✅ Localized subject, content, and CTA buttons
- ✅ Proper redirect back to user's current locale

**Supported Locales:**
- 🇺🇸 English: "Reset Your VetSphere Password"
- 🇨🇳 Chinese: "重置您的 VetSphere 密码"
- 🇯🇵 Japanese: "VetSphere パスワードのリセット"
- 🇹🇭 Thai: "รีเซ็ตรหัสผ่าน VetSphere ของคุณ"

**Example Usage:**
```typescript
// Frontend call from AuthPageClient.tsx
const response = await fetch(`${window.location.origin}/api/auth/send-password-reset`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: resetEmail,
    locale: locale || 'en' // Current site locale
  })
});
```

**Redirect URL Format:**
- Production EN: `https://vetsphere.net/en/auth/reset-password`
- Production ZH: `https://vetsphere.net/zh/auth/reset-password`
- Production JA: `https://vetsphere.net/ja/auth/reset-password`
- Production TH: `https://vetsphere.net/th/auth/reset-password`
- Development: `http://localhost:3001/[locale]/auth/reset-password`

---

### 2. Welcome Email
**File:** `apps/intl/src/app/api/email/route.ts`

**Features:**
- ✅ Localized welcome message
- ✅ Localized feature list
- ✅ Localized CTA button
- ✅ Dynamic login URL

**Supported Locales:**
- 🇺🇸 English: "Welcome to VetSphere - Your Professional Development Platform"
- 🇨🇳 Chinese: "欢迎加入 VetSphere - 您的专业发展平台"
- 🇯🇵 Japanese: "VetSphere へようこそ - あなたの専門開発プラットフォーム"
- 🇹🇭 Thai: "ยินดีต้อนรับสู่ VetSphere - แพลตฟอร์มการพัฒนาวิชาชีพของคุณ"

**Example Usage:**
```typescript
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'welcome',
    to: 'user@example.com',
    locale: 'en', // or 'zh', 'ja', 'th'
    data: {
      userName: 'John',
      loginUrl: 'https://vetsphere.net/en/auth'
    }
  })
});
```

---

### 3. Order Confirmation Email
**File:** `apps/intl/src/app/api/email/route.ts`

**Features:**
- ✅ Localized order details
- ✅ Dynamic order items list
- ✅ Localized total amount display
- ✅ Dynamic order tracking URL

**Example Usage:**
```typescript
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'order_confirmation',
    to: 'user@example.com',
    locale: 'en',
    data: {
      orderId: 'ORD-12345',
      customerName: 'John',
      items: [
        { name: 'Product A', quantity: 2, price: 99.99 }
      ],
      totalAmount: 199.98,
      orderUrl: 'https://vetsphere.net/en/orders/ORD-12345'
    }
  })
});
```

---

### 4. Course Enrollment Email
**File:** `apps/intl/src/app/api/email/route.ts`

**Features:**
- ✅ Localized enrollment confirmation
- ✅ Dynamic course name
- ✅ Localized "Start Learning" CTA
- ✅ Dynamic course URL

**Example Usage:**
```typescript
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'course_enrollment',
    to: 'user@example.com',
    locale: 'en',
    data: {
      userName: 'John',
      courseName: 'Advanced Surgical Techniques',
      courseUrl: 'https://vetsphere.net/en/courses/123'
    }
  })
});
```

---

### 5. Payment Received Email
**File:** `apps/intl/src/app/api/email/route.ts`

**Features:**
- ✅ Localized payment confirmation
- ✅ Dynamic amount display
- ✅ Localized receipt link
- ✅ Optional payment description

**Example Usage:**
```typescript
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'payment_received',
    to: 'user@example.com',
    locale: 'en',
    data: {
      userName: 'John',
      amount: '$199.99',
      description: 'Payment for Order #ORD-12345',
      receiptUrl: 'https://vetsphere.net/en/receipts/123'
    }
  })
});
```

---

## 🔧 Technical Implementation

### Core Files

1. **`packages/shared/src/lib/email/localized-email.ts`**
   - Central localization service
   - Email template generator
   - Translation dictionary
   - Helper functions

2. **`apps/intl/src/app/api/auth/send-password-reset/route.ts`**
   - Password reset specific endpoint
   - Dynamic site URL detection
   - Supabase integration

3. **`apps/intl/src/app/api/email/route.ts`**
   - General email sending endpoint
   - Supports multiple email types
   - Localized templates

### Key Functions

#### `generateLocalizedEmailHTML()`
```typescript
function generateLocalizedEmailHTML(params: {
  locale: SupportedLocale;
  title: string;
  greeting: string;
  message: string;
  ctaUrl?: string;
  ctaText?: string;
  fallbackText?: string;
  fallbackUrl?: string;
  additionalContent?: string;
  securityNotice?: string;
  signature?: string;
}): string
```

#### `sendLocalizedEmail()`
```typescript
async function sendLocalizedEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }>
```

#### `extractLocaleFromRequest()`
```typescript
function extractLocaleFromRequest(request?: Request): SupportedLocale
```

#### `getSiteUrlFromRequest()`
```typescript
function getSiteUrlFromRequest(request?: Request): string
```

---

## 🌐 Site URL Detection Logic

### Priority Order

1. **Environment Variable** (Production)
   ```typescript
   const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.net';
   ```

2. **Dynamic Detection** (Development)
   ```typescript
   const host = request.headers.get('host') || 'localhost:3001';
   const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
   const baseUrl = `${protocol}://${host}`;
   ```

### Environment Variables Required

**For International Site (apps/intl):**
```bash
NEXT_PUBLIC_SITE_URL=https://vetsphere.net
RESEND_API_KEY=re_xxx
NEXT_PUBLIC_SUPABASE_URL=https://tvxrgbntiksskywsroax.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**For China Site (apps/cn):**
```bash
NEXT_PUBLIC_SITE_URL=https://vetsphere.cn
RESEND_API_KEY=re_xxx
NEXT_PUBLIC_SUPABASE_URL=https://tvxrgbntiksskywsroax.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 📧 Email Sender Configuration

**Default From Address:**
```
VetSphere <noreply@support.vetsphere.net>
```

**Domain:** `support.vetsphere.net` (verified in Resend)

**Changing Sender:**
```typescript
await sendLocalizedEmail({
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Test</p>',
  from: 'VetSphere China <noreply@support.vetsphere.cn>' // Custom sender
});
```

---

## 🧪 Testing

### Development Mode

When `RESEND_API_KEY` is not configured, emails are logged to console:

```
=== PASSWORD RESET EMAIL (DEV MODE) ===
To: user@example.com
Locale: en
Subject: Reset Your VetSphere Password
Link: http://localhost:3001/en/auth/reset-password
=====================================
```

### Production Testing

1. Deploy to Vercel
2. Trigger email from production site
3. Check email inbox (including spam folder)
4. Verify all links point to correct domain and locale

### Test All Locales

```bash
# Test English
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","locale":"en"}'

# Test Chinese
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","locale":"zh"}'

# Test Japanese
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","locale":"ja"}'

# Test Thai
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","locale":"th"}'
```

---

## 📊 Translation Management

### Adding New Locale

1. Add locale to `SupportedLocale` type:
```typescript
export type SupportedLocale = 'en' | 'zh' | 'ja' | 'th' | 'es'; // New locale
```

2. Add translations to `emailTranslations`:
```typescript
es: {
  passwordReset: {
    subject: 'Restablecer tu contraseña de VetSphere',
    title: 'Restablecer contraseña',
    greeting: (name: string) => `¡Hola ${name}!`,
    // ... more translations
  }
}
```

3. Add site branding:
```typescript
siteBranding: {
  es: {
    platformName: 'VetSphere',
    tagline: 'Plataforma global de conocimiento veterinario',
    footer: '© 2026 VetSphere. Todos los derechos reservados.'
  }
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Emails not sending

**Solution:**
- Check `RESEND_API_KEY` is configured
- Verify domain `support.vetsphere.net` is verified in Resend dashboard
- Check Resend logs at https://resend.com

### Issue 2: Wrong locale in email

**Solution:**
- Ensure frontend passes correct `locale` parameter
- Check `useLanguage()` hook returns correct locale
- Verify URL path matches expected locale (e.g., `/en/auth`)

### Issue 3: Links point to localhost in production

**Solution:**
- Set `NEXT_PUBLIC_SITE_URL` environment variable in Vercel
- Restart production deployment after setting variable
- Check Vercel logs to confirm variable is loaded

### Issue 4: Supabase redirect_to still shows localhost

**Solution:**
- Ensure dynamic site URL detection is working
- Check `request.headers.get('host')` returns correct domain
- Verify `process.env.NODE_ENV === 'production'` in production

---

## 📈 Future Enhancements

### Planned Features

1. **Email Templates Dashboard**
   - Visual email template editor
   - Preview emails in all locales
   - A/B testing support

2. **Email Analytics**
   - Open rate tracking
   - Click-through rate tracking
   - Bounce rate monitoring

3. **Scheduled Emails**
   - Course reminder scheduling
   - Abandoned cart emails
   - Re-engagement campaigns

4. **User Preferences**
   - Email frequency settings
   - Language preference override
   - Unsubscribe management

---

## 📞 Support

For email delivery issues:
- **Resend Dashboard:** https://resend.com/domains/support.vetsphere.net
- **Resend Support:** https://resend.com/support
- **Internal Logs:** Check Vercel function logs

For translation issues:
- Contact localization team
- Update translations in `localized-email.ts`
- Test all locales after changes

---

**Last Updated:** 2026-03-28  
**Maintained By:** VetSphere Development Team  
**Version:** 1.0.0
