'use client';

import { useEffect, useState } from 'react';

export default function TestStripePayment() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testPayment() {
      try {
        // Test stripe-config API
        const configRes = await fetch('/api/stripe-config');
        const configData = await configRes.json();
        console.log('Stripe Config:', configData);

        // Test create-payment-intent API
        const intentRes = await fetch('/api/payment/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 10,
            currency: 'usd',
            orderId: '',
          }),
        });
        const intentData = await intentRes.json();
        console.log('PaymentIntent:', intentData);

        setResult({
          config: configData,
          paymentIntent: intentData,
          clientSecretLength: intentData.clientSecret?.length || 0,
          clientSecretIncludesSecret: intentData.clientSecret?.includes('_secret_'),
          clientSecretParts: intentData.clientSecret?.split('_'),
        });
      } catch (err: any) {
        setError(err.message);
      }
    }

    testPayment();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Stripe Payment Test</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 font-bold">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Stripe Config</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result.config, null, 2)}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">PaymentIntent Result</h2>
              <div className="space-y-2 mb-4">
                <p><strong>clientSecret Length:</strong> {result.clientSecretLength}</p>
                <p><strong>Contains "_secret_":</strong> {result.clientSecretIncludesSecret ? '✅ YES' : '❌ NO'}</p>
                <p><strong>Parts:</strong> {result.clientSecretParts?.join(' | ')}</p>
              </div>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result.paymentIntent, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600">Testing...</p>
          </div>
        )}
      </div>
    </div>
  );
}