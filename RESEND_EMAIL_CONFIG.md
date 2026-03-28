# Resend Email Configuration Guide

## ✅ Verified Domain

**Domain:** `support.vetsphere.net`  
**Status:** Verified in Resend Dashboard  
**Verified On:** 2026-03-28

## 📧 Email Sending Configuration

### Production Settings

**From Address:** `VetSphere <noreply@support.vetsphere.net>`

This address is used for all system emails:
- ✅ Password reset emails
- ✅ Welcome emails  
- ✅ Order confirmations
- ✅ Course enrollment notifications
- ✅ Payment receipts

### Environment Variables

**Required in `.env.local`:**
```bash
RESEND_API_KEY=re_xxx  # Get from https://resend.com/api-keys
```

**For Production (Vercel):**
```bash
RESEND_API_KEY=re_xxx  # Add in Vercel Dashboard > Settings > Environment Variables
```

## 🔧 API Configuration

### Password Reset Email Endpoint

**Endpoint:** `/api/auth/send-password-reset`

**Request:**
```json
POST /api/auth/send-password-reset
{
  "email": "user@example.com",
  "locale": "zh"  // or "en", "ja", "th"
}
```

**Response (Success):**
```json
{
  "success": true,
  "messageId": "re_xxx",
  "recoveryLink": "https://..."  // Only in dev mode
}
```

## 📝 Email Templates

All emails use custom branded HTML templates with VetSphere identity:

- **Header:** Purple gradient with VetSphere logo
- **Branding:** Global Veterinary Knowledge Platform
- **Footer:** © 2026 VetSphere. All rights reserved.
- **Languages:** English, 中文，日本語，ไทย

### Example: Password Reset (Chinese)

**Subject:** 重置您的 VetSphere 密码

**From:** VetSphere <noreply@support.vetsphere.net>

**Content:**
- Personalized greeting with user's display name
- Clear call-to-action button
- Fallback text link
- Security notice (1-hour expiry)
- Professional footer

## 🧪 Testing

### Development Mode

If Resend API key is not configured or domain verification fails, the system falls back to dev mode:

```
=== PASSWORD RESET EMAIL (RESEND FAILED, FALLBACK TO DEV MODE) ===
To: user@example.com
Subject: 重置您的 VetSphere 密码
HTML Preview: <!DOCTYPE html>...
Link: https://tvxrgbntiksskywsroax.supabase.co/auth/v1/verify?token=...
==================================================================
```

Email is logged to console instead of sent.

### Production Testing

1. Deploy to Vercel
2. Trigger password reset from https://vetsphere.net/[locale]/auth
3. Check email inbox (including spam folder)
4. Verify email renders correctly on mobile and desktop

## 🔐 DNS Records (Already Configured)

The following DNS records have been added to `support.vetsphere.net`:

**MX Records:**
- `feedback-smtp.us-east-1.amazonses.com` (Priority 10)

**TXT Records:**
- SPF: `v=spf1 include:spf.resend.dev ~all`
- DKIM: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...`

**Status:** ✅ Verified

## 📊 Resend Dashboard

Access: https://resend.com/domains/support.vetsphere.net

View:
- Email sending statistics
- Delivery rates
- Bounce reports
- Complaint rates

## 🚨 Troubleshooting

### Issue: "Domain not verified"

**Solution:** 
1. Go to https://resend.com/domains
2. Verify `support.vetsphere.net` is marked as "Verified"
3. Check DNS records are properly configured

### Issue: "Invalid API key"

**Solution:**
1. Go to https://resend.com/api-keys
2. Create new API key or regenerate existing
3. Update `RESEND_API_KEY` in `.env.local` and Vercel

### Issue: Emails going to spam

**Solution:**
1. Verify SPF and DKIM records are correct
2. Check email content for spam triggers
3. Monitor sender reputation in Resend dashboard

## 📞 Support

For email delivery issues:
- Resend Support: https://resend.com/support
- Internal: Check Vercel logs and Resend dashboard

---

**Last Updated:** 2026-03-28  
**Maintained By:** VetSphere Development Team
