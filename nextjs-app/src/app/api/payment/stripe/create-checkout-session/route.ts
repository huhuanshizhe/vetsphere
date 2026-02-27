import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_4eC39HqLyjWDarjtT1zdp7dc', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: NextRequest) {
  try {
    const { items, orderId, returnUrl } = await request.json();

    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'cny',
        product_data: {
          name: item.name,
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'alipay'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${returnUrl}?success=true&orderId=${orderId}`,
      cancel_url: `${returnUrl}?canceled=true`,
      client_reference_id: orderId,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
