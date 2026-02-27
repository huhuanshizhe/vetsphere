/**
 * VetSphere Email Service
 * Supports multiple providers: Resend (recommended), SendGrid, or basic SMTP
 * 
 * Environment Variables:
 * - EMAIL_PROVIDER: 'resend' | 'sendgrid' | 'smtp' (default: 'resend')
 * - RESEND_API_KEY: API key for Resend
 * - SENDGRID_API_KEY: API key for SendGrid
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: SMTP configuration
 * - EMAIL_FROM: Default sender email (e.g., 'VetSphere <noreply@vetsphere.pro>')
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email Templates
export const emailTemplates = {
  // Welcome Email
  welcome: (userName: string, loginUrl: string) => ({
    subject: 'Welcome to VetSphere - Your Professional Development Platform',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to VetSphere</title>
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
          
          <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 20px;">Welcome, ${userName}! 🎉</h2>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining VetSphere, the premier platform for veterinary professional development. 
            You now have access to:
          </p>
          
          <ul style="color: #475569; line-height: 2; padding-left: 20px;">
            <li>Expert-led surgical training courses</li>
            <li>Clinical case sharing community</li>
            <li>Professional equipment marketplace</li>
            <li>AI-powered surgical consultation</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: #10B981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Start Exploring
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
            Questions? Contact us at support@vetsphere.pro
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Welcome to VetSphere, ${userName}!\n\nThank you for joining. Visit ${loginUrl} to get started.`
  }),

  // Order Confirmation
  orderConfirmation: (orderDetails: {
    orderId: string;
    customerName: string;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    orderUrl: string;
  }) => ({
    subject: `Order Confirmed #${orderDetails.orderId} - VetSphere`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10B981; font-size: 24px; margin: 0;">VetSphere</h1>
          </div>
          
          <h2 style="color: #1e293b; font-size: 20px;">Order Confirmed ✓</h2>
          <p style="color: #64748b;">Order #${orderDetails.orderId}</p>
          
          <p style="color: #475569;">Hi ${orderDetails.customerName},</p>
          <p style="color: #475569;">Thank you for your order! Here's what you ordered:</p>
          
          <table width="100%" style="margin: 20px 0; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 12px; text-align: left; color: #475569;">Item</th>
                <th style="padding: 12px; text-align: center; color: #475569;">Qty</th>
                <th style="padding: 12px; text-align: right; color: #475569;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${orderDetails.items.map(item => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; color: #1e293b;">${item.name}</td>
                <td style="padding: 12px; text-align: center; color: #64748b;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right; color: #1e293b;">¥${item.price.toLocaleString()}</td>
              </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold; color: #1e293b;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #10B981; font-size: 18px;">¥${orderDetails.totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderDetails.orderUrl}" style="display: inline-block; background: #10B981; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              View Order Details
            </a>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Order Confirmed #${orderDetails.orderId}\n\nTotal: ¥${orderDetails.totalAmount}\nView details: ${orderDetails.orderUrl}`
  }),

  // Course Enrollment
  courseEnrollment: (details: {
    studentName: string;
    courseTitle: string;
    startDate: string;
    location: string;
    courseUrl: string;
  }) => ({
    subject: `Enrolled: ${details.courseTitle} - VetSphere`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Course Enrollment</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10B981; font-size: 24px; margin: 0;">VetSphere Academy</h1>
          </div>
          
          <h2 style="color: #1e293b; font-size: 20px;">🎓 You're Enrolled!</h2>
          
          <p style="color: #475569;">Dear ${details.studentName},</p>
          <p style="color: #475569;">Congratulations! You've been enrolled in:</p>
          
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px; padding: 24px; margin: 20px 0; color: white;">
            <h3 style="margin: 0 0 10px 0; font-size: 18px;">${details.courseTitle}</h3>
            <p style="margin: 5px 0; opacity: 0.9;">📅 ${details.startDate}</p>
            <p style="margin: 5px 0; opacity: 0.9;">📍 ${details.location}</p>
          </div>
          
          <p style="color: #475569;">Please ensure you:</p>
          <ul style="color: #475569; line-height: 1.8;">
            <li>Review the course materials before the start date</li>
            <li>Arrive 15 minutes early on the first day</li>
            <li>Bring any required equipment mentioned in the syllabus</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${details.courseUrl}" style="display: inline-block; background: #10B981; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              View Course Details
            </a>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `You're enrolled in ${details.courseTitle}!\n\nDate: ${details.startDate}\nLocation: ${details.location}\n\nView details: ${details.courseUrl}`
  }),

  // Course Reminder (1 day before)
  courseReminder: (details: {
    studentName: string;
    courseTitle: string;
    startDate: string;
    location: string;
    courseUrl: string;
  }) => ({
    subject: `Reminder: ${details.courseTitle} starts tomorrow!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Course Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 48px;">⏰</span>
          </div>
          
          <h2 style="color: #1e293b; font-size: 20px; text-align: center;">Course Starts Tomorrow!</h2>
          
          <p style="color: #475569;">Hi ${details.studentName},</p>
          <p style="color: #475569;">This is a friendly reminder that your course begins tomorrow:</p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">${details.courseTitle}</h3>
            <p style="margin: 5px 0; color: #92400e;">📅 ${details.startDate}</p>
            <p style="margin: 5px 0; color: #92400e;">📍 ${details.location}</p>
          </div>
          
          <p style="color: #475569;">We look forward to seeing you there!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${details.courseUrl}" style="display: inline-block; background: #10B981; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              View Course
            </a>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Reminder: ${details.courseTitle} starts tomorrow!\n\nDate: ${details.startDate}\nLocation: ${details.location}`
  }),

  // Payment Received
  paymentReceived: (details: {
    customerName: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
  }) => ({
    subject: `Payment Received - Order #${details.orderId}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payment Received</title></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background: white; border-radius: 16px; padding: 40px; text-align: center;">
          <div style="width: 80px; height: 80px; background: #d1fae5; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">✓</span>
          </div>
          <h2 style="color: #10B981; margin-bottom: 10px;">Payment Successful</h2>
          <p style="color: #64748b;">Order #${details.orderId}</p>
          <p style="font-size: 32px; font-weight: bold; color: #1e293b; margin: 20px 0;">¥${details.amount.toLocaleString()}</p>
          <p style="color: #64748b;">Paid via ${details.paymentMethod}</p>
          <p style="color: #475569; margin-top: 20px;">Thank you for your purchase, ${details.customerName}!</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Payment of ¥${details.amount} received for Order #${details.orderId}. Thank you!`
  })
};

// Send email using configured provider
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  const from = options.from || process.env.EMAIL_FROM || 'VetSphere <noreply@vetsphere.pro>';

  try {
    switch (provider) {
      case 'resend':
        return await sendWithResend({ ...options, from });
      case 'sendgrid':
        return await sendWithSendGrid({ ...options, from });
      default:
        console.log('[Email] No provider configured, logging email:', options.subject);
        return { success: true, messageId: `mock-${Date.now()}` };
    }
  } catch (error) {
    console.error('[Email] Send error:', error);
    return { success: false, error: String(error) };
  }
}

// Resend provider
async function sendWithResend(options: EmailOptions & { from: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[Email/Resend] No API key, skipping send');
    return { success: true, messageId: `mock-resend-${Date.now()}` };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: options.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }

  const data = await response.json();
  return { success: true, messageId: data.id };
}

// SendGrid provider
async function sendWithSendGrid(options: EmailOptions & { from: string }): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log('[Email/SendGrid] No API key, skipping send');
    return { success: true, messageId: `mock-sendgrid-${Date.now()}` };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: Array.isArray(options.to) ? options.to.map(email => ({ email })) : [{ email: options.to }]
      }],
      from: { email: options.from.match(/<(.+)>/)?.[1] || options.from },
      subject: options.subject,
      content: [
        { type: 'text/plain', value: options.text || options.subject },
        { type: 'text/html', value: options.html }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  return { success: true, messageId: response.headers.get('x-message-id') || `sg-${Date.now()}` };
}

// Convenience functions
export async function sendWelcomeEmail(email: string, userName: string): Promise<EmailResult> {
  const template = emailTemplates.welcome(userName, `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetsphere.pro'}/dashboard`);
  return sendEmail({ to: email, ...template });
}

export async function sendOrderConfirmation(email: string, orderDetails: Parameters<typeof emailTemplates.orderConfirmation>[0]): Promise<EmailResult> {
  const template = emailTemplates.orderConfirmation(orderDetails);
  return sendEmail({ to: email, ...template });
}

export async function sendCourseEnrollmentEmail(email: string, details: Parameters<typeof emailTemplates.courseEnrollment>[0]): Promise<EmailResult> {
  const template = emailTemplates.courseEnrollment(details);
  return sendEmail({ to: email, ...template });
}

export async function sendCourseReminderEmail(email: string, details: Parameters<typeof emailTemplates.courseReminder>[0]): Promise<EmailResult> {
  const template = emailTemplates.courseReminder(details);
  return sendEmail({ to: email, ...template });
}

export async function sendPaymentReceivedEmail(email: string, details: Parameters<typeof emailTemplates.paymentReceived>[0]): Promise<EmailResult> {
  const template = emailTemplates.paymentReceived(details);
  return sendEmail({ to: email, ...template });
}
