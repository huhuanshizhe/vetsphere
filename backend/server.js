
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import Stripe from 'stripe';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = 3001;

// --- Stripe Configuration ---
// 生产环境请确保 STRIPE_SECRET_KEY 在 .env 文件中
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_4eC39HqLyjWDarjtT1zdp7dc', {
    apiVersion: '2023-10-16',
});

// --- Airwallex Configuration ---
const AIRWALLEX_HOST = process.env.AIRWALLEX_HOST || 'https://api-demo.airwallex.com';
const CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || 'YOUR_AIRWALLEX_CLIENT_ID';
const API_KEY = process.env.AIRWALLEX_API_KEY || 'YOUR_AIRWALLEX_API_KEY';

app.use(cors({
  origin: [
    'https://veterinary.chanyechuhai.com', 
    'https://vetsphere.com',
    'https://www.vetsphere.com',
    'https://vetsphere.net',
    'https://www.vetsphere.net',
    'http://localhost:3000', 
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

app.use(bodyParser.json());

// --- 路由 ---

app.get('/', (req, res) => {
    res.send('VetSphere Payment Gateway (Stripe & Airwallex) is running.');
});

// ==========================================
// Stripe Payment Endpoints
// ==========================================

// 1. Classic Payment Intent (Embedded Form) - KEEPING FOR REFERENCE
app.post('/api/payment/stripe/create-intent', async (req, res) => {
    const { orderId, amount, currency } = req.body;
    try {
        const amountInCents = Math.round(amount * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency ? currency.toLowerCase() : 'cny',
            metadata: { orderId },
            automatic_payment_methods: { enabled: true },
        });
        res.json({
            status: 'success',
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. NEW: Stripe Checkout Session (Hosted Page)
app.post('/api/payment/stripe/create-checkout-session', async (req, res) => {
    const { items, orderId, returnUrl } = req.body;

    try {
        // Map cart items to Stripe Line Items
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'cny',
                product_data: {
                    name: item.name,
                    images: item.imageUrl ? [item.imageUrl] : [],
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'alipay'], // Stripe Checkout supports multiple methods easily
            line_items: lineItems,
            mode: 'payment',
            success_url: `${returnUrl}?success=true&orderId=${orderId}`,
            cancel_url: `${returnUrl}?canceled=true`,
            client_reference_id: orderId,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Airwallex Payment Endpoints
// ==========================================

async function getAirwallexToken() {
    try {
        const response = await axios.post(
            `${AIRWALLEX_HOST}/api/v1/authentication/login`,
            {}, 
            {
                headers: {
                    'x-client-id': CLIENT_ID,
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.token;
    } catch (error) {
        console.error('Airwallex Auth Failed:', error.response?.data || error.message);
        throw new Error('Payment Gateway Authentication Failed');
    }
}

app.post('/api/payment/airwallex/create-intent', async (req, res) => {
    const { orderId, amount, currency, description, customer } = req.body;

    try {
        const token = await getAirwallexToken();
        const payload = {
            request_id: uuidv4(),
            amount: amount,
            currency: currency || 'CNY',
            merchant_order_id: orderId,
            description: description || `VetSphere Order ${orderId}`,
            capture_method: 'AUTOMATIC',
            customer: customer || {} 
        };

        const response = await axios.post(
            `${AIRWALLEX_HOST}/api/v1/pa/payment_intents/create`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            status: 'success',
            intent_id: response.data.id,
            client_secret: response.data.client_secret,
            amount: response.data.amount,
            currency: response.data.currency
        });

    } catch (error) {
        console.error('Airwallex Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to initiate payment', 
            details: error.response?.data || error.message 
        });
    }
});

// Webhook Listener (Generic)
app.post('/api/webhook', (req, res) => {
    // 实际生产中区分 Stripe 和 Airwallex 的 Webhook 验证逻辑
    console.log('Received Webhook:', req.body);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`
==================================================
   VetSphere Payment Backend
   Gateways: Stripe, Airwallex
   Port: ${PORT}
==================================================
    `);
});
