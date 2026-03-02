import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentReceivedEmail, sendOrderConfirmation, sendCourseEnrollmentEmail } from '@vetsphere/shared/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 验证支付宝签名
function verifyAlipaySign(params: Record<string, string>, publicKey: string): boolean {
  const sign = params.sign;
  const signType = params.sign_type;
  
  if (!sign || !publicKey) return false;
  
  // 排除 sign 和 sign_type 字段，按字母排序
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'sign_type')
    .sort();
  
  const signStr = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  try {
    const verify = crypto.createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1');
    verify.update(signStr, 'utf8');
    return verify.verify(publicKey, sign, 'base64');
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
      paymentMethod: 'Alipay'
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

    console.log(`[Alipay Notify] Emails sent for order ${orderId}`);
  } catch (error) {
    console.error('[Alipay Notify] Email send error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取支付宝异步通知参数
    const formData = await request.formData();
    const params: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // 验证签名
    const publicKey = process.env.ALIPAY_PUBLIC_KEY || '';
    const signVerified = verifyAlipaySign(params, publicKey);
    
    if (!signVerified) {
      console.error('Alipay notify signature verification failed');
      return new NextResponse('fail', { status: 400 });
    }

    const { out_trade_no, trade_no, trade_status, total_amount } = params;

    // 从订单号提取原始订单 ID
    const orderId = out_trade_no.split('_')[0].replace('VS', '');

    // 检查交易状态
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      // Idempotency check: Skip if order already paid
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (existingOrder?.status === 'Paid' || existingOrder?.status === 'Completed') {
        console.log(`[Alipay Notify] Order ${orderId} already paid, skipping duplicate`);
        return new NextResponse('success', { status: 200 });
      }

      const paidAmount = parseFloat(total_amount);

      // 更新订单状态
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'Paid',
          payment_method: 'alipay',
          payment_id: trade_no,
          paid_amount: paidAmount,
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update order:', error);
        return new NextResponse('fail', { status: 500 });
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

      console.log(`Order ${orderId} paid via Alipay, trade_no: ${trade_no}`);
    }

    // 返回成功响应给支付宝
    return new NextResponse('success', { status: 200 });
  } catch (error) {
    console.error('Alipay notify error:', error);
    return new NextResponse('fail', { status: 500 });
  }
}
