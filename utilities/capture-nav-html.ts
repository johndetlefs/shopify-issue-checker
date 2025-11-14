/**
 * Capture full page HTML for pattern analysis
 * Note: Despite the filename, this captures the ENTIRE page (header, nav, main, footer)
 * so the HTML can be reused for analyzing any UI component.
 *
 * Usage: npx tsx utilities/capture-nav-html.ts
 */

import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";

async function captureHTML(url: string, name: string) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log(`\n📍 Loading ${name}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Just get the raw HTML - no processing
    const html = await page.content();

    // Save it
    mkdirSync(`./pattern-analysis/${name}`, { recursive: true });
    writeFileSync(`./pattern-analysis/${name}/desktop.html`, html);

    console.log(`✅ ${name}: Saved full page HTML`);
  } catch (error) {
    console.error(
      `❌ ${name}: ${error instanceof Error ? error.message : error}`
    );
  } finally {
    await browser.close();
  }
}

// Process one site at a time
const site = process.argv[2];
const sites: Record<string, string> = {
  harris: "https://www.harrisfarm.com.au/",
  koala: "https://au.koala.com/",
  strand: "https://www.strandbags.com.au/",
  universal: "https://www.universalstore.com/",
  camilla: "https://camilla.com",
  patagonia: "https://www.patagonia.com.au/",
};

if (!site || !sites[site]) {
  console.log("Usage: npx tsx capture-nav-html.ts <site>");
  console.log("Sites:", Object.keys(sites).join(", "));
  process.exit(1);
}

captureHTML(sites[site], site).catch(console.error);
