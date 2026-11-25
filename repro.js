const { chromium, selectors } = require(process.argv[2]);

(async () => {
  await selectors.register('tag', () => ({
    query: (root, selector) => root.querySelector(selector),
    queryAll: (root, selector) => Array.from(root.querySelectorAll(selector)),
  }));

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  await page.setContent('<div>hello</div>');
  console.log(await page.locator('tag=div').textContent());
  await browser.close();
})();
