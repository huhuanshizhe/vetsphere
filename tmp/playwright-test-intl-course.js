const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001/en/courses/c-1775734593549';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to INTL course page...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for loading skeleton to disappear
    console.log('Waiting for page to load...');
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 20000 });
    
    // Wait a bit more for any final rendering
    await page.waitForTimeout(2000);
    
    // Check for instructor-related content
    const pageText = await page.textContent('body');
    
    // Check for instructor section
    const hasInstructor = pageText.includes('Instructor') || pageText.includes('instructor');
    const hasPaul = pageText.includes('Paul') || pageText.includes('Freeman');
    
    console.log('--- Page Content Check ---');
    console.log('Has "Instructor" text:', hasInstructor);
    console.log('Has "Paul" or "Freeman":', hasPaul);
    
    // Check for instructor image
    const instructorImages = await page.locator('img[alt*="Paul"], img[alt*="Freeman"], img[alt*="instructor"]').count();
    console.log('Instructor images found:', instructorImages);
    
    // Check all images on page
    const allImages = await page.locator('img').all();
    console.log('Total images on page:', allImages.length);
    for (const img of allImages) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      if (alt) console.log('  Image:', alt, '->', src?.substring(0, 80));
    }
    
    // Take full page screenshot
    await page.screenshot({ path: '/tmp/intl-course-full.png', fullPage: true });
    console.log('📸 Full page screenshot saved to /tmp/intl-course-full.png');
    
    // Take screenshot of just the instructor section if it exists
    const instructorSection = page.locator('text=Instructor').first();
    if (await instructorSection.isVisible().catch(() => false)) {
      const sectionParent = instructorSection.locator('..').locator('..');
      await sectionParent.screenshot({ path: '/tmp/intl-instructor-section.png' });
      console.log('📸 Instructor section screenshot saved');
    }
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if "not found" page is shown
    const isNotFound = pageText.includes('not found') || pageText.includes('Not Found') || pageText.includes('404');
    console.log('Is 404/Not Found:', isNotFound);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/intl-course-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/intl-course-error.png');
  } finally {
    await browser.close();
  }
})();
