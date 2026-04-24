import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_email, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const orders = (data || []).map(o => ({
      id: o.id,
      customerEmail: o.customer_email,
      amount: o.total_amount || 0,
      status: o.status,
      date: new Date(o.created_at).toISOString().split('T')[0]
    }));

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch recent orders:', error);
    return NextResponse.json([]);
  }
}
