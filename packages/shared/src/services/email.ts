/**
 * Email service using Resend API
 * This avoids dependency on resend npm package
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send email via Resend API
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    if (!RESEND_API_KEY || RESEND_API_KEY.includes('placeholder')) {
      console.warn('Resend API key not configured, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || 'VetSphere <noreply@vetsphere.com>',
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    return { success: true, data, error: null };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Base email styles
 */
export const emailStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height:1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #00A884 0%, #008a6d 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1a1a1a;
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 20px 0;
    }
    .content p {
      color: #555555;
      font-size: 16px;
      line-height: 1.8;
      margin: 0 0 20px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #00A884;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #008a6d;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      color: #777777;
      font-size: 14px;
    }
    .footer a {
      color: #00A884;
      text-decoration: none;
    }
    .divider {
      border-top: 1px solid #e5e5e5;
      margin: 30px 0;
    }
    .info-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .info-box p {
      margin: 0;
      color: #166534;
    }
    .highlight {
      font-weight: 600;
      color: #00A884;
    }
  </style>
`;

/**
 * Wrap email HTML with template
 */
function wrapEmailHTML(htmlContent: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VetSphere</title>
        ${emailStyles}
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>VetSphere</h1>
          </div>
          <div class="content">
            ${htmlContent}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VetSphere. All rights reserved.</p>
            <p>Global Veterinary Surgical Education Platform</p>
            <p>
              <a href="#">Unsubscribe</a> | <a href="#">Privacy Policy</a> | <a href="#">Terms of Service</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ==================== Email Templates ====================

/**
 * Welcome email
 */
export function welcomeEmailTemplate(name: string, email: string, locale: string = 'en'): EmailTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.com';
  const siteUrl = locale === 'en' ? baseUrl : `${baseUrl}/${locale}`;

  return {
    subject: 'Welcome to VetSphere - Global Veterinary Surgical Education',
    html: wrapEmailHTML(`
      <h2>Welcome to VetSphere, ${name}! 👋</h2>
      <p>Thank you for joining our global veterinary surgical education community. Your account has been successfully created.</p>
      <p>We're excited to have you on board and look forward to supporting your professional growth in veterinary surgery.</p>
      <div class="info-box">
        <p><strong>Account Details:</strong></p>
        <p>Email: <span class="highlight">${email}</span></p>
      </div>
      <p>Get started by exploring our:</p>
      <ul style="color: #555555; margin-left: 20px;">
        <li>📚 <strong>Courses & Training</strong> - Learn from world-class veterinary surgeons</li>
        <li>🔬 <strong>Equipment Shop</strong> - Browse and purchase professional-grade equipment</li>
        <li>🤖 <strong>AI Assistant</strong> - Get instant answers to clinical questions</li>
        <li>👥 <strong>Community</strong> - Connect with professionals worldwide</li>
      </ul>
      <a href="${siteUrl}" class="button">Get Started</a>
      <div class="divider"></div>
      <p>If you didn't create this account, please ignore this email or contact our support team.</p>
      <p>Need help? Reply to this email and we'll assist you promptly.</p>
    `),
  };
}

/**
 * Order confirmation email
 */
export function orderConfirmationEmailTemplate(
  name: string,
  orderNumber: string,
  orderDetails: {
    total: number;
    currency: string;
    itemCount: number;
    shippingAddress?: string;
    estimatedDelivery?: string;
  },
  locale: string = 'en'
): EmailTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.com';
  const orderUrl = `${baseUrl}/${locale}/user/orders`;
  const currencySymbol = orderDetails.currency === 'USD' ? '$' : orderDetails.currency === 'CNY' ? '¥' : orderDetails.currency === 'JPY' ? '¥' : '฿';
  const formattedTotal = `${currencySymbol}${orderDetails.total.toLocaleString()}`;

  return {
    subject: `Order Confirmed - ${orderNumber}`,
    html: wrapEmailHTML(`
      <h2>Order Confirmed! 🎉</h2>
      <p>Thank you for your order, ${name}!</p>
      <p>Your order <strong>${orderNumber}</strong> has been successfully placed and is now being processed.</p>
      <div class="info-box">
        <p><strong>Order Summary:</strong></p>
        <p>Total Amount: <span class="highlight">${formattedTotal}</span></p>
        <p>Items: ${orderDetails.itemCount}</p>
        ${orderDetails.estimatedDelivery ? `<p>Estimated Delivery: ${orderDetails.estimatedDelivery}</p>` : ''}
      </div>
      ${orderDetails.shippingAddress ? `
        <p><strong>Shipping Address:</strong></p>
        <p>${orderDetails.shippingAddress}</p>
      ` : ''}
      <a href="${orderUrl}" class="button">View Order Details</a>
      <div class="divider"></div>
      <p><strong>What happens next?</strong></p>
      <p>1. You'll receive an email when your order ships</p>
      <p>2. You can track your order status in your account</p>
      <p>3. Estimated shipping time: 5-10 business days (varies by location)</p>
      <p>Need help? Reply to this email or contact our support team.</p>
    `),
  };
}

/**
 * Order shipped email
 */
export function orderShippedEmailTemplate(
  name: string,
  orderNumber: string,
  shippingDetails: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    estimatedDelivery: string;
  },
  locale: string = 'en'
): EmailTemplate {
  return {
    subject: `Your Order Has Shipped - ${orderNumber}`,
    html: wrapEmailHTML(`
      <h2>Good News! 📦 Your Order is On Its Way</h2>
      <p>Hi ${name},</p>
      <p>Your order <strong>${orderNumber}</strong> has been shipped and is on its way to you!</p>
      <div class="info-box">
        <p><strong>Shipping Details:</strong></p>
        <p>Carrier: <span class="highlight">${shippingDetails.carrier}</span></p>
        <p>Tracking Number: <span class="highlight">${shippingDetails.trackingNumber}</span></p>
        <p>Estimated Delivery: ${shippingDetails.estimatedDelivery}</p>
      </div>
      ${shippingDetails.trackingUrl ? `
        <a href="${shippingDetails.trackingUrl}" class="button">Track Your Package</a>
      ` : ''}
      <p>You can expect your order to arrive within the estimated delivery timeframe.</p>
      <p>Thank you for choosing VetSphere for your veterinary equipment needs!</p>
    `),
  };
}

/**
 * Inquiry notification email (to admin/supplier)
 */
export function inquiryNotificationEmailTemplate(
  inquiryDetails: {
    type: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    message: string;
    product?: string;
    courseId?: string;
  }
): EmailTemplate {
  return {
    subject: `New ${inquiryDetails.type} Inquiry - ${inquiryDetails.name}`,
    html: wrapEmailHTML(`
      <h2>New Inquiry Received</h2>
      <p>A new inquiry has been submitted:</p>
      <div class="info-box">
        <p><strong>Inquiry Details:</strong></p>
        <p><strong>Type:</strong> ${inquiryDetails.type}</p>
        <p><strong>Name:</strong> ${inquiryDetails.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${inquiryDetails.email}" style="color: #00A884;">${inquiryDetails.email}</a></p>
        ${inquiryDetails.company ? `<p><strong>Company:</strong> ${inquiryDetails.company}</p>` : ''}
        ${inquiryDetails.phone ? `<p><strong>Phone:</strong> ${inquiryDetails.phone}</p>` : ''}
        ${inquiryDetails.product ? `<p><strong>Product:</strong> ${inquiryDetails.product}</p>` : ''}
        ${inquiryDetails.courseId ? `<p><strong>Course ID:</strong> ${inquiryDetails.courseId}</p>` : ''}
      </div>
      <p><strong>Message:</strong></p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.8;">${inquiryDetails.message}</p>
      </div>
      <p><strong>Time Submitted:</strong> ${new Date().toLocaleString()}</p>
      <div class="divider"></div>
      <p>Please respond to this inquiry promptly. You can reply directly to the customer by replying to this email.</p>
    `),
  };
}

/**
 * Inquiry confirmation email (to user)
 */
export function inquiryConfirmationEmailTemplate(
  name: string,
  inquiryType: string,
  referenceNumber: string,
  locale: string = 'en'
): EmailTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.com';

  return {
    subject: `Inquiry Received - ${referenceNumber}`,
    html: wrapEmailHTML(`
      <h2>Inquiry Confirmed ✅</h2>
      <p>Hi ${name},</p>
      <p>Thank you for your inquiry! We've received your request and it's been assigned to our team.</p>
      <div class="info-box">
        <p><strong>Reference Number:</strong> <span class="highlight">${referenceNumber}</span></p>
        <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
      </div>
      <p><strong>What happens next?</strong></p>
      <p>Our team will review your inquiry and respond within 1-2 business days.</p>
      <p>You'll receive a response via email at the address you provided.</p>
      <p>Need to check your inquiry status or add more information?</p>
      <a href="${baseUrl}/community" class="button">Visit Community</a>
      <div class="divider"></div>
      <p>If you didn't submit this inquiry, please ignore this email.</p>
    `),
  };
}

/**
 * Generate tracking URL based on carrier
 */
export function generateTrackingUrl(carrier: string | undefined, trackingNumber: string): string | undefined {
  if (!carrier || !trackingNumber) return undefined;

  const carrierLower = carrier.toLowerCase();

  if (carrierLower.includes('dhl')) {
    return `https://www.dhl.com/en-us/tracking/tracking-number?tracking-id=${trackingNumber}`;
  }
  if (carrierLower.includes('fedex')) {
    return `https://www.fedex.com/apps/fedextrack/?action=track&trackingnumber=${trackingNumber}`;
  }
  if (carrierLower.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  }
  if (carrierLower.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction.action?tLabels=${trackingNumber}`;
  }
  if (carrierLower.includes('sf') || carrierLower.includes('顺丰')) {
    return `https://www.sf-express.com/ae/track/details/${trackingNumber}`;
  }

  return undefined;
}

export default {
  sendEmail,
  welcomeEmailTemplate,
  orderConfirmationEmailTemplate,
  orderShippedEmailTemplate,
  inquiryNotificationEmailTemplate,
  inquiryConfirmationEmailTemplate,
};
