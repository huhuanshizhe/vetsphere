'use client';

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { Loader2, AlertCircle } from 'lucide-react';
import { StripeErrorBoundary } from './StripeErrorBoundary';

// Get publishable key from API at runtime (more reliable than build-time inlining)
// This ensures the key is always fresh, even after env var changes on Vercel
const fetchStripePublishableKey = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/stripe-config');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publishableKey || null;
  } catch (err) {
    console.error('[StripeEmbeddedCheckout] Failed to fetch publishable key:', err);
    return null;
  }
};

// Fallback: try build-time inlined key (may be undefined if not rebuilt)
const getBuildTimeKey = (): string | undefined => {
  // Next.js inlines NEXT_PUBLIC_* vars at build time
  // This may return undefined if the app was not rebuilt after setting the env var
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  }
  return undefined;
};

const isValidKey = (key: string | null | undefined) => key && key.startsWith('pk_');

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
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  // Initialize Stripe: fetch publishable key from API first, then create PaymentIntent
  useEffect(() => {
    let cancelled = false;
    
    const initStripe = async () => {
      console.log('[StripeEmbeddedCheckout] Starting initialization...');
      
      // Step 1: Try to get publishable key from API (runtime, most reliable)
      let key: string | null | undefined = await fetchStripePublishableKey();
      
      console.log('[StripeEmbeddedCheckout] API key fetch result:', {
        hasKey: !!key,
        isValid: isValidKey(key),
        keyPrefix: key ? key.substring(0, 15) + '...' : 'none',
      });
      
      // Step 2: Fallback to build-time inlined key if API failed
      if (!isValidKey(key)) {
        key = getBuildTimeKey();
        console.log('[StripeEmbeddedCheckout] Fallback to build-time key:', {
          hasKey: !!key,
          isValid: isValidKey(key),
          keyPrefix: key ? key.substring(0, 15) + '...' : 'none',
        });
      }
      
      // Step 3: If no valid key, show error
      if (!isValidKey(key)) {
        const errorMsg = 'Stripe is not configured. Please contact support.';
        console.error('[StripeEmbeddedCheckout] Publishable key validation failed');
        if (!cancelled) {
          setStripeError(errorMsg);
          setLoading(false);
          onError?.(errorMsg);
        }
        return;
      }
      
      if (!cancelled) {
        setPublishableKey(key!);
      }
      
      // Step 4: Initialize Stripe.js
      console.log('[StripeEmbeddedCheckout] Initializing Stripe.js...');
      const stripe = loadStripe(key!);
      if (!cancelled) {
        setStripePromise(stripe);
      }
      
      // Step 5: Fetch PaymentIntent from backend
      console.log('[StripeEmbeddedCheckout] Creating PaymentIntent...');
      try {
        const res = await fetch('/api/payment/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            amount,
            currency: currency.toLowerCase(),
          }),
        });
        
        console.log('[StripeEmbeddedCheckout] PaymentIntent API status:', res.status);
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        const isDev = process.env.NODE_ENV === 'development';
        console.log('[StripeEmbeddedCheckout] PaymentIntent response:', {
          hasClientSecret: !!data.clientSecret,
          clientSecretPrefix: data.clientSecret ? data.clientSecret.substring(0, 20) + '...' : 'none',
          clientSecretLength: data.clientSecret?.length || 0,
          clientSecretIncludesSecret: data.clientSecret?.includes('_secret_'),
          clientSecretFull: isDev ? data.clientSecret : 'hidden_in_prod',
        });
        
        if (!cancelled) {
          if (data.error) {
            setError(data.error);
            onError?.(data.error);
          } else if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            setError('Invalid response from payment server');
            onError?.('Invalid response from payment server');
          }
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[StripeEmbeddedCheckout] PaymentIntent fetch error:', err);
        if (!cancelled) {
          const errorMsg = 'Failed to initialize payment: ' + (err.message || 'Unknown error');
          setError(errorMsg);
          onError?.(errorMsg);
          setLoading(false);
        }
      }
    };
    
    initStripe();
    
    return () => {
      cancelled = true;
    };
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
          The payment system is not properly configured. Please ensure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set and the app has been rebuilt.
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
        <p className="text-red-600">Failed to load payment form - no client secret</p>
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

  // Log the FULL client secret for debugging (only in development)
  const isDev = process.env.NODE_ENV === 'development';
  console.log('[StripeEmbeddedCheckout] Rendering EmbeddedCheckout:', {
    hasClientSecret: !!clientSecret,
    clientSecretPrefix: clientSecret.substring(0, 20) + '...',
    clientSecretFull: isDev ? clientSecret : 'hidden_in_prod',
    clientSecretLength: clientSecret?.length || 0,
    clientSecretIncludesSecret: clientSecret?.includes('_secret_'),
    hasStripePromise: !!stripePromise,
    keyValid: isValidKey(publishableKey),
  });

  return (
    <div className="bg-white rounded-lg min-h-[500px]">
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