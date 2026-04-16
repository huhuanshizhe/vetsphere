const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  try {
    // Go to shop page
    console.log('Navigating to shop page...');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded:', await page.title());

    // Wait for products to load
    await page.waitForSelector('.group.relative', { timeout: 10000 });
    console.log('Product cards found');

    // Find wishlist buttons (Heart icons in top-left corner)
    const wishlistButtons = await page.locator('button.absolute.top-2.left-2').all();
    console.log(`Found ${wishlistButtons.length} wishlist buttons`);

    if (wishlistButtons.length > 0) {
      // Take screenshot before clicking
      await page.screenshot({ path: '/tmp/shop-before-wishlist.png', fullPage: true });
      console.log('Screenshot saved: /tmp/shop-before-wishlist.png');

      // Click the first wishlist button
      console.log('Clicking first wishlist button...');
      await wishlistButtons[0].click();

      // Wait a bit to see the response
      await page.waitForTimeout(2000);

      // Take screenshot after clicking
      await page.screenshot({ path: '/tmp/shop-after-wishlist.png', fullPage: true });
      console.log('Screenshot saved: /tmp/shop-after-wishlist.png');

      // Check if redirected to auth page (not logged in)
      const currentUrl = page.url();
      console.log('Current URL after click:', currentUrl);

      if (currentUrl.includes('/auth')) {
        console.log('SUCCESS: Wishlist button correctly redirects to auth page when not logged in');
      } else if (currentUrl.includes('/shop')) {
        console.log('INFO: Still on shop page - user might be logged in or button state changed');

        // Check if button state changed (filled heart = added to wishlist)
        const buttonClass = await wishlistButtons[0].getAttribute('class');
        if (buttonClass?.includes('bg-red-500')) {
          console.log('SUCCESS: Button state changed to red (added to wishlist)');
        }
      }
    } else {
      console.log('WARNING: No wishlist buttons found on product cards');
    }

    // Test product detail page wishlist button
    console.log('\n--- Testing product detail page wishlist ---');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });

    // Click on a product to go to detail page
    const productLinks = await page.locator('a[href*="/shop/"]').all();
    if (productLinks.length > 2) {
      await productLinks[2].click();
      await page.waitForLoadState('networkidle');
      console.log('Navigated to product detail:', page.url());

      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/product-detail-wishlist.png', fullPage: true });
      console.log('Screenshot saved: /tmp/product-detail-wishlist.png');

      // Find wishlist button on product detail
      const detailWishlistBtn = await page.locator('button').filter({ hasText: 'Add to Wishlist' }).first();
      if (await detailWishlistBtn.count() > 0) {
        console.log('Found wishlist button on product detail page');
        await detailWishlistBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/product-detail-after-wishlist.png', fullPage: true });
        console.log('Screenshot saved: /tmp/product-detail-after-wishlist.png');
      } else {
        // Try finding by heart icon
        const heartBtn = await page.locator('button:has(svg.lucide-heart)').first();
        if (await heartBtn.count() > 0) {
          console.log('Found heart button on product detail page');
          await heartBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();