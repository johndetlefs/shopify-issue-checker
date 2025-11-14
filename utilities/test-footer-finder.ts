/**
 * Test footer finder across 10 Shopify reference sites
 * Usage: npx tsx utilities/test-footer-finder.ts
 *
 * This validates the footer detection logic by:
 * 1. Loading each site
 * 2. Detecting the footer element
 * 3. Highlighting it with a red outline
 * 4. Displaying detection metadata
 */
import { chromium } from "@playwright/test";
import { findFooter } from "../src/core/find-footer.js";

const sites = [
  { name: "Harris Farm", url: "https://www.harrisfarm.com.au/" },
  { name: "Koala", url: "https://au.koala.com/" },
  { name: "Strand Bags", url: "https://www.strandbags.com.au/" },
  { name: "Universal Store", url: "https://www.universalstore.com/" },
  { name: "Camilla", url: "https://camilla.com" },
  { name: "Patagonia", url: "https://www.patagonia.com.au/" },
  { name: "Bassike", url: "https://www.bassike.com/" },
  { name: "Kookai", url: "https://www.kookai.com.au/" },
  { name: "Koh", url: "https://koh.com/" },
  { name: "Gym Direct", url: "https://gymdirect.com.au/" },
];

async function testFinder() {
  const browser = await chromium.launch({ headless: true });

  const results = {
    desktop: { success: 0, fail: 0 },
    mobile: { success: 0, fail: 0 },
  };

  for (const site of sites) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${site.name}`);
    console.log("=".repeat(60));

    // Test desktop viewport
    const desktopPage = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    await desktopPage.goto(site.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await desktopPage.waitForTimeout(2000);

    // Close any popups/modals
    try {
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
          break;
        }
      }
    } catch {
      // Ignore
    }

    // Scroll to bottom
    await desktopPage.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
    await desktopPage.waitForTimeout(2000);

    const footer = await findFooter(desktopPage);

    if (!footer) {
      console.log("❌ Desktop: No footer found!");
      results.desktop.fail++;
    } else {
      const classes = (await footer.getAttribute("class")) || "(none)";
      const tag = await footer.evaluate((el: HTMLElement) => el.tagName);
      const role = (await footer.getAttribute("role")) || "(none)";
      const text = await footer.textContent();
      const preview = text?.substring(0, 100).replace(/\s+/g, " ") || "";

      console.log("✅ Desktop: Found footer");
      console.log(`   Tag: <${tag.toLowerCase()}>`);
      console.log(`   Role: ${role}`);
      console.log(`   Classes: ${classes}`);
      console.log(`   Preview: ${preview}...`);

      results.desktop.success++;
    }

    await desktopPage.close();

    // Test mobile viewport
    const mobilePage = await browser.newPage({
      viewport: { width: 375, height: 667 },
    });

    await mobilePage.goto(site.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(2000);

    // Close any popups/modals
    try {
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
          break;
        }
      }
    } catch {
      // Ignore
    }

    // Scroll to bottom
    await mobilePage.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
    await mobilePage.waitForTimeout(2000);

    const mobileFooter = await findFooter(mobilePage);

    if (!mobileFooter) {
      console.log("❌ Mobile: No footer found!");
      results.mobile.fail++;
    } else {
      const classes = (await mobileFooter.getAttribute("class")) || "(none)";
      const tag = await mobileFooter.evaluate((el: HTMLElement) => el.tagName);
      const role = (await mobileFooter.getAttribute("role")) || "(none)";

      console.log("✅ Mobile: Found footer");
      console.log(`   Tag: <${tag.toLowerCase()}>`);
      console.log(`   Role: ${role}`);
      console.log(`   Classes: ${classes}`);

      results.mobile.success++;
    }

    await mobilePage.close();
  }

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log("TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`Desktop: ${results.desktop.success}/10 sites detected`);
  console.log(`Mobile:  ${results.mobile.success}/10 sites detected`);
  console.log(
    `Overall: ${
      results.desktop.success + results.mobile.success
    }/20 tests passed`
  );
  const percentage = Math.round(
    ((results.desktop.success + results.mobile.success) / 20) * 100
  );
  console.log(`Success Rate: ${percentage}%`);
  console.log("=".repeat(60));
}

testFinder().catch(console.error);
