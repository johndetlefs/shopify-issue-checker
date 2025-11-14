/**
 * Test mobile navigation finder and interaction across 10 Shopify reference sites
 * Usage:
 *   npx tsx utilities/test-mobile-nav-finder.ts              # Test all sites
 *   npx tsx utilities/test-mobile-nav-finder.ts Camilla      # Test specific site
 *   npx tsx utilities/test-mobile-nav-finder.ts --list       # List available sites
 *
 * This validates:
 * 1. Mobile nav detection (trigger + drawer)
 * 2. Pattern identification
 * 3. Open functionality
 * 4. Close functionality
 * 5. State management
 */
import { chromium } from "playwright";
import {
  findMobileNav,
  openMobileNav,
  closeMobileNav,
  isMobileNavOpen,
} from "../src/core/find-mobile-nav.js";

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
  { name: "John Detlefs", url: "https://johndetlefs.com" },
];

// Parse command-line arguments
const args = process.argv.slice(2);

if (args.includes("--list") || args.includes("-l")) {
  console.log("\nAvailable sites:");
  sites.forEach((site) => console.log(`  - ${site.name}`));
  console.log("\nUsage:");
  console.log(
    "  npx tsx utilities/test-mobile-nav-finder.ts                          # Test all sites"
  );
  console.log(
    "  npx tsx utilities/test-mobile-nav-finder.ts camilla                  # Test one site"
  );
  console.log(
    "  npx tsx utilities/test-mobile-nav-finder.ts harris koala patagonia   # Test multiple sites"
  );
  console.log(
    "  npx tsx utilities/test-mobile-nav-finder.ts --list                   # Show this list\n"
  );
  process.exit(0);
}

// Filter sites if targets were specified
let sitesToTest = sites;
if (args.length > 0) {
  const matchedSites = new Set<(typeof sites)[0]>();

  for (const arg of args) {
    const targetSite = arg.toLowerCase();
    const matches = sites.filter(
      (site) =>
        site.name.toLowerCase().includes(targetSite) ||
        site.name.toLowerCase().replace(/\s+/g, "") === targetSite
    );

    if (matches.length === 0) {
      console.error(`\n❌ No site found matching "${arg}"`);
      console.log("\nAvailable sites:");
      sites.forEach((site) => console.log(`  - ${site.name}`));
      console.log(
        '\nTip: Use partial names (e.g., "harris", "cam", "koala")\n'
      );
      process.exit(1);
    }

    matches.forEach((site) => matchedSites.add(site));
  }

  sitesToTest = Array.from(matchedSites);

  console.log(`\n🎯 Testing ${sitesToTest.length} site(s):`);
  sitesToTest.forEach((site) => console.log(`  - ${site.name}`));
  console.log("");
}

