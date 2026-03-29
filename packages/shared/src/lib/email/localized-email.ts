/**
 * VetSphere Localized Email Service
 * 
 * Features:
 * - Multi-language support (EN/ZH/JA/TH)
 * - Dynamic site URL detection
 * - Locale-aware templates
 * - Consistent branding across all emails
 */

import { Resend } from 'resend';

export type SupportedLocale = 'en' | 'zh' | 'ja' | 'th';

export interface LocalizedEmailData {
  to: string | string[];
  locale: SupportedLocale;
  siteUrl: string; // e.g., 'https://vetsphere.net' or 'https://vetsphere.cn'
}

// Locale display names
export const localeNames: Record<SupportedLocale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  th: 'ไทย'
};

// Site branding by locale
export const siteBranding: Record<SupportedLocale, {
  platformName: string;
  tagline: string;
  footer: string;
}> = {
  en: {
    platformName: 'VetSphere',
    tagline: 'Global Veterinary Knowledge Platform',
    footer: '© 2026 VetSphere. All rights reserved.'
  },
  zh: {
    platformName: 'VetSphere',
    tagline: '全球兽医知识共享平台',
    footer: '© 2026 VetSphere. 保留所有权利。'
  },
  ja: {
    platformName: 'VetSphere',
    tagline: 'グローバル獣医知識共有プラットフォーム',
    footer: '© 2026 VetSphere. All rights reserved.'
  },
  th: {
    platformName: 'VetSphere',
    tagline: 'แพลตฟอร์มแบ่งปันความรู้สัตวแพทย์ระดับโลก',
    footer: '© 2026 VetSphere. สงวนลิขสิทธิ์.'
  }
};

