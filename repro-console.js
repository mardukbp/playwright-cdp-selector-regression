// A page that logged a DOM element before connectOverCDP() loses the selector
// engines registered before the connect, even with the fix from #44389.
//
// The page is opened through Chromium's own /json/new endpoint, so no
// Playwright is involved before the connect. Its script logs document.body,
// as many apps do when they start. With --log-string it logs a string instead,
// which shows that the DOM element in the console message is the trigger.
const { chromium, selectors } = require(process.argv[2]);

const CDP = 'http://localhost:9222';
const LOGGED = process.argv[3] === '--log-string' ? '"body"' : 'document.body';
const PAGE = `<div>hello</div><script>console.log("init", ${LOGGED})</script>`;
const PAGE_URL = 'data:text/html,' + encodeURIComponent(PAGE);

(async () => {
  // Open the page before Playwright connects and give it time to log.
  const target = await (await fetch(`${CDP}/json/new?${PAGE_URL}`, { method: 'PUT' })).json();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await selectors.register('tag', () => ({
    query: (root, selector) => root.querySelector(selector),
    queryAll: (root, selector) => Array.from(root.querySelectorAll(selector)),
  }));

  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0];
  // Chromium reports the URL decoded, so match the start only.
  const page = context.pages().find(p => p.url().startsWith('data:text/html,'));
  try {
    console.log(await page.locator('tag=div').textContent({ timeout: 5000 }));
  } catch (error) {
    console.log(error.message.split('\n')[0]);
    process.exitCode = 1;
  } finally {
    await fetch(`${CDP}/json/close/${target.id}`);
    await browser.close();
  }
})();
