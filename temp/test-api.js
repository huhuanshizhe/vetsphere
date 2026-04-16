const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all console messages
  page.on('console', msg => {
    console.log('LOG:', msg.type(), msg.text());
  });

  // Track all network responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/wishlist')) {
      console.log('\n=== WISHLIST API RESPONSE ===');
      console.log('URL:', url);
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Body:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('Could not parse JSON body');
      }
      console.log('============================\n');
    }
  });

  try {
    // 1. First, manually check the API without login
    console.log('\n=== Direct API Test (No Auth) ===');
    const response = await page.request.get(`${TARGET_URL}/api/wishlist`);
    console.log('Status:', response.status());
    const body = await response.json();
    console.log('Body:', body);

    // 2. Now go to the page and check localStorage for token
    console.log('\n=== Check localStorage for token ===');
    await page.goto(`${TARGET_URL}/en/shop`, { waitUntil: 'networkidle' });
    
    const localStorage = await page.evaluate(() => {
      return {
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log('LocalStorage:', localStorage);

    // 3. If there's a token, test the API with it
    if (localStorage.accessToken) {
      console.log('\n=== Test API with stored token ===');
      const apiResponse = await page.request.get(`${TARGET_URL}/api/wishlist`, {
        headers: {
          'Authorization': `Bearer ${localStorage.accessToken}`
        }
      });
      console.log('Status:', apiResponse.status());
      const apiBody = await apiResponse.json();
      console.log('Body:', JSON.stringify(apiBody, null, 2));
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();