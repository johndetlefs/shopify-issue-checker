/**
 * Quick test for Harris Farm mobile nav detection only
 */

import { chromium, type Browser, type Page } from "playwright";
import {
  findMobileNav,
  openMobileNav,
  closeMobileNav,
  isMobileNavOpen,
} from "../src/core/find-mobile-nav.js";

const HARRIS_URL = "https://www.harrisfarm.com.au";

async function testHarris() {
  let browser: Browser | null = null;

  try {
    console.log(
      "\n======================================================================"
    );
    console.log("Testing: Harris Farm");
    console.log(
      "======================================================================\n"
    );

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15",
    });

    const page = await context.newPage();

    console.log(`Navigating to ${HARRIS_URL}...`);
    await page.goto(HARRIS_URL, { waitUntil: "networkidle", timeout: 30000 });
    console.log("Page loaded");

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    console.log("\nAttempting detection...");
    const result = await findMobileNav(page);

    if (!result) {
      console.log("❌ DETECTION FAILED - No mobile navigation found");
      return;
    }

    console.log(`✅ DETECTION SUCCESS`);
    console.log(`   Pattern: ${result.pattern}`);
    console.log(`   Score: ${result.score}`);
    console.log(
      `   Reason: ${
        Array.isArray(result.reason) ? result.reason.join(", ") : result.reason
      }`
    );

    // Test opening
    console.log("\nTesting OPEN...");
    try {
      await openMobileNav(result);
      await page.waitForTimeout(1000); // Let animation complete

      const isOpen = await isMobileNavOpen(result);
      if (isOpen) {
        const links = await result.drawer.locator("a[href]").count();
        console.log(
          `✅ OPEN SUCCESS - Menu is visible, Found ${links} links in drawer`
        );
      } else {
        console.log("❌ OPEN FAILED - Menu not visible after opening");
      }
    } catch (err) {
      console.log(
        `❌ OPEN ERROR: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Test closing
    console.log("\nTesting CLOSE...");
    try {
      await closeMobileNav(result);
      await page.waitForTimeout(500);

      const isStillOpen = await isMobileNavOpen(result);
      if (!isStillOpen) {
        console.log("✅ CLOSE SUCCESS - Menu is hidden");
      } else {
        console.log("❌ CLOSE FAILED - Menu still visible");
      }
    } catch (err) {
      console.log(
        `❌ CLOSE ERROR: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testHarris();
