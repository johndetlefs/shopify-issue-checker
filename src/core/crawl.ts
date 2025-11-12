/**
 * Crawl target discovery
 *
 * Discovers high-value pages to audit on a Shopify storefront.
 * Returns a small, focused set of URLs for sales-grade scanning.
 */

import { Page } from "@playwright/test";
import { PageTarget } from "../types";
import { logger } from "./logger";

export async function discoverTargets(
  page: Page,
  baseUrl: string
): Promise<PageTarget[]> {
  const targets: PageTarget[] = [];
  const seenUrls = new Set<string>();

  // Helper to add target with deduplication
  const addTarget = (url: string, label: string) => {
    const normalizedUrl = url.split("?")[0]; // Remove query params for deduplication
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      targets.push({ url, label });
      logger.info(`Discovered target: ${label}`, { url });
    }
  };

  try {
    // 1. Homepage
    logger.info("Navigating to homepage", { baseUrl });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    addTarget(baseUrl, "Homepage");

    // 2. Discover product and collection links from homepage
    try {
      const links = await page.$$eval(
        'a[href*="/products/"], a[href*="/collections/"]',
        (anchors) =>
          anchors.slice(0, 10).map((a) => {
            const anchor = a as HTMLAnchorElement;
            return {
              href: anchor.href,
              text: anchor.textContent?.trim() || "",
            };
          })
      );

      // Add first product link
      const productLink = links.find((l) => l.href.includes("/products/"));
      if (productLink) {
        addTarget(
          productLink.href,
          `Product: ${productLink.text || "Unknown"}`
        );
      }

      // Add first collection link
      const collectionLink = links.find((l) =>
        l.href.includes("/collections/")
      );
      if (collectionLink) {
        addTarget(
          collectionLink.href,
          `Collection: ${collectionLink.text || "Unknown"}`
        );
      }
    } catch (error) {
      logger.warn(
        "Could not extract product/collection links from homepage",
        error
      );
    }

    // 3. Common Shopify pages
    const commonPages = [
      { path: "/cart", label: "Shopping Cart" },
      { path: "/search", label: "Search" },
      { path: "/pages/about", label: "About Page" },
      { path: "/policies/shipping-policy", label: "Shipping Policy" },
      { path: "/collections/all", label: "All Products Collection" },
    ];

    for (const { path, label } of commonPages) {
      const url = new URL(path, baseUrl).href;
      // Quick check if page exists
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        if (response && response.ok()) {
          addTarget(url, label);
        }
      } catch (error) {
        logger.warn(`Page not found or failed to load: ${label}`, { url });
      }
    }
  } catch (error) {
    logger.error("Error during target discovery", error);
    // Return at least the homepage if we have it
    if (targets.length === 0) {
      targets.push({ url: baseUrl, label: "Homepage" });
    }
  }

  logger.info(`Discovered ${targets.length} targets for audit`);
  return targets;
}
