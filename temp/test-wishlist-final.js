const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('wishlist') || text.includes('Wishlist') || text.includes('AccessToken') || text.includes('error') || text.includes('Added') || text.includes('Failed')) {
      console.log('BROWSER:', msg.type(), text);
    }
  });

  // Track API responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/wishlist')) {
      console.log('\n=== WISHLIST API ===');
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Body:', JSON.stringify(body, null, 2));
      } catch (e) {}
      console.log('===================\n');
    }
  });

  try {
    // Step 1: Go to shop page
    console.log('\n=== Step 1: Go to Shop Page ===');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.group.relative', { timeout: 10000 });
    console.log('Shop page loaded');
    
    // Check localStorage for session
    const storage = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const result = {};
      keys.forEach(k => {
        const val = localStorage.getItem(k);
        result[k] = val ? val.substring(0, 100) + '...' : null;
      });
      return result;
    });
    console.log('LocalStorage keys:', Object.keys(storage));

    // Step 2: Click wishlist button (should work if logged in)
    console.log('\n=== Step 2: Click Wishlist Button ===');
    const wishlistButtons = await page.locator('button.absolute.top-2.left-2').all();
    console.log(`Found ${wishlistButtons.length} wishlist buttons`);
    
    if (wishlistButtons.length > 0) {
      // Click the first wishlist button
      console.log('Clicking first wishlist button...');
      await wishlistButtons[0].click();
      await page.waitForTimeout(3000);
      
      const urlAfterClick = page.url();
      console.log('URL after click:', urlAfterClick);
      
      if (urlAfterClick.includes('/auth')) {
        console.log('Redirected to auth - user not logged in');
      } else {
        console.log('Stayed on shop page - checking button state...');
        await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/wishlist-result.png' });
      }
    }

    // Step 3: Check user center wishlist
    console.log('\n=== Step 3: Check User Center Wishlist ===');
    await page.goto(`${TARGET_URL}/en/user?tab=wishlist`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/user-wishlist-result.png' });

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/error.png' });
  } finally {
    await browser.close();
  }
})();