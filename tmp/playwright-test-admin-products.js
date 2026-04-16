const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3002';
const EMAIL = 'admin@vetsphere.pro';
const PASSWORD = 'admin123';

(async () => {
  console.log('🚀 Starting Admin Products Test...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  try {
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');

    // Wait for login form (uses type selectors, not name)
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Login successful!\n');

    // Step 2: Navigate to Products page
    console.log('📝 Step 2: Navigating to Products page...');
    await page.goto(`${TARGET_URL}/products`);
    await page.waitForLoadState('networkidle');

    // Wait for products to load
    await page.waitForSelector('table', { timeout: 10000 });
    console.log('✅ Products page loaded!\n');

    // Step 3: Check for products
    console.log('📝 Step 3: Checking products list...');
    const rows = await page.locator('table tbody tr').count();
    console.log(`   Found ${rows} products in the list\n`);

    // Step 4: Test search functionality
    console.log('📝 Step 4: Testing search functionality...');
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('ENALOS');
      await page.waitForTimeout(500); // Wait for debounce
      console.log('   ✅ Search input filled with "ENALOS"\n');
    } else {
      console.log('   ⚠️ Search input not found\n');
    }

    // Step 5: Test status filter buttons
    console.log('📝 Step 5: Testing status filter buttons...');
    const statusButtons = await page.locator('button').filter({ hasText: '待审核' }).count();
    if (statusButtons > 0) {
      await page.locator('button').filter({ hasText: '待审核' }).first().click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Clicked "待审核" filter button\n');
    } else {
      console.log('   ⚠️ Status filter buttons not found\n');
    }

    // Step 6: Test checkbox selection
    console.log('📝 Step 6: Testing checkbox selection...');
    await page.goto(`${TARGET_URL}/products`);
    await page.waitForLoadState('networkidle');

    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`   Found ${checkboxes} checkboxes`);

    if (checkboxes > 1) {
      // Click the first product checkbox (not the "select all" checkbox)
      const productCheckboxes = page.locator('table tbody input[type="checkbox"]');
      const firstCheckbox = productCheckboxes.first();
      if (await firstCheckbox.count() > 0) {
        await firstCheckbox.click();
        await page.waitForTimeout(500);
        console.log('   ✅ Selected first product\n');
      }
    }

    // Step 7: Check for bulk action bar
    console.log('📝 Step 7: Checking for bulk action bar...');
    const bulkBar = await page.locator('text=已选择').count();
    if (bulkBar > 0) {
      console.log('   ✅ Bulk action bar is visible\n');
    } else {
      console.log('   ⚠️ Bulk action bar not visible (might need more selections)\n');
    }

    // Step 8: Test delete button
    console.log('📝 Step 8: Testing delete button...');
    const deleteButtons = await page.locator('button:has-text("删除")').count();
    console.log(`   Found ${deleteButtons} delete buttons`);

    if (deleteButtons > 0) {
      await page.locator('button:has-text("删除")').first().click();
      await page.waitForTimeout(500);

      // Check for confirmation modal
      const confirmModal = await page.locator('text=确认删除').count();
      if (confirmModal > 0) {
        console.log('   ✅ Delete confirmation modal appeared!\n');

        // Cancel the delete
        await page.locator('button:has-text("取消")').click();
        console.log('   ✅ Cancelled delete operation\n');
      } else {
        console.log('   ⚠️ Confirmation modal not found\n');
      }
    }

    // Take final screenshot
    await page.screenshot({ path: '/tmp/admin-products-test.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/admin-products-test.png\n');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/admin-products-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/admin-products-error.png');
  } finally {
    await browser.close();
  }
})();