const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go to the page
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });

    // Get all cookies
    const cookies = await context.cookies();
    console.log('\n=== ALL COOKIES ===');
    cookies.forEach(c => {
      console.log(`${c.name}: ${c.value.substring(0, 50)}...`);
    });

    // Check for Supabase related cookies
    const supabaseCookies = cookies.filter(c =>
      c.name.includes('sb') || c.name.includes('supabase') || c.name.includes('auth')
    );
    console.log('\n=== SUPABASE COOKIES ===');
    console.log(supabaseCookies.map(c => c.name));

    // Also check localStorage again
    const localStorage = await page.evaluate(() => {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        result[key] = localStorage.getItem(key)?.substring(0, 100);
      }
      return result;
    });
    console.log('\n=== LOCAL STORAGE ===');
    console.log(localStorage);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();