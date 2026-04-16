const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('session') || text.includes('Session') || text.includes('token') || text.includes('wishlist') || text.includes('error')) {
      console.log('LOG:', msg.type(), text.substring(0, 200));
    }
  });

  // Track API
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/auth') || url.includes('/api/wishlist')) {
      console.log('\n--- API:', response.status(), url);
      try {
        const body = await response.json();
        console.log('Body:', JSON.stringify(body).substring(0, 300));
      } catch (e) {}
    }
  });

  try {
    // ===== Step 1: Login =====
    console.log('\n========== Step 1: Login ==========');
    await page.goto(`${TARGET_URL}/en/auth`, { waitUntil: 'networkidle' });

    // Make sure we're on the Sign In tab
    const signInTab = page.locator('button, [role="tab"]').filter({ hasText: /Sign In|登录/i }).first();
    if (await signInTab.count() > 0) {
      await signInTab.click();
      await page.waitForTimeout(500);
    }

    // Fill login form
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    // Use test account
    await emailInput.fill('namexiaohu@sina.com');
    await passwordInput.fill('12345678');
    console.log('Filled login form, submitting...');
    await submitBtn.click();

    // Wait for redirect
    await page.waitForTimeout(5000);
    console.log('URL after login:', page.url());

    // Check storage after login
    const storageAfterLogin = await page.evaluate(() => {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        result[key] = localStorage.getItem(key)?.substring(0, 100);
      }
      return result;
    });
    console.log('LocalStorage after login:', storageAfterLogin);
    console.log('LocalStorage keys:', Object.keys(storageAfterLogin));

    // Check cookies
    const cookies = await context.cookies();
    console.log('Cookies:', cookies.map(c => c.name));

    // ===== Step 2: Go to Shop and test wishlist =====
    console.log('\n========== Step 2: Test Wishlist ==========');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.group.relative', { timeout: 10000 });

    const wishlistButtons = await page.locator('button.absolute.top-2.left-2').all();
    console.log(`Found ${wishlistButtons.length} wishlist buttons`);

    if (wishlistButtons.length > 0) {
      console.log('Clicking first wishlist button...');
      await wishlistButtons[0].click();
      await page.waitForTimeout(3000);

      console.log('URL after click:', page.url());
      await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/wishlist-test-result.png' });
    }

    // ===== Step 3: Check User Center Wishlist =====
    console.log('\n========== Step 3: User Center Wishlist ==========');
    await page.goto(`${TARGET_URL}/en/user?tab=wishlist`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/user-wishlist-tab.png' });

    console.log('\n========== Test Complete ==========');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/test-error.png' });
  } finally {
    await browser.close();
  }
})();