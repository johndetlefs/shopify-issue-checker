import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("https://modibodi.com/");

  const result = await page.evaluate(() => {
    // Get ALL header elements, not just links
    const headerElements = Array.from(document.querySelectorAll("header *"))
      .filter((el: any) => {
        const rect = el.getBoundingClientRect();
        const text = el.innerText?.trim() || "";
        return (
          rect.top < 200 &&
          rect.width > 30 &&
          rect.height > 10 &&
          text.length > 2 &&
          text.length < 30
        );
      })
      .slice(0, 15)
      .map((el: any) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: el.innerText?.trim().substring(0, 25),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          role: el.getAttribute("role"),
          type: el.getAttribute("type"),
          href: el.href?.substring(0, 50),
        };
      });
    return headerElements;
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
