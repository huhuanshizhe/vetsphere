import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  const supabase = getSupabaseAdmin();
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter to only product orders (orders containing at least one product item)
    const shopOrders = (orders || [])
      .filter((o: any) => (o.items || []).some((item: any) => item.type === 'product'))
      .map((o: any) => {
        const productItems = (o.items || []).filter((item: any) => item.type === 'product');
        const productTotal = productItems.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0);

        return {
          id: o.id,
          customerName: o.customer_name || '-',
          customerEmail: o.customer_email || '-',
          items: productItems,
          allItems: o.items || [],
          productTotal,
          totalAmount: o.total_amount || 0,
          status: o.status,
          shippingAddress: o.shipping_address,
          paymentMethod: o.payment_method,
          date: o.date || o.created_at,
          createdAt: o.created_at,
        };
      });

    return NextResponse.json(shopOrders);
  } catch (error) {
    console.error('Failed to fetch shop orders:', error);
    return NextResponse.json([], { status: 500 });
  }
}
