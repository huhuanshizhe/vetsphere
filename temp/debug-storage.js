const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Track console
  page.on('console', msg => console.log('LOG:', msg.text()));

  try {
    // Go to the page and check ALL localStorage keys
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });

    const allStorage = await page.evaluate(() => {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        result[key] = localStorage.getItem(key);
      }
      return result;
    });

    console.log('\n=== ALL LOCAL STORAGE ===');
    console.log(JSON.stringify(allStorage, null, 2));

    // Check for Supabase session keys
    const supabaseKeys = Object.keys(allStorage).filter(k =>
      k.includes('supabase') || k.includes('sb-') || k.includes('auth')
    );
    console.log('\n=== SUPABASE RELATED KEYS ===');
    console.log(supabaseKeys);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();