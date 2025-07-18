const puppeteer = require('puppeteer');

async function testPage() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if any content is visible
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body text length:', bodyText.length);
    console.log('First 200 chars:', bodyText.substring(0, 200));
    
    // Check for specific elements
    const hasHeader = await page.$('header') !== null;
    const hasMain = await page.$('main') !== null;
    const hasContent = await page.$('[class*="container"]') !== null;
    
    console.log('Has header:', hasHeader);
    console.log('Has main:', hasMain);
    console.log('Has container:', hasContent);
    
    // Check CSS loading
    const backgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('Body background color:', backgroundColor);
    
    // Check for any errors
    const errors = await page.evaluate(() => {
      return window.__NEXT_DATA__ ? window.__NEXT_DATA__.err : null;
    });
    if (errors) {
      console.log('Next.js errors:', errors);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'page-screenshot.png' });
    console.log('Screenshot saved as page-screenshot.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testPage();