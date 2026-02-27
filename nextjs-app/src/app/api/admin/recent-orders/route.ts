import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_email, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

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
