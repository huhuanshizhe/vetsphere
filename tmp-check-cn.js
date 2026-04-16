const page = await browser.getPage("cn-detail");
await page.goto("http://localhost:3000/zh/shop/cg-1", { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(5000);
const path = await saveScreenshot(await page.screenshot(), "cn-detail-v2.png");
console.log("URL: " + page.url());
console.log(path);
