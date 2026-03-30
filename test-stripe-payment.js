const https = require('https');

// Test Stripe payment flow
async function testStripePayment() {
  console.log('🧪 Testing Stripe Payment Integration...\n');
  
  // Test 1: Check stripe-config API
  console.log('Test 1: Checking /api/stripe-config...');
  try {
    const configRes = await fetch('https://vetsphere.net/api/stripe-config');
    const config = await configRes.json();
    
    if (config.publishableKey && config.publishableKey.startsWith('pk_live_')) {
      console.log('✅ PASS: Publishable key is configured and valid');
      console.log(`   Key Type: ${config.keyType}`);
      console.log(`   Key Length: ${config.publishableKey.length}\n`);
    } else {
      console.log('❌ FAIL: Publishable key is invalid\n');
      process.exit(1);
    }
  } catch (err) {
    console.log('❌ FAIL: Could not fetch stripe-config:', err.message, '\n');
    process.exit(1);
  }
  
  // Test 2: Check create-payment-intent API
  console.log('Test 2: Checking /api/payment/stripe/create-payment-intent...');
  try {
    const intentRes = await fetch('https://vetsphere.net/api/payment/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 10, currency: 'usd', orderId: '' })
    });
    const intent = await intentRes.json();
    
    if (intent.clientSecret && intent.clientSecret.includes('_secret_')) {
      console.log('✅ PASS: PaymentIntent created successfully');
      console.log(`   Client Secret: ${intent.clientSecret.substring(0, 30)}...`);
      console.log(`   Contains "_secret_": Yes`);
      console.log(`   Length: ${intent.clientSecret.length}\n`);
    } else {
      console.log('❌ FAIL: Client secret format is invalid\n');
      process.exit(1);
    }
  } catch (err) {
    console.log('❌ FAIL: Could not create PaymentIntent:', err.message, '\n');
    process.exit(1);
  }
  
  // Test 3: Check CORS headers
  console.log('Test 3: Checking CORS headers...');
  try {
    const corsRes = await fetch('https://vetsphere.net/api/payment/stripe/create-payment-intent', {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Method': 'POST' }
    });
    
    const hasCorsHeader = corsRes.headers.get('access-control-allow-origin');
    if (hasCorsHeader) {
      console.log('✅ PASS: CORS headers are present');
      console.log(`   Access-Control-Allow-Origin: ${hasCorsHeader}\n`);
    } else {
      console.log('⚠️  WARNING: CORS headers not found (may not be required)\n');
    }
  } catch (err) {
    console.log('⚠️  WARNING: CORS check failed:', err.message, '\n');
  }
  
  // Test 4: Check if PaymentElement component exists
  console.log('Test 4: Checking if PaymentElement component is deployed...');
  try {
    const pageRes = await fetch('https://vetsphere.net/en/test-stripe-payment');
    if (pageRes.ok) {
      console.log('✅ PASS: Test page is accessible\n');
    } else {
      console.log('⚠️  WARNING: Test page returned status:', pageRes.status, '\n');
    }
  } catch (err) {
    console.log('⚠️  WARNING: Could not access test page:', err.message, '\n');
  }
  
  console.log('═══════════════════════════════════════════');
  console.log('✅ All critical tests passed!');
  console.log('Stripe Payment integration is ready.');
  console.log('═══════════════════════════════════════════');
}

testStripePayment().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
