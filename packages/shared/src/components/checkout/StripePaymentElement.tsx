'use client';

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, AlertCircle } from 'lucide-react';

const fetchStripePublishableKey = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/stripe-config');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publishableKey || null;
  } catch (err) {
    console.error('[StripePaymentElement] Failed to fetch publishable key:', err);
    return null;
  }
};

const getBuildTimeKey = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  }
  return undefined;
};

const isValidKey = (key: string | null | undefined) => key && key.startsWith('pk_');

interface CheckoutFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

function CheckoutForm({ onSuccess, onError, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/checkout/success',
      },
    });

    if (error) {
      const errorMsg = error.message || 'Payment failed';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } else {
      onSuccess?.();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        onChange={(event) => {
          if (event.complete) {
            setErrorMessage(null);
          }
        }}
      />
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{errorMessage}</p>
        </div>
      )}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface StripePaymentElementProps {
  orderId: string;
  amount: number;
  currency: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export default function StripePaymentElement({
  orderId,
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
}: StripePaymentElementProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initStripe = async () => {
      console.log('[StripePaymentElement] Starting initialization...');

      // Get publishable key
      let key: string | null | undefined = await fetchStripePublishableKey();
      if (!isValidKey(key)) {
        key = getBuildTimeKey() ?? null;
      }

      if (!isValidKey(key)) {
        const errorMsg = 'Stripe is not configured. Please contact support.';
        console.error('[StripePaymentElement] Publishable key validation failed');
        if (!cancelled) {
          setError(errorMsg);
          onError?.(errorMsg);
          setLoading(false);
        }
        return;
      }

      console.log('[StripePaymentElement] Initializing Stripe.js...');
      const stripe = loadStripe(key!);
      if (!cancelled) {
        setStripePromise(stripe);
      }

      // Create PaymentIntent
      console.log('[StripePaymentElement] Creating PaymentIntent...');
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

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log('[StripePaymentElement] PaymentIntent response:', {
          hasClientSecret: !!data.clientSecret,
          clientSecretLength: data.clientSecret?.length || 0,
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
        console.error('[StripePaymentElement] PaymentIntent fetch error:', err);
        if (!cancelled) {
          setError('Failed to initialize payment: ' + (err.message || 'Unknown error'));
          onError?.('Failed to initialize payment');
          setLoading(false);
        }
      }
    };

    initStripe();

    return () => {
      cancelled = true;
    };
  }, [orderId, amount, currency, onError]);

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h3 className="font-bold text-red-700">Payment Error</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
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

  if (!clientSecret || !stripePromise) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load payment form</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#00A884',
            },
          },
        }}
      >
        <CheckoutForm onSuccess={onSuccess} onError={onError} onCancel={onCancel} />
      </Elements>
    </div>
  );
}