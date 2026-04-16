const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';
const TEST_EMAIL = 'namexiaohu@sina.com';
const TEST_PASSWORD = '12345678';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    console.log('\n=== Login ===');
    await page.goto(`${TARGET_URL}/en/auth`, { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    console.log('Logged in, URL:', page.url());

    // Go to user center wishlist tab
    console.log('\n=== User Center Wishlist ===');
    await page.goto(`${TARGET_URL}/en/user?tab=wishlist`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if wishlist items are displayed
    const wishlistItems = await page.locator('.bg-white.rounded-xl.border').all();
    console.log('Wishlist items found:', wishlistItems.length);

    // Take screenshot
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/wishlist-final.png', fullPage: true });
    console.log('Screenshot saved to wishlist-final.png');

    // Check for empty state message
    const emptyMessage = await page.locator('text=/No items|empty/i').count();
    console.log('Empty message found:', emptyMessage > 0);

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/连川科技/vetsphere/temp/error.png' });
  } finally {
    await browser.close();
  }
})();