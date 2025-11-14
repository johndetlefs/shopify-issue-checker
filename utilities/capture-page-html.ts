/**
 * Capture full page HTML for pattern analysis
 * Captures the ENTIRE page (header, nav, main, footer) at both desktop and mobile viewports
 * so the HTML can be reused for analyzing any UI component.
 *
 * Features:
 * - Desktop (1920×1080) and mobile (375×667) viewports
 * - Auto-closes popups/modals (Klaviyo, etc.)
 * - Scrolls to bottom to ensure all content is loaded
 *
 * Usage: npx tsx utilities/capture-page-html.ts {site-key}
 *
 * Run for all sites:
 * for site in harris koala strand universal camilla patagonia bassike kookai koh gymdirect; do
 *   npx tsx utilities/capture-page-html.ts $site
 *   sleep 2
 * done
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";

const sites: Record<string, string> = {
  harris: "https://www.harrisfarm.com.au/",
  koala: "https://au.koala.com/",
  strand: "https://www.strandbags.com.au/",
  universal: "https://www.universalstore.com/",
  camilla: "https://camilla.com",
  patagonia: "https://www.patagonia.com.au/",
  bassike: "https://www.bassike.com/",
  kookai: "https://www.kookai.com.au/",
  koh: "https://koh.com/",
  gymdirect: "https://gymdirect.com.au/",
};

async function captureHTML(url: string, name: string) {
  const browser = await chromium.launch({ headless: false });

  console.log(`\n📸 Capturing: ${name}`);
  console.log(`🔗 URL: ${url}\n`);

  // Desktop viewport
  const desktopPage = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  await desktopPage.goto(url, { waitUntil: "domcontentloaded" });
  await desktopPage.waitForTimeout(3000);

  // Close any popups/modals (especially for sites like Camilla)
  try {
    // Common close button selectors
    const closeButtons = [
      'button[aria-label*="close" i]',
      'button[aria-label*="dismiss" i]',
      '[class*="close" i]:visible',
      '[class*="modal" i] button:visible',
      ".klaviyo-close-form",
      '[data-testid*="close" i]',
    ];

    for (const selector of closeButtons) {
      const button = desktopPage.locator(selector).first();
      if ((await button.count()) > 0 && (await button.isVisible())) {
        await button.click({ timeout: 1000 });
        await desktopPage.waitForTimeout(500);
        console.log("🚫 Closed popup");
        break;
      }
    }
  } catch {
    // Ignore errors, popup may not exist
  }

  // Scroll to bottom to ensure footer is loaded
  console.log("📜 Desktop: Scrolling to footer...");
  await desktopPage.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight)
  );
  await desktopPage.waitForTimeout(2000);

  const desktopHTML = await desktopPage.content();
  mkdirSync(`./pattern-analysis/${name}`, { recursive: true });
  writeFileSync(`./pattern-analysis/${name}/desktop.html`, desktopHTML);
  console.log(
    `✅ Desktop HTML saved (${(desktopHTML.length / 1024).toFixed(0)} KB)`
  );

  await desktopPage.close();

  // Mobile viewport
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 667 },
  });

  await mobilePage.goto(url, { waitUntil: "domcontentloaded" });
  await mobilePage.waitForTimeout(3000);

  // Close any popups/modals (especially for sites like Camilla)
  try {
    // Common close button selectors
    const closeButtons = [
      'button[aria-label*="close" i]',
      'button[aria-label*="dismiss" i]',
      '[class*="close" i]:visible',
      '[class*="modal" i] button:visible',
      ".klaviyo-close-form",
      '[data-testid*="close" i]',
    ];

    for (const selector of closeButtons) {
      const button = mobilePage.locator(selector).first();
      if ((await button.count()) > 0 && (await button.isVisible())) {
        await button.click({ timeout: 1000 });
        await mobilePage.waitForTimeout(500);
        console.log("🚫 Closed popup");
        break;
      }
    }
  } catch {
    // Ignore errors, popup may not exist
  }

  // Scroll to bottom
  console.log("📜 Mobile: Scrolling to footer...");
  await mobilePage.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight)
  );
  await mobilePage.waitForTimeout(2000);

  const mobileHTML = await mobilePage.content();
  writeFileSync(`./pattern-analysis/${name}/mobile.html`, mobileHTML);
  console.log(
    `✅ Mobile HTML saved (${(mobileHTML.length / 1024).toFixed(0)} KB)`
  );

  await mobilePage.close();
  await browser.close();

  console.log(`\n✅ ${name}: Complete\n`);
}

// Run for one site at a time
const site = process.argv[2];
if (!site || !sites[site]) {
  console.log("Usage: npx tsx utilities/capture-page-html.ts <site>");
  console.log("\nAvailable sites:");
  Object.keys(sites).forEach((key) => {
    console.log(`  - ${key.padEnd(15)} ${sites[key]}`);
  });
  process.exit(1);
}

captureHTML(sites[site], site).catch(console.error);
