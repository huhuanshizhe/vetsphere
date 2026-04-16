const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

// Test credentials - replace with actual test account
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'Test123456';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console log tracking
  page.on('console', msg => {
    console.log('BROWSER:', msg.type(), msg.text());
  });

  // Track network requests
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log('API:', response.status(), response.url());
      try {
        const body = await response.json();
        console.log('  Body:', JSON.stringify(body).substring(0, 200));
      } catch (e) {}
    }
  });

  try {
    // Step 1: Go to shop page first (without login)
    console.log('\n=== Step 1: Test Wishlist Without Login ===');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.group.relative', { timeout: 10000 });
    
    const wishlistButtons = await page.locator('button.absolute.top-2.left-2').all();
    console.log(`Found ${wishlistButtons.length} wishlist buttons`);

    if (wishlistButtons.length > 0) {
      await wishlistButtons[0].click();
      await page.waitForTimeout(1000);
      console.log('URL after click (should redirect to auth):', page.url());
    }

    // Step 2: Try to login
    console.log('\n=== Step 2: Login Attempt ===');
    await page.goto(`${TARGET_URL}/en/auth`, { waitUntil: 'networkidle' });
    
    // Find email and password inputs using placeholder or type
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // Find and click submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    
    // Wait for login to complete
    await page.waitForTimeout(5000);
    console.log('URL after login:', page.url());

    // Check if login was successful by checking if we're no longer on auth page
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      console.log('Login may have failed - still on auth page');
      
      // Check for error messages
      const errorText = await page.locator('.text-red-500, .text-red-600, [class*="error"]').first().textContent().catch(() => null);
      if (errorText) {
        console.log('Error message found:', errorText);
      }
    } else {
      console.log('Login successful!');
    }

    // Step 3: If logged in, try wishlist again
    console.log('\n=== Step 3: Test Wishlist After Login ===');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.group.relative', { timeout: 10000 });
    
    const wishlistButtons2 = await page.locator('button.absolute.top-2.left-2').all();
    if (wishlistButtons2.length > 0) {
      console.log('Clicking wishlist button...');
      await wishlistButtons2[0].click();
      await page.waitForTimeout(3000);
      
      // Check button state
      const btnClass = await wishlistButtons2[0].getAttribute('class');
      console.log('Button class after click:', btnClass);
      
      // Take screenshot
      await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/wishlist-after-click.png' });
    }

    // Step 4: Check wishlist in user center
    console.log('\n=== Step 4: Check User Center Wishlist ===');
    await page.goto(`${TARGET_URL}/en/user?tab=wishlist`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/user-wishlist-tab.png' });

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/test-error.png' });
  } finally {
    await browser.close();
  }
})();