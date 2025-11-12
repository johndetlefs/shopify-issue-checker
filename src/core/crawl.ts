/**
 * Crawl target discovery
 *
 * Discovers high-value pages to audit on a Shopify storefront.
 * Returns a small, focused set of URLs for sales-grade scanning.
 */

import { Page } from "@playwright/test";
import { PageTarget } from "../types";

export async function discoverTargets(
  page: Page,
  baseUrl: string
): Promise<PageTarget[]> {
  // TODO: Navigate to homepage
  // TODO: Extract collection and product URLs from homepage links
  // TODO: Build target list: home, collections, cart, search, policy pages
  // TODO: Handle navigation failures gracefully
  // TODO: Deduplicate and return ~5-6 high-signal pages

  return [{ url: baseUrl, label: "Homepage" }];
}
