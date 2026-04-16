const { chromium } = require('playwright');

const BASE_URL = 'https://admin.vetsphere.cn';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Take screenshot of login page
    await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });
    console.log('Screenshot saved to /tmp/login-page.png');
    
    // List all input elements
    const inputs = await page.locator('input').all();
    console.log('Found', inputs.length, 'input elements:');
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      console.log(`  - type: ${type}, name: ${name}, placeholder: ${placeholder}, id: ${id}`);
    }
    
    // List all buttons
    const buttons = await page.locator('button').all();
    console.log('Found', buttons.length, 'button elements:');
    for (const btn of buttons) {
      const text = await btn.textContent();
      const type = await btn.getAttribute('type');
      console.log(`  - text: "${text?.trim()}", type: ${type}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/login-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();