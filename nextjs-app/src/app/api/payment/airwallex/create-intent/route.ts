import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const AIRWALLEX_HOST = process.env.AIRWALLEX_HOST || 'https://api-demo.airwallex.com';
const CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || 'YOUR_AIRWALLEX_CLIENT_ID';
const API_KEY = process.env.AIRWALLEX_API_KEY || 'YOUR_AIRWALLEX_API_KEY';

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
  try {
    const { orderId, amount, currency, description, customer } = await request.json();
    const token = await getAirwallexToken();

    const payload = {
      request_id: uuidv4(),
      amount,
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
