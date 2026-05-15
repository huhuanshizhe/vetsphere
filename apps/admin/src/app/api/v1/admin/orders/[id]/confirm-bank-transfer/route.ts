import { NextRequest, NextResponse } from 'next/server';
import { finalizeCourseOrderPayment } from '@vetsphere/shared/lib/course-order-payment';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function extractAccessToken(req: NextRequest): string | undefined {
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  return token || undefined;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await params;
    const confirmedAt = new Date().toISOString();
    const supabase = getSupabaseAdmin(extractAccessToken(req));

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, payment_method')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (order.payment_method !== 'bank_transfer') {
      return NextResponse.json({ error: '仅银行转账订单可手动确认' }, { status: 400 });
    }

    const { error: paymentRecordError } = await supabase
      .from('payment_records')
      .update({
        status: 'completed',
        paid_at: confirmedAt,
      })
      .eq('order_id', id)
      .eq('payment_method', 'bank_transfer');

    if (paymentRecordError) {
      throw paymentRecordError;
    }

    const result = await finalizeCourseOrderPayment(supabase, {
      orderId: id,
      paymentStatus: 'paid',
      orderUpdate: {
        paid_at: confirmedAt,
        updated_at: confirmedAt,
      },
    });

    writeAuditLog(req, auth.admin, {
      module: 'order',
      action: 'confirm_bank_transfer',
      targetType: 'order',
      targetId: id,
      targetName: order.order_number ?? id,
      newValue: {
        confirmedAt,
        changed: result.changed,
        courseIds: result.courseIds,
      },
      changesSummary: `人工确认银行转账：${order.order_number ?? id}`,
    });

    return NextResponse.json({
      success: true,
      confirmedAt,
      changed: result.changed,
      courseIds: result.courseIds,
    });
  } catch (error) {
    console.error('Failed to confirm bank transfer:', error);
    return NextResponse.json({ error: '确认银行转账失败' }, { status: 500 });
  }
}