// Email translations
export const emailTranslations = {
  passwordReset: {
    en: {
      subject: 'Reset Your VetSphere Password',
      title: 'Reset Your Password',
      greeting: (name: string) => `Hello ${name}!`,
      message: 'We received a request to reset your VetSphere account password. Click the button below to set a new password:',
      ctaButton: 'Reset Password',
      fallbackLink: 'If the button above doesn\'t work, copy and paste the link below into your browser:',
      securityNotice: 'For your security, please do not share this link with anyone. The link will expire in 1 hour.',
      signature: 'The VetSphere Team'
    },
    zh: {
      subject: '重置您的 VetSphere 密码',
      title: '重置密码',
      greeting: (name: string) => `你好，${name}！`,
      message: '我们收到了重置您 VetSphere 账户密码的请求。点击下方按钮即可设置新密码：',
      ctaButton: '重置密码',
      fallbackLink: '如果按钮无法点击，您可以复制以下链接到浏览器中打开：',
      securityNotice: '为了您的账户安全，请勿将此链接分享给他人。此链接将在 1 小时后过期。',
      signature: 'VetSphere 团队'
    },
    ja: {
      subject: 'VetSphere パスワードのリセット',
      title: 'パスワードをリセット',
      greeting: (name: string) => `こんにちは、${name}さん！`,
      message: 'VetSphere アカウントのパスワードリセットがリクエストされました。下のボタンをクリックして新しいパスワードを設定してください：',
      ctaButton: 'パスワードをリセット',
      fallbackLink: 'ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：',
      securityNotice: 'アカウントのセキュリティのため、このリンクを第三者と共有しないでください。このリンクは 1 時間後に無効になります。',
      signature: 'VetSphere チーム'
    },
    th: {
      subject: 'รีเซ็ตรหัสผ่าน VetSphere ของคุณ',
      title: 'รีเซ็ตรหัสผ่าน',
      greeting: (name: string) => `สวัสดี ${name}`,
      message: 'มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี VetSphere ของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:',
      ctaButton: 'รีเซ็ตรหัสผ่าน',
      fallbackLink: 'หากปุ่มไม่สามารถคลิกได้ คุณสามารถคัดลอกลิงก์ด้านล่างและวางในเบราว์เซอร์:',
      securityNotice: 'เพื่อความปลอดภัยของบัญชีของคุณ โปรดไม่แชร์ลิงก์นี้กับผู้อื่น ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง',
      signature: 'ทีม VetSphere'
    }
  },
  welcome: {
    en: {
      subject: 'Welcome to VetSphere - Your Professional Development Platform',
      title: 'Welcome to VetSphere!',
      greeting: (name: string) => `Hello ${name}!`,
      message: 'Thank you for joining VetSphere, the premier platform for veterinary professional development.',
      features: [
        'Expert-led surgical training courses',
        'Clinical case sharing community',
        'Professional equipment marketplace',
        'AI-powered surgical consultation'
      ],
      ctaButton: 'Start Exploring',
      signature: 'The VetSphere Team'
    },
    zh: {
      subject: '欢迎加入 VetSphere - 您的专业发展平台',
      title: '欢迎加入 VetSphere！',
      greeting: (name: string) => `你好，${name}！`,
      message: '感谢您加入 VetSphere，这是领先的兽医专业发展平台。',
      features: [
        '专家主导的手术培训课程',
        '临床病例分享社区',
        '专业设备商城',
        'AI 手术咨询'
      ],
      ctaButton: '开始探索',
      signature: 'VetSphere 团队'
    },
    ja: {
      subject: 'VetSphere へようこそ - あなたの専門開発プラットフォーム',
      title: 'VetSphere へようこそ！',
      greeting: (name: string) => `${name}さん、こんにちは！`,
      message: '獣医専門開発のプレミアプラットフォームである VetSphere にご参加いただきありがとうございます。',
      features: [
        '専門家が主導する外科トレーニングコース',
        '臨床症例共有コミュニティ',
        'プロフェッショナル機器マーケットプレイス',
        'AI 搭載外科相談'
      ],
      ctaButton: '探索を始める',
      signature: 'VetSphere チーム'
    },
    th: {
      subject: 'ยินดีต้อนรับสู่ VetSphere - แพลตฟอร์มการพัฒนาวิชาชีพของคุณ',
      title: 'ยินดีต้อนรับสู่ VetSphere!',
      greeting: (name: string) => `สวัสดี ${name}`,
      message: 'ขอบคุณที่เข้าร่วม VetSphere แพลตฟอร์มชั้นนำสำหรับการพัฒนาวิชาชีพสัตวแพทย์',
      features: [
        'หลักสูตรการฝึกผ่าตัดที่นำโดยผู้เชี่ยวชาญ',
        'ชุมชนแบ่งปันกรณีทางคลินิก',
        'ตลาดอุปกรณ์มืออาชีพ',
        'การปรึกษาผ่าตัดด้วย AI'
      ],
      ctaButton: 'เริ่มสำรวจ',
      signature: 'ทีม VetSphere'
    }
  },
  orderConfirmation: {
    en: {
      subject: (orderId: string) => `Order Confirmed #${orderId} - VetSphere`,
      title: 'Order Confirmed!',
      greeting: (name: string) => `Dear ${name},`,
      message: 'Thank you for your order! Your order has been confirmed and is being processed.',
      orderDetails: 'Order Details',
      viewOrder: 'View Order',
      signature: 'The VetSphere Team'
    },
    zh: {
      subject: (orderId: string) => `订单已确认 #${orderId} - VetSphere`,
      title: '订单已确认！',
      greeting: (name: string) => `${name}，您好：`,
      message: '感谢您的订单！您的订单已确认并正在处理中。',
      orderDetails: '订单详情',
      viewOrder: '查看订单',
      signature: 'VetSphere 团队'
    },
    ja: {
      subject: (orderId: string) => `ご注文確認済み #${orderId} - VetSphere`,
      title: 'ご注文確認済み！',
      greeting: (name: string) => `${name}様、`,
      message: 'ご注文ありがとうございます！ご注文が確認され、処理中です。',
      orderDetails: 'ご注文详情',
      viewOrder: 'ご注文を確認',
      signature: 'VetSphere チーム'
    },
    th: {
      subject: (orderId: string) => `ยืนยันคำสั่งซื้อ #${orderId} - VetSphere`,
      title: 'ยืนยันคำสั่งซื้อแล้ว!',
      greeting: (name: string) => `เรียน ${name},`,
      message: 'ขอบคุณสำหรับคำสั่งซื้อของคุณ! คำสั่งซื้อของคุณได้รับการยืนยันและกำลังดำเนินการ',
      orderDetails: 'รายละเอียดคำสั่งซื้อ',
      viewOrder: 'ดูคำสั่งซื้อ',
      signature: 'ทีม VetSphere'
    }
  },
  courseEnrollment: {
    en: {
      subject: (courseName: string) => `Enrollment Confirmed: ${courseName}`,
      title: 'Enrollment Confirmed!',
      greeting: (name: string) => `Hello ${name}!`,
      message: 'You have successfully enrolled in the course. We\'re excited to have you on board!',
      startLearning: 'Start Learning',
      signature: 'The VetSphere Team'
    },
    zh: {
      subject: (courseName: string) => `注册确认：${courseName}`,
      title: '注册成功！',
      greeting: (name: string) => `你好，${name}！`,
      message: '您已成功注册课程。我们很高兴您能加入！',
      startLearning: '开始学习',
      signature: 'VetSphere 团队'
    },
    ja: {
      subject: (courseName: string) => `受講登録完了：${courseName}`,
      title: '登録完了！',
      greeting: (name: string) => `${name}さん、こんにちは！`,
      message: 'コースに正常に登録されました。ご参加いただけることを嬉しく思います！',
      startLearning: '学習を始める',
      signature: 'VetSphere チーム'
    },
    th: {
      subject: (courseName: string) => `ยืนยันการลงทะเบียน: ${courseName}`,
      title: 'ลงทะเบียนสำเร็จแล้ว!',
      greeting: (name: string) => `สวัสดี ${name}`,
      message: 'คุณได้ลงทะเบียนเรียนสำเร็จแล้ว เรารู้สึกตื่นเต้นที่ได้คุณมาร่วม!',
      startLearning: 'เริ่มเรียน',
      signature: 'ทีม VetSphere'
    }
  },
  paymentReceived: {
    en: {
      subject: (amount: string) => `Payment Received: ${amount}`,
      title: 'Payment Confirmed',
      greeting: (name: string) => `Hello ${name}!`,
      message: 'Your payment has been successfully processed. Thank you!',
      viewReceipt: 'View Receipt',
      signature: 'The VetSphere Team'
    },
    zh: {
      subject: (amount: string) => `已收到付款：${amount}`,
      title: '付款已确认',
      greeting: (name: string) => `你好，${name}！`,
      message: '您的付款已成功处理。谢谢！',
      viewReceipt: '查看收据',
      signature: 'VetSphere 团队'
    },
    ja: {
      subject: (amount: string) => `お支払い受領：${amount}`,
      title: 'お支払い確認済み',
      greeting: (name: string) => `${name}さん、こんにちは！`,
      message: 'お支払いが正常に処理されました。ありがとうございます！',
      viewReceipt: '領収書を見る',
      signature: 'VetSphere チーム'
    },
    th: {
      subject: (amount: string) => `ได้รับการชำระเงินแล้ว: ${amount}`,
      title: 'ยืนยันการชำระเงิน',
      greeting: (name: string) => `สวัสดี ${name}`,
      message: 'การชำระเงินของคุณได้รับการประมวลผลสำเร็จแล้ว ขอบคุณ!',
      viewReceipt: 'ดูใบเสร็จ',
      signature: 'ทีม VetSphere'
    }
  },
  bankTransferConfirmation: {
    en: {
      subject: 'Bank Transfer Confirmation Received',
      title: 'Transfer Confirmation Submitted',
      greeting: 'Hello!',
      message: 'Thank you for submitting your bank transfer confirmation. We will verify your payment within 1-2 business days.',
      transferDetails: 'Transfer Details',
      orderId: 'Order ID',
      amount: 'Amount',
      date: 'Transfer Date',
      reference: 'Reference Number',
      verificationNote: 'Once verified, you will receive a confirmation email and your order will be processed.',
      signature: 'The VetSphere Team'
    },
    zh: {
      subject: '银行转账确认已收到',
      title: '转账确认已提交',
      greeting: '您好！',
      message: '感谢您提交银行转账确认。我们将在 1-2 个工作日内验证您的付款。',
      transferDetails: '转账详情',
      orderId: '订单号',
      amount: '金额',
      date: '转账日期',
      reference: '参考编号',
      verificationNote: '验证完成后，您将收到确认邮件，订单将开始处理。',
      signature: 'VetSphere 团队'
    },
    ja: {
      subject: '銀行振込確認を受領しました',
      title: '振込確認が送信されました',
      greeting: 'こんにちは！',
      message: '銀行振込確認をご送信いただきありがとうございます。1-2営業日以内に支払いを確認いたします。',
      transferDetails: '振込詳細',
      orderId: '注文番号',
      amount: '金額',
      date: '振込日',
      reference: '参照番号',
      verificationNote: '確認完了後、確認メールをお送りし、注文処理が開始されます。',
      signature: 'VetSphere チーム'
    },
    th: {
      subject: 'ได้รับการยืนยันการโอนเงินผ่านธนาคารแล้ว',
      title: 'ส่งการยืนยันการโอนเงินแล้ว',
      greeting: 'สวัสดี!',
      message: 'ขอบคุณสำหรับการส่งการยืนยันการโอนเงินผ่านธนาคาร เราจะยืนยันการชำระเงินของคุณภายใน 1-2 วันทำการ',
      transferDetails: 'รายละเอียดการโอน',
      orderId: 'หมายเลขคำสั่งซื้อ',
      amount: 'จำนวนเงิน',
      date: 'วันที่โอน',
      reference: 'หมายเลขอ้างอิง',
      verificationNote: 'เมื่อยืนยันเสร็จสิ้น คุณจะได้รับอีเมลยืนยันและคำสั่งซื้อจะถูกดำเนินการ',
      signature: 'ทีม VetSphere'
    }
  }
};

