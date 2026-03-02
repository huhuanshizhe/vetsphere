import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentReceivedEmail, sendOrderConfirmation, sendCourseEnrollmentEmail } from '@vetsphere/shared/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 解密微信支付通知数据 (AEAD_AES_256_GCM)
function decryptWechatNotify(
  ciphertext: string,
  associatedData: string,
  nonce: string,
  apiV3Key: string
): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key),
    Buffer.from(nonce)
  );
  
  decipher.setAuthTag(Buffer.from(ciphertext.slice(-16), 'base64'));
  decipher.setAAD(Buffer.from(associatedData));
  
  const ciphertextBuffer = Buffer.from(ciphertext.slice(0, -16), 'base64');
  let decrypted = decipher.update(ciphertextBuffer, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// 验证微信支付签名
function verifyWechatSign(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const message = `${timestamp}\n${nonce}\n${body}\n`;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(message);
    return verify.verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
}

// Send payment confirmation emails
async function sendPaymentEmails(orderId: string, amount: number) {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const customerEmail = order.customer_email;
    const customerName = order.customer_name || 'Customer';

    // Send payment received email
    await sendPaymentReceivedEmail(customerEmail, {
      customerName,
      orderId,
      amount,
      paymentMethod: 'WeChat Pay'
    });

    // Send order confirmation email
    const items = order.items || [];
    await sendOrderConfirmation(customerEmail, {
      orderId,
      customerName,
      items: items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price
      })),
      totalAmount: order.total_amount,
      orderUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetsphere.cn'}/user?tab=orders`
    });

    // Send course enrollment emails for course items
    const courseItems = items.filter((item: any) => item.type === 'course');
    for (const course of courseItems) {
      await sendCourseEnrollmentEmail(customerEmail, {
        studentName: customerName,
        courseTitle: course.name,
        startDate: course.startDate || 'TBD',
        location: course.location || 'Online',
        courseUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetsphere.cn'}/courses/${course.id}`
      });
    }

    console.log(`[WeChat Notify] Emails sent for order ${orderId}`);
  } catch (error) {
    console.error('[WeChat Notify] Email send error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取请求头中的签名信息
    const signature = request.headers.get('Wechatpay-Signature') || '';
    const timestamp = request.headers.get('Wechatpay-Timestamp') || '';
    const nonce = request.headers.get('Wechatpay-Nonce') || '';

    // 获取请求体
    const body = await request.text();
    
    // 注意: 生产环境需要验证签名
    // 需要下载微信支付平台证书并配置 WECHAT_PLATFORM_CERT
    const platformCert = process.env.WECHAT_PLATFORM_CERT;
    if (platformCert) {
      const verified = verifyWechatSign(timestamp, nonce, body, signature, platformCert);
      if (!verified) {
        console.error('WeChat notify signature verification failed');
        return NextResponse.json(
          { code: 'FAIL', message: 'Signature verification failed' },
          { status: 400 }
        );
      }
    }

    // 解析通知内容
    const notification = JSON.parse(body);
    const resource = notification.resource;

    // 解密通知内容
    const apiV3Key = process.env.WECHAT_API_V3_KEY || '';
    if (!apiV3Key) {
      console.error('WECHAT_API_V3_KEY not configured');
      return NextResponse.json(
        { code: 'FAIL', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    const decrypted = decryptWechatNotify(
      resource.ciphertext,
      resource.associated_data || '',
      resource.nonce,
      apiV3Key
    );

    const paymentInfo = JSON.parse(decrypted);
    const { out_trade_no, transaction_id, trade_state, amount } = paymentInfo;

    // 从订单号提取原始订单 ID
    const orderId = out_trade_no.split('_')[0].replace('VS', '');

    // 检查交易状态
    if (trade_state === 'SUCCESS') {
      // Idempotency check: Skip if order already paid
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (existingOrder?.status === 'Paid' || existingOrder?.status === 'Completed') {
        console.log(`[WeChat Notify] Order ${orderId} already paid, skipping duplicate`);
        return NextResponse.json({ code: 'SUCCESS', message: 'OK' });
      }

      const paidAmount = amount.total / 100; // 微信支付金额单位是分

      // 更新订单状态
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'Paid',
          payment_method: 'wechat',
          payment_id: transaction_id,
          paid_amount: paidAmount,
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update order:', error);
        return NextResponse.json(
          { code: 'FAIL', message: 'Failed to update order' },
          { status: 500 }
        );
      }

      // Update course enrollments payment status
      const { error: enrollmentError } = await supabase
        .from('course_enrollments')
        .update({ payment_status: 'paid' })
        .eq('order_id', orderId);

      if (enrollmentError) {
        console.error('Failed to update enrollments:', enrollmentError);
      }

      // Send confirmation emails (non-blocking)
      sendPaymentEmails(orderId, paidAmount);

      console.log(`Order ${orderId} paid via WeChat, transaction_id: ${transaction_id}`);
    }

    // 返回成功响应给微信
    return NextResponse.json({ code: 'SUCCESS', message: 'OK' });
  } catch (error) {
    console.error('WeChat notify error:', error);
    return NextResponse.json(
      { code: 'FAIL', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
