import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { rateLimiters } from '@vetsphere/shared/lib/rate-limit';



async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

export const dynamic = 'force-dynamic';
const AIRWALLEX_HOST = process.env.AIRWALLEX_HOST || 'https://api-demo.airwallex.com';
const CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || 'YOUR_AIRWALLEX_CLIENT_ID';
const API_KEY = process.env.AIRWALLEX_API_KEY || 'YOUR_AIRWALLEX_API_KEY';


// Verify user authentication from Bearer token
async function verifyAuth(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const supabaseAdmin = await getSupabaseAdmin();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id };
}

async function getAirwallexToken() {
  const response = await axios.post(
    `${AIRWALLEX_HOST}/api/v1/authentication/login`,
    {},
    {
      headers: {
        'x-client-id': CLIENT_ID,
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.token;
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.payment(request);
    if (rateLimitResult) return rateLimitResult;

    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { orderId, amount, currency, description, customer } = await request.json();

    // Verify order exists and belongs to the authenticated user
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status, total_amount')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.user_id && order.user_id !== auth.userId) {
      return NextResponse.json({ error: 'Order does not belong to authenticated user' }, { status: 403 });
    }
    if (order.status === 'Paid' || order.status === 'Completed') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
    }
    // Validate amount matches database
    if (Math.abs(Number(order.total_amount) - Number(amount)) > 0.01) {
      return NextResponse.json({ error: 'Amount does not match order total' }, { status: 400 });
    }

    const token = await getAirwallexToken();

    const payload = {
      request_id: uuidv4(),
      amount: Number(order.total_amount), // Use DB amount, not frontend
      currency: currency || 'CNY',
      merchant_order_id: orderId,
      description: description || `VetSphere Order ${orderId}`,
      capture_method: 'AUTOMATIC',
      customer: customer || {},
    };

    const response = await axios.post(
      `${AIRWALLEX_HOST}/api/v1/pa/payment_intents/create`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({
      status: 'success',
      intent_id: response.data.id,
      client_secret: response.data.client_secret,
      amount: response.data.amount,
      currency: response.data.currency,
    });
  } catch (error: any) {
    console.error('Airwallex Error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to initiate payment', details: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
