const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  // Enable console log tracking
  page.on('console', msg => {
    if (msg.text().includes('[Wishlist]') || msg.text().includes('wishlist')) {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });

  // Track network requests
  page.on('response', async response => {
    if (response.url().includes('/api/wishlist')) {
      console.log('API RESPONSE:', response.status(), response.url());
      try {
        const body = await response.json();
        console.log('API RESPONSE BODY:', JSON.stringify(body, null, 2));
      } catch (e) {}
    }
  });

  try {
    // Step 1: Go to auth page and login
    console.log('\n=== Step 1: Login ===');
    await page.goto(`${TARGET_URL}/en/auth`, { waitUntil: 'networkidle' });
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123456!');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    console.log('Current URL after login attempt:', page.url());

    // Step 2: Go to shop page
    console.log('\n=== Step 2: Go to Shop ===');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.group.relative', { timeout: 10000 });
    console.log('Shop page loaded');

    // Step 3: Click wishlist button
    console.log('\n=== Step 3: Click Wishlist Button ===');
    const wishlistButtons = await page.locator('button.absolute.top-2.left-2').all();
    console.log(`Found ${wishlistButtons.length} wishlist buttons`);

    if (wishlistButtons.length > 0) {
      await wishlistButtons[0].click();
      await page.waitForTimeout(3000);
      
      console.log('URL after wishlist click:', page.url());
      
      // Take screenshot
      await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/wishlist-test.png', fullPage: true });
    }

    // Step 4: Check user center wishlist
    console.log('\n=== Step 4: Check User Center Wishlist ===');
    await page.goto(`${TARGET_URL}/en/user?tab=wishlist`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/user-wishlist.png', fullPage: true });
    console.log('User center wishlist page screenshot saved');

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();