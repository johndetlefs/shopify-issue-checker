/**
 * Test the navigation finder on our analyzed sites
 */

import { chromium } from "@playwright/test";
import { findMainNavigation } from "./src/core/find-navigation";

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
];

async function testNavFinder() {
  const browser = await chromium.launch({ headless: false });

  for (const site of sites) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${site.name}`);
    console.log("=".repeat(60));

    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    try {
      await page.goto(site.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      const nav = await findMainNavigation(page);

      if (!nav) {
        console.log("❌ No navigation found!");
      } else {
        const classes = (await nav.getAttribute("class")) || "(none)";
        const ariaLabel = (await nav.getAttribute("aria-label")) || "(none)";
        const tagName = await nav.evaluate((el) => el.tagName);

        // Get bounding box to see where it is
        const box = await nav.boundingBox();
        const boxInfo = box
          ? `(x:${Math.round(box.x)}, y:${Math.round(box.y)}, w:${Math.round(
              box.width
            )}, h:${Math.round(box.height)})`
          : "(no box)";

        const links = await nav.locator("a:visible").all();
        const linkCount = links.length;

        console.log("✅ Found navigation:");
        console.log(`   Tag: <${tagName.toLowerCase()}>`);
        console.log(`   Classes: ${classes}`);
        console.log(`   ARIA Label: ${ariaLabel}`);
        console.log(`   Link count: ${linkCount}`);
        console.log(`   Position: ${boxInfo}`);

        // Show first few link texts
        console.log("   First 5 links:");
        for (let i = 0; i < Math.min(5, linkCount); i++) {
          const text = ((await links[i].textContent()) || "")
            .trim()
            .substring(0, 30);
          const href = (await links[i].getAttribute("href")) || "";
          console.log(`     ${i + 1}. "${text}" → ${href.substring(0, 40)}`);
        }

        // Highlight it on the page
        try {
          await nav.evaluate((el: HTMLElement) => {
            el.style.outline = "5px solid red";
            el.style.outlineOffset = "5px";
            el.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
          });
          console.log("   ✓ Red outline applied");
        } catch (err) {
          console.log(
            "   ⚠️ Could not apply highlight:",
            err instanceof Error ? err.message : err
          );
        }

        await page.waitForTimeout(3000); // Wait longer to see highlight
      }
    } catch (error) {
      console.error(
        `❌ Error: ${error instanceof Error ? error.message : error}`
      );
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log("\n✅ Test complete!");
}

testNavFinder().catch(console.error);