async function testMobileNavFinder() {
  const results = {
    detected: 0,
    failed: 0,
    openSuccess: 0,
    openFailed: 0,
    closeSuccess: 0,
    closeFailed: 0,
  };

  for (const site of sitesToTest) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Testing: ${site.name}`);
    console.log("=".repeat(70));

    // Create a new browser for EACH site to isolate failures
    let browser;
    let page;

    try {
      browser = await chromium.launch({ headless: false }); // Visible for debugging

      // Use mobile viewport
      page = await browser.newPage({
        viewport: { width: 375, height: 667 }, // iPhone SE size
        isMobile: true,
      });
      await page.goto(site.url, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForTimeout(2000);

      // Close any popups/modals (more aggressive for sites like Camilla)
      console.log("Checking for popups...");
      try {
        // First: handle location/region redirect popups (Camilla, etc.)
        const regionSelectors = [
          'button:has-text("Continue")',
          'button:has-text("Stay")',
          'a:has-text("Continue")',
          '[class*="geolocation"] button',
          '[class*="country"] button',
          '[class*="region"] button',
        ];

        let regionClosed = false;
        for (const selector of regionSelectors) {
          try {
            const button = page.locator(selector).first();
            if ((await button.count()) > 0 && (await button.isVisible())) {
              console.log(`  Found region popup, clicking: ${selector}`);
              await button.click({ timeout: 2000, force: true }); // Force click through overlays

              // Wait for the popup/overlay to actually disappear
              await page.waitForTimeout(1000);

              // Check for country-detector or similar overlays that might still be blocking
              const overlaySelectors = [
                "country-detector", // Camilla's custom web component
                "#shopify-section-country-selector-1", // Camilla's wrapper
                '[id*="country-selector"]',
                '[class*="geolocation"]',
                'div[role="none"][class*="shopify-section"]', // Camilla uses this as wrapper
              ];

              for (const overlaySelector of overlaySelectors) {
                const overlay = page.locator(overlaySelector).first();
                if ((await overlay.count()) > 0) {
                  console.log(
                    `  Waiting for overlay to disappear: ${overlaySelector}`
                  );
                  try {
                    await overlay.waitFor({ state: "hidden", timeout: 3000 });
                    console.log(`    ✓ Overlay hidden`);
                  } catch {
                    // Overlay didn't disappear, try to remove it with force
                    console.log(
                      `    ⚠️  Overlay still present, forcing removal`
                    );
                    await overlay.evaluate((el) => el.remove()).catch(() => {});
                    await page.waitForTimeout(500);
                  }
                }
              }

              regionClosed = true;
              break;
            }
          } catch {
            // Try next
          }
        }

        // If we closed a region popup, wait for any secondary modals to appear
        if (regionClosed) {
          console.log("  Waiting for secondary modals after region popup...");
          await page.waitForTimeout(2000);
        }

        // Then: try to close modals/overlays (higher priority)
        const modalCloseSelectors = [
          '[role="dialog"] button[aria-label*="close" i]',
          '[role="dialog"] .close',
          '[aria-modal="true"] button',
          '.modal button[aria-label*="close" i]',
          ".bxc button", // Camilla's popup system
          '[id*="bx-campaign"] button',
        ];

        let modalClosed = false;
        for (const selector of modalCloseSelectors) {
          const button = page.locator(selector).first();
          if ((await button.count()) > 0 && (await button.isVisible())) {
            console.log(`  Found modal close with selector: ${selector}`);
            try {
              await button.click({ timeout: 2000, force: true }); // Force click through overlays
              await page.waitForTimeout(500);
              modalClosed = true;
              break;
            } catch {
              // Try next selector
            }
          }
        }

        // Then try general close buttons
        if (!modalClosed) {
          const closeButtons = [
            'button[aria-label*="close" i]',
            'button[aria-label*="dismiss" i]',
            ".klaviyo-close-form",
            "button.close",
          ];

          for (const selector of closeButtons) {
            const button = page.locator(selector).first();
            if ((await button.count()) > 0 && (await button.isVisible())) {
              console.log(`  Found close button with selector: ${selector}`);
              try {
                await button.click({ timeout: 1000 });
                await page.waitForTimeout(500);
                break;
              } catch {
                // Try next selector
              }
            }
          }
        }

        if (!modalClosed) {
          console.log("  No actionable popups found");
        }
      } catch (error) {
        console.log(`  Popup close error (continuing): ${String(error)}`);
      }

      // Final check: Remove any lingering overlays that might block interactions
      console.log("\nChecking for blocking overlays...");
      const blockingOverlays = [
        "country-detector",
        "#shopify-section-country-selector-1",
        '[id*="country-selector"]',
      ];

      for (const selector of blockingOverlays) {
        const overlay = page.locator(selector).first();
        if ((await overlay.count()) > 0) {
          console.log(`  Found blocking overlay: ${selector}, removing it...`);
          try {
            await overlay.evaluate((el) => el.remove());
            console.log(`    ✓ Removed`);
          } catch (err) {
            console.log(
              `    ⚠️  Could not remove: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }
      }

      // Wait a moment for DOM to settle after removal
      await page.waitForTimeout(500);

      // Test detection
      console.log("\n📱 Testing mobile nav detection...");
      const result = await findMobileNav(page);

      if (!result) {
        console.log("❌ DETECTION FAILED: No mobile navigation found");
        console.log("\n🔍 DEBUG: Looking for common mobile nav patterns...");

        // Debug: Check what elements exist
        const debugSelectors = [
          'details[id*="menu"]',
          'details[class*="menu"]',
          'summary[aria-label*="menu" i]',
          '[data-targets*="nav"]',
          '[data-targets*="drawer"]',
          ".mobile-toggle",
          ".hamburger",
        ];

        for (const selector of debugSelectors) {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`  Found ${count}x: ${selector}`);
          }
        }

        results.failed++;
        await page.waitForTimeout(2000);
        await page.close();
        continue;
      }

      console.log("✅ DETECTION SUCCESS");
      results.detected++;

      // Display detection metadata
      const triggerTag = await result.trigger.evaluate((el) =>
        el.tagName.toLowerCase()
      );
      const triggerClasses =
        (await result.trigger.getAttribute("class")) || "(none)";
      const triggerAriaLabel =
        (await result.trigger.getAttribute("aria-label")) || "(none)";

      const drawerTag = await result.drawer.evaluate((el) =>
        el.tagName.toLowerCase()
      );
      const drawerClasses =
        (await result.drawer.getAttribute("class")) || "(none)";
      const drawerId = (await result.drawer.getAttribute("id")) || "(none)";

      console.log(`\n   Pattern: ${result.pattern}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Reason: ${result.reason.join(", ")}`);
      console.log(`\n   Trigger:`);
      console.log(`     Tag: <${triggerTag}>`);
      console.log(`     Classes: ${triggerClasses}`);
      console.log(`     ARIA Label: ${triggerAriaLabel}`);
      console.log(`\n   Drawer:`);
      console.log(`     Tag: <${drawerTag}>`);
      console.log(`     ID: ${drawerId}`);
      console.log(`     Classes: ${drawerClasses}`);

      // Highlight trigger and drawer
      await result.trigger.evaluate((el: HTMLElement) => {
        el.style.outline = "3px solid blue";
        el.style.outlineOffset = "2px";
      });

      await result.drawer.evaluate((el: HTMLElement) => {
        el.style.outline = "3px solid green";
        el.style.outlineOffset = "2px";
      });

      // Test initial state
      const initialState = await isMobileNavOpen(result);
      console.log(`\n   Initial state: ${initialState ? "OPEN" : "CLOSED"}`);

      // If already open, close it first
      if (initialState) {
        console.log("   (Closing initially-open menu...)");
        await closeMobileNav(result);
        await page.waitForTimeout(500);
      }

      // Test OPEN functionality
      console.log("\n🔓 Testing OPEN...");
      try {
        await openMobileNav(result);
        const isOpen = await isMobileNavOpen(result);

        if (isOpen) {
          console.log("✅ OPEN SUCCESS - Menu is visible");
          results.openSuccess++;

          // Check if drawer contains links
          const links = await result.drawer.locator("a").all();
          console.log(`   Found ${links.length} links in drawer`);

          // Show first few links
          if (links.length > 0) {
            console.log("   First 3 links:");
            for (let i = 0; i < Math.min(3, links.length); i++) {
              const text = ((await links[i].textContent()) || "")
                .trim()
                .substring(0, 30);
              console.log(`     ${i + 1}. "${text}"`);
            }
          }

          // Highlight drawer when open
          await result.drawer.evaluate((el: HTMLElement) => {
            el.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
          });

          await page.waitForTimeout(2000); // Let user see it open
        } else {
          console.log(
            "❌ OPEN FAILED - Menu not visible after openMobileNav()"
          );
          results.openFailed++;
        }
      } catch (error) {
        console.log(`❌ OPEN FAILED - Error: ${error}`);
        results.openFailed++;
      }

      // Test CLOSE functionality
      console.log("\n🔒 Testing CLOSE...");
      try {
        // First, verify if we can find a close button
        const { findCloseButton } = await import(
          "../src/core/find-mobile-nav.js"
        );
        const closeButton = await findCloseButton(
          result.drawer,
          result.trigger
        );

        if (closeButton) {
          const ariaLabel = await closeButton.getAttribute("aria-label");
          const classes = await closeButton.getAttribute("class");
          const dataClose = await closeButton.getAttribute(
            "data-hamburger-menu-close"
          );
          console.log(`   Found close button:`);
          console.log(`     aria-label: ${ariaLabel || "none"}`);
          console.log(`     class: ${classes || "none"}`);
          if (dataClose !== null)
            console.log(`     data-hamburger-menu-close: true`);
        } else if (result.pattern !== "details") {
          console.log(`   ⚠️  No close button found - will toggle trigger`);
        }

        const closeSuccess = await closeMobileNav(result);
        const isClosed = !(await isMobileNavOpen(result));

        if (closeSuccess && isClosed) {
          console.log("✅ CLOSE SUCCESS - Menu is hidden");
          results.closeSuccess++;
        } else if (closeSuccess && !isClosed) {
          console.log("⚠️  CLOSE CALLED but menu still visible");
          results.closeFailed++;
        } else {
          console.log("❌ CLOSE FAILED - closeMobileNav() returned false");
          results.closeFailed++;
        }
      } catch (error) {
        console.log(`❌ CLOSE FAILED - Error: ${error}`);
        results.closeFailed++;
      }

      await page.waitForTimeout(2000);
    } catch (error) {
      console.log(`\n❌ ERROR: ${error}`);
      results.failed++;
    } finally {
      // Close page and browser for this site
      if (page) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`\nDetection:`);
  console.log(`  ✅ Success: ${results.detected}/${sitesToTest.length} sites`);
  console.log(`  ❌ Failed:  ${results.failed}/${sitesToTest.length} sites`);

  console.log(`\nOpen Functionality:`);
  console.log(
    `  ✅ Success: ${results.openSuccess}/${results.detected} detected sites`
  );
  console.log(
    `  ❌ Failed:  ${results.openFailed}/${results.detected} detected sites`
  );

  console.log(`\nClose Functionality:`);
  console.log(
    `  ✅ Success: ${results.closeSuccess}/${results.detected} detected sites`
  );
  console.log(
    `  ❌ Failed:  ${results.closeFailed}/${results.detected} detected sites`
  );

  const detectionRate = ((results.detected / sitesToTest.length) * 100).toFixed(
    0
  );
  const openRate =
    results.detected > 0
      ? ((results.openSuccess / results.detected) * 100).toFixed(0)
      : "N/A";
  const closeRate =
    results.detected > 0
      ? ((results.closeSuccess / results.detected) * 100).toFixed(0)
      : "N/A";

  console.log(`\n📊 Success Rates:`);
  console.log(`  Detection:  ${detectionRate}%`);
  console.log(`  Open:       ${openRate}%`);
  console.log(`  Close:      ${closeRate}%`);

  const overallSuccess =
    results.detected > 0
      ? Math.min(results.detected, results.openSuccess, results.closeSuccess)
      : 0;
  const overallRate = ((overallSuccess / sites.length) * 100).toFixed(0);

  console.log(`\n🎯 Overall (detect + open + close): ${overallRate}%`);

  if (parseInt(overallRate) >= 80) {
    console.log(`\n🎉 SUCCESS: Met 80%+ target!`);
  } else {
    console.log(
      `\n⚠️  Below target: Need ${80 - parseInt(overallRate)}% improvement`
    );
  }
}

testMobileNavFinder().catch(console.error);
