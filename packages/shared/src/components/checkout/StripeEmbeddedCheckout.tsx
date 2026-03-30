'use client';

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { Loader2, AlertCircle } from 'lucide-react';
import { StripeErrorBoundary } from './StripeErrorBoundary';

// Get the publishable key and validate it
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const isValidKey = stripePublishableKey && stripePublishableKey.startsWith('pk_');

// Initialize Stripe only if key is valid
let stripePromise: Promise<Stripe | null> | null = null;
if (isValidKey) {
  stripePromise = loadStripe(stripePublishableKey);
} else {
  console.error('Stripe publishable key is invalid or missing:', stripePublishableKey ? 'key exists but invalid format' : 'key is empty');
  stripePromise = null;
}

interface StripeEmbeddedCheckoutProps {
  orderId: string;
  amount: number;
  currency: string;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export default function StripeEmbeddedCheckout({
  orderId,
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
}: StripeEmbeddedCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // Single useEffect: Initialize Stripe and fetch clientSecret
  useEffect(() => {
    console.log('[StripeEmbeddedCheckout] Starting initialization...');
    console.log('[StripeEmbeddedCheckout] Key validation:', {
      hasKey: !!stripePublishableKey,
      isValid: isValidKey,
      keyPrefix: stripePublishableKey ? stripePublishableKey.substring(0, 15) + '...' : 'none',
    });

    // Step 1: Validate publishable key
    if (!isValidKey) {
      const errorMsg = 'Stripe is not configured. Please contact support.';
      console.error('[StripeEmbeddedCheckout] Publishable key validation failed');
      setStripeError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    // Step 2: Verify stripePromise exists
    if (!stripePromise) {
      const errorMsg = 'Stripe initialization failed. Please refresh the page.';
      console.error('[StripeEmbeddedCheckout] stripePromise is null');
      setStripeError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    console.log('[StripeEmbeddedCheckout] Fetching PaymentIntent...');

    // Step 3: Fetch PaymentIntent from API
    fetch('/api/payment/stripe/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        amount,
        currency: currency.toLowerCase(),
      }),
    })
      .then((res) => {
        console.log('[StripeEmbeddedCheckout] API Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('[StripeEmbeddedCheckout] API Response data:', {
          hasClientSecret: !!data.clientSecret,
          hasError: !!data.error,
          clientSecretPrefix: data.clientSecret ? data.clientSecret.substring(0, 20) + '...' : 'none',
        });

        if (data.error) {
          setError(data.error);
          onError?.(data.error);
          setLoading(false);
        } else if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setLoading(false);
        } else {
          const errorMsg = 'Invalid response from payment server';
          setError(errorMsg);
          onError?.(errorMsg);
          setLoading(false);
        }
      })
      .catch((err) => {
        const errorMsg = 'Failed to initialize payment: ' + (err.message || 'Unknown error');
        console.error('[StripeEmbeddedCheckout] PaymentIntent fetch error:', err);
        setError(errorMsg);
        onError?.(errorMsg);
        setLoading(false);
      });
  }, [orderId, amount, currency, onError]);

  // Show Stripe configuration error
  if (stripeError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h3 className="font-bold text-red-700">Payment Configuration Error</h3>
        </div>
        <p className="text-red-600 mb-4">{stripeError}</p>
        <p className="text-sm text-red-500 mb-4">
          The payment system is not properly configured. This may be due to missing environment variables.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-gray-600">Loading payment form...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load payment form</p>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h3 className="font-bold text-red-700">Stripe Not Available</h3>
        </div>
        <p className="text-red-600 mb-4">Stripe payment is not available at this time.</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  console.log('[StripeEmbeddedCheckout] Rendering with:', {
    hasClientSecret: !!clientSecret,
    clientSecretPrefix: clientSecret.substring(0, 20) + '...',
    hasStripePromise: !!stripePromise,
  });

  return (
    <div className="bg-white rounded-lg min-h-[500px] relative">
      {/* Debug overlay */}
      <div className="absolute top-2 right-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs z-50 shadow-lg">
        <div className="font-bold mb-1">Stripe Debug:</div>
        <div>Key: {isValidKey ? '✅' : '❌'}</div>
        <div>Promise: {!!stripePromise ? '✅' : '❌'}</div>
        <div>Secret: {clientSecret ? '✅' : '❌'}</div>
        <div className="font-mono text-[10px]">{clientSecret?.substring(0, 25)}...</div>
      </div>
      
      <StripeErrorBoundary>
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </StripeErrorBoundary>
    </div>
  );
}