/**
 * Generate localized email HTML template
 */
export function generateLocalizedEmailHTML(params: {
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
}): string {
  const { locale } = params;
  const branding = siteBranding[locale];

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.title}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 40px 20px;">
          <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${branding.platformName}</h1>
                <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                  ${branding.tagline}
                </p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                  ${params.title}
                </h2>
                
                <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                  ${params.greeting}
                </p>
                
                <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                  ${params.message}
                </p>
                
                ${params.additionalContent || ''}
                
                ${params.ctaUrl && params.ctaText ? `
                <!-- CTA Button -->
                <table role="presentation" style="margin: 30px 0; border-collapse: collapse;">
                  <tr>
                    <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                      <a href="${params.ctaUrl}" 
                         style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                        ${params.ctaText}
                      </a>
                    </td>
                  </tr>
                </table>
                ` : ''}
                
                ${params.fallbackUrl && params.fallbackText ? `
                <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                  ${params.fallbackText}
                </p>
                
                <p style="margin: 12px 0 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
                  <a href="${params.fallbackUrl}" style="color: #667eea; text-decoration: none;">${params.fallbackUrl}</a>
                </p>
                ` : ''}
                
                ${params.securityNotice ? `
                <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                  ${params.securityNotice}
                </p>
                ` : ''}
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; text-align: center;">
                  ${params.signature || branding.platformName}
                </p>
                <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                  ${branding.footer}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

/**
 * Send localized email via Resend
 */
export async function sendLocalizedEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, email sending skipped');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: params.from || 'VetSphere <noreply@support.vetsphere.net>',
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract locale from request or URL
 */
export function extractLocaleFromRequest(request?: Request): SupportedLocale {
  if (!request) return 'en';
  
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Check if first path segment is a locale
  const potentialLocale = pathParts[0] as SupportedLocale;
  if (['en', 'zh', 'ja', 'th'].includes(potentialLocale)) {
    return potentialLocale;
  }
  
  return 'en';
}

/**
 * Get site URL from request or environment
 */
export function getSiteUrlFromRequest(request?: Request): string {
  // Try to get from environment first (production)
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envSiteUrl) {
    return envSiteUrl;
  }
  
  // Fallback to dynamic detection (development)
  if (request) {
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${protocol}://${host}`;
  }
  
  return 'http://localhost:3001';
}
