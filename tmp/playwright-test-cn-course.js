const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3000/zh/courses/c-1775734593549';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to CN course page...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for loading skeleton to disappear
    console.log('Waiting for page to load...');
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 20000 });
    
    await page.waitForTimeout(2000);
    
    const pageText = await page.textContent('body');
    
    // Check for instructor-related content
    const hasInstructor = pageText.includes('讲师') || pageText.includes('老师') || pageText.includes('导师');
    console.log('--- Page Content Check ---');
    console.log('Has instructor text (讲师/老师/导师):', hasInstructor);
    
    // Check for course title
    const hasTitle = pageText.includes('神经') || pageText.includes('培训');
    console.log('Has course title keywords:', hasTitle);
    
    // Check all images
    const allImages = await page.locator('img').all();
    console.log('Total images on page:', allImages.length);
    for (const img of allImages) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      if (alt) console.log('  Image:', alt, '->', src?.substring(0, 80));
    }
    
    // Check if not found
    const isNotFound = pageText.includes('找不到') || pageText.includes('不存在') || pageText.includes('404');
    console.log('Is 404/Not Found:', isNotFound);
    
    // Page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/cn-course-full.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/cn-course-full.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/cn-course-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/cn-course-error.png');
  } finally {
    await browser.close();
  }
})();
