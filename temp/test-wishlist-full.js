const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Wishlist') || text.includes('wishlist') || text.includes('error') || text.includes('Added') || text.includes('Failed')) {
      console.log('BROWSER:', msg.type(), text);
    }
  });

  // Track API responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/wishlist') || url.includes('/api/auth')) {
      console.log('\n=== API RESPONSE ===');
      console.log('URL:', url);
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Body:', JSON.stringify(body, null, 2));
      } catch (e) {}
      console.log('===================\n');
    }
  });

  try {
    // Step 1: Go to auth page
    console.log('\n=== Step 1: Go to Auth Page ===');
    await page.goto(`${TARGET_URL}/en/auth`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/01-auth-page.png' });

    // Step 2: Click on "Sign In" tab if needed
    const signInTab = await page.locator('button, [role="tab"]').filter({ hasText: 'Sign In' }).first();
    if (await signInTab.count() > 0) {
      console.log('Clicking Sign In tab...');
      await signInTab.click();
      await page.waitForTimeout(500);
    }

    // Step 3: Fill login form with correct selectors
    console.log('\n=== Step 2: Fill Login Form ===');
    
    // Find the email input - try multiple selectors
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    
    console.log('Email input found:', await emailInput.count() > 0);
    console.log('Password input found:', await passwordInput.count() > 0);
    
    await emailInput.fill('test@test.com');
    await passwordInput.fill('Test123456');
    
    // Step 4: Click submit
    console.log('\n=== Step 3: Click Submit ===');
    const submitBtn = await page.locator('button[type="submit"]').first();
    await submitBtn.click();
    
    // Wait for login to process
    await page.waitForTimeout(5000);
    console.log('URL after login:', page.url());
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/02-after-login.png' });

    // Step 5: Check if we're logged in by checking the page
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      console.log('\nStill on auth page - login might have failed');
      
      // Check for any error messages
      const pageContent = await page.content();
      if (pageContent.includes('Invalid') || pageContent.includes('error')) {
        console.log('Error found on page');
      }
    } else {
      console.log('\nLogin successful - redirected away from auth page');
    }

    // Step 6: Go to shop and test wishlist
    console.log('\n=== Step 4: Test Wishlist on Shop Page ===');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.group.relative', { timeout: 10000 });
    
    const wishlistButtons = await page.locator('button.absolute.top-2.left-2').all();
    console.log(`Found ${wishlistButtons.length} wishlist buttons`);
    
    if (wishlistButtons.length > 0) {
      console.log('Clicking first wishlist button...');
      await wishlistButtons[0].click();
      await page.waitForTimeout(3000);
      
      console.log('URL after wishlist click:', page.url());
      await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/03-after-wishlist-click.png' });
      
      // Check button state after click
      const btnClass = await wishlistButtons[0].getAttribute('class').catch(() => '');
      console.log('Button class:', btnClass?.substring(0, 100));
    }

    // Step 7: Check user center wishlist
    console.log('\n=== Step 5: Check User Center Wishlist ===');
    await page.goto(`${TARGET_URL}/en/user?tab=wishlist`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/04-user-wishlist.png' });

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/error.png' });
  } finally {
    await browser.close();
  }
})();