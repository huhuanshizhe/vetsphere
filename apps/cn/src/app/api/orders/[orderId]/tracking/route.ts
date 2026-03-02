import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const dynamic = 'force-dynamic';

interface TrackingEvent {
  id: string;
  status: string;
  location: string;
  description: string;
  timestamp: string;
}

interface TrackingInfo {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: 'pending' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  estimatedDelivery: string | null;
  events: TrackingEvent[];
}

// GET /api/orders/[orderId]/tracking - Get tracking info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Get order with shipping info
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get tracking events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('order_tracking')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    // Determine current status based on events
    let currentStatus: TrackingInfo['status'] = 'pending';
    if (order.status === 'Completed') currentStatus = 'delivered';
    else if (order.status === 'Shipped') currentStatus = 'in_transit';

    const trackingInfo: TrackingInfo = {
      orderId,
      carrier: order.shipping_carrier || 'Standard Shipping',
      trackingNumber: order.tracking_number || '',
      status: currentStatus,
      estimatedDelivery: order.estimated_delivery || null,
      events: events?.map((e: any) => ({
        id: e.id,
        status: e.status,
        location: e.location || '',
        description: e.description,
        timestamp: e.created_at
      })) || []
    };

    // If no events, add default events based on order status
    if (trackingInfo.events.length === 0) {
      trackingInfo.events = generateDefaultEvents(order);
    }

    return NextResponse.json(trackingInfo);

  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json({ error: 'Failed to get tracking info' }, { status: 500 });
  }
}

// POST /api/orders/[orderId]/tracking - Add tracking event (admin/supplier)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { status, location, description, trackingNumber, carrier, estimatedDelivery } = body;

    // Update order if tracking details provided
    if (trackingNumber || carrier || estimatedDelivery) {
      const updatePayload: any = {};
      if (trackingNumber) updatePayload.tracking_number = trackingNumber;
      if (carrier) updatePayload.shipping_carrier = carrier;
      if (estimatedDelivery) updatePayload.estimated_delivery = estimatedDelivery;
      
      await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);
    }

    // Add tracking event
    if (status && description) {
      const { error } = await supabaseAdmin
        .from('order_tracking')
        .insert({
          order_id: orderId,
          status,
          location: location || '',
          description
        });

      if (error) {
        console.error('Insert tracking event error:', error);
      }

      // Update order status based on tracking
      let orderStatus = 'Pending';
      if (status === 'shipped' || status === 'in_transit') orderStatus = 'Shipped';
      if (status === 'delivered') orderStatus = 'Completed';

      await supabaseAdmin
        .from('orders')
        .update({ status: orderStatus })
        .eq('id', orderId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Add tracking error:', error);
    return NextResponse.json({ error: 'Failed to add tracking' }, { status: 500 });
  }
}

// Generate default tracking events based on order status
function generateDefaultEvents(order: any): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const orderDate = new Date(order.created_at || order.date);

  // Order placed
  events.push({
    id: 'evt-1',
    status: 'order_placed',
    location: '',
    description: 'Order placed successfully',
    timestamp: orderDate.toISOString()
  });

  if (order.status === 'Paid' || order.status === 'Shipped' || order.status === 'Completed') {
    // Payment confirmed
    events.push({
      id: 'evt-2',
      status: 'payment_confirmed',
      location: '',
      description: 'Payment confirmed',
      timestamp: new Date(orderDate.getTime() + 300000).toISOString() // +5 min
    });
  }

  if (order.status === 'Shipped' || order.status === 'Completed') {
    // Shipped
    events.push({
      id: 'evt-3',
      status: 'shipped',
      location: 'Warehouse',
      description: 'Package shipped from warehouse',
      timestamp: new Date(orderDate.getTime() + 86400000).toISOString() // +1 day
    });
  }

  if (order.status === 'Completed') {
    // Delivered
    events.push({
      id: 'evt-4',
      status: 'delivered',
      location: order.shipping_address || 'Destination',
      description: 'Package delivered',
      timestamp: new Date(orderDate.getTime() + 259200000).toISOString() // +3 days
    });
  }

  return events.reverse(); // Most recent first
}
