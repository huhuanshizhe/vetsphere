const { chromium } = require('playwright');

const BASE_URL = 'https://admin.vetsphere.cn';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  try {
    console.log('Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Step 2: Filling login credentials...');
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="邮箱"], input[placeholder*="email"]', 'admin@vetsphere.pro');
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="密码"], input[placeholder*="password"]', 'admin123');
    
    console.log('Step 3: Clicking login button...');
    await page.click('button[type="submit"], button:has-text("登录"), button:has-text("Login")');
    
    // Wait for redirect after login
    console.log('Step 4: Waiting for redirect...');
    await page.waitForURL('**/products**', { timeout: 15000 }).catch(() => {
      console.log('Redirect might not be to products, checking current URL...');
    });
    
    // Take screenshot after login
    await page.screenshot({ path: '/tmp/after-login.png', fullPage: true });
    console.log('Current URL after login:', page.url());
    
    // Navigate to products page if not already there
    console.log('Step 5: Navigating to products page...');
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Step 6: Checking page content...');
    // Check if page is stuck loading (spinning)
    const loadingSpinner = await page.locator('.animate-spin, [class*="loading"], [class*="spinner"]').count();
    console.log('Loading spinners found:', loadingSpinner);
    
    // Wait a bit to see if data loads
    await page.waitForTimeout(3000);
    
    // Check for products data
    const productRows = await page.locator('table tbody tr, [class*="product"]').count();
    console.log('Product elements found:', productRows);
    
    // Check for error messages
    const errorMessages = await page.locator('[class*="error"], [class*="failed"]').count();
    console.log('Error elements found:', errorMessages);
    
    // Take screenshot of products page
    await page.screenshot({ path: '/tmp/products-page.png', fullPage: true });
    console.log('Screenshot saved to /tmp/products-page.png');
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if there's actual content (not just loading state)
    const pageContent = await page.content();
    const hasDataTable = pageContent.includes('DataTable') || pageContent.includes('table') || pageContent.includes('产品');
    console.log('Has data table content:', hasDataTable);
    
    if (loadingSpinner > 0 && productRows === 0) {
      console.log('❌ Page appears to be stuck loading - spinners visible but no products');
    } else if (productRows > 0) {
      console.log('✅ Page loaded successfully - products visible');
    } else {
      console.log('⚠️ Page loaded but no products found (might be empty database)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();