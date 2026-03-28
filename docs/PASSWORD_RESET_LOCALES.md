# Password Reset Email Localization

## ✅ Implementation Status

Password reset emails are now fully localized based on the current site locale.

## 📧 How It Works

### 1. Frontend (AuthPageClient.tsx)

When a user requests password reset, the frontend sends the current locale:

```typescript
const { locale, language } = useLanguage();

const handlePasswordReset = async () => {
  const response = await fetch(`${window.location.origin}/api/auth/send-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: resetEmail,
      locale: locale || 'en'  // ← Current site locale
    })
  });
}
```

### 2. Backend API (route.ts)

The API generates email content in the requested locale:

```typescript
const { email, locale = 'en' } = await request.json();

// Subject line
const emailSubject = locale === 'zh' 
  ? '重置您的 VetSphere 密码'
  : locale === 'ja'
  ? 'VetSphere パスワードのリセット'
  : locale === 'th'
  ? 'รีเซ็ตรหัสผ่าน VetSphere ของคุณ'
  : 'Reset Your VetSphere Password';

// Email body content (greeting, message, CTA, footer)
// All content is localized based on the same locale parameter
```

## 🌍 Supported Locales

| Locale Code | Language | Subject | Greeting |
|-------------|----------|---------|----------|
| `en` | English | Reset Your VetSphere Password | Hello {name}! |
| `zh` | Chinese | 重置您的 VetSphere 密码 | 你好，{name}！ |
| `ja` | Japanese | VetSphere パスワードのリセット | こんにちは、{name} さん！ |
| `th` | Thai | รีเซ็ตรหัสผ่าน VetSphere ของคุณ | สวัสดี {name} |

## 📍 User Experience

### Example Scenarios

**Scenario 1: English Site**
- User visits: `https://vetsphere.net/en/auth`
- Clicks "Forgot Password?"
- Enters email
- Receives email in **English**

**Scenario 2: Chinese Site**
- User visits: `https://vetsphere.net/zh/auth`
- Clicks "忘记密码？"
- Enters email
- Receives email in **Chinese**

**Scenario 3: Japanese Site**
- User visits: `https://vetsphere.net/ja/auth`
- Clicks "パスワードをお忘れですか？"
- Enters email
- Receives email in **Japanese**

**Scenario 4: Thai Site**
- User visits: `https://vetsphere.net/th/auth`
- Clicks "ลืมรหัสผ่าน?"
- Enters email
- Receives email in **Thai**

## 🔍 Testing Results

All locales tested successfully on 2026-03-28:

```bash
# English
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"namexiaohu@sina.com","locale":"en"}'

# Response: {"success":true,"messageId":"7fb74917-7fc0-4bb1-b23c-e55f6d812748"}

# Chinese
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"namexiaohu@sina.com","locale":"zh"}'

# Response: {"success":true,"messageId":"5014a02a-187c-472d-ab7d-fb6136673568"}

# Japanese
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"namexiaohu@sina.com","locale":"ja"}'

# Response: {"success":true,"messageId":"9a9a7a8a-6601-4786-aedf-df4d7c782525"}

# Thai
curl -X POST http://localhost:3001/api/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"namexiaohu@sina.com","locale":"th"}'

# Response: {"success":true,"messageId":"f2672502-1f11-4381-9542-0320e04a6d1c"}
```

## 📧 Email Content Details

### Sender Information
- **From:** VetSphere <noreply@support.vetsphere.net>
- **Domain:** support.vetsphere.net (verified in Resend)

### Email Structure
1. **Header:** Purple gradient with VetSphere logo
2. **Platform Description:** Localized tagline
3. **Title:** "Reset Your Password" (localized)
4. **Greeting:** Personalized with user's display name
5. **Message:** Clear instructions in target language
6. **CTA Button:** "Reset Password" (localized)
7. **Fallback Link:** Full URL for email clients that don't render HTML
8. **Security Notice:** Link expires in 1 hour
9. **Footer:** VetSphere branding and copyright

## 🔧 Technical Implementation

### Files Modified

1. **`packages/shared/src/pages/AuthPageClient.tsx`**
   - Added locale parameter to password reset API call
   - Uses `useLanguage()` hook to get current locale

2. **`apps/intl/src/app/api/auth/send-password-reset/route.ts`**
   - Accepts `locale` parameter from request
   - Generates localized email subject and content
   - Uses locale for redirect URL construction

### Locale Detection

The locale is determined by the current URL path:
- `/en/auth` → `locale = 'en'`
- `/zh/auth` → `locale = 'zh'`
- `/ja/auth` → `locale = 'ja'`
- `/th/auth` → `locale = 'th'`

This ensures the email language matches the site language the user is currently viewing.

## ✅ Benefits

1. **Better User Experience:** Users receive emails in their preferred language
2. **Consistency:** Email language matches the site language
3. **Professional:** Native speakers see content in their native language
4. **Accessibility:** Reduces confusion for non-English speakers
5. **Brand Image:** Shows VetSphere's commitment to localization

## 🚀 Production Deployment

All changes are committed and pushed to GitHub. Vercel will automatically deploy these updates.

**Commit:** `d45030e` - "feat: update email sender to verified domain support.vetsphere.net"

---

**Last Updated:** 2026-03-28  
**Tested By:** VetSphere Development Team
