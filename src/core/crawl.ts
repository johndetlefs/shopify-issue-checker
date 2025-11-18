/**
 * Crawl target discovery
 *
 * Discovers high-value pages to audit on a Shopify storefront.
 * Returns a small, focused set of URLs for sales-grade scanning.
 */

import { Page } from "@playwright/test";
import { PageTarget } from "../types";
import { logger } from "./logger";
import { navigateWithFallback } from "./navigation";
import { findFooter } from "./find-footer";

export async function discoverTargets(
  page: Page,
  baseUrl: string
): Promise<PageTarget[]> {
  const targets: PageTarget[] = [];
  const seenUrls = new Set<string>();
  let effectiveBaseUrl = baseUrl;

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
    const homepageNav = await navigateWithFallback(page, baseUrl, {
      label: "Homepage",
      timeout: 20000,
    });

    effectiveBaseUrl = homepageNav.finalUrl || baseUrl;
    addTarget(effectiveBaseUrl, "Homepage");

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
      const url = new URL(path, effectiveBaseUrl).href;
      // Quick check if page exists
      try {
        const result = await navigateWithFallback(page, url, {
          label,
          timeout: 10000,
        });

        const pageExists =
          (result.response && result.response.ok()) || result.fallbackTriggered;

        if (pageExists) {
          addTarget(result.finalUrl || url, label);
        }
      } catch (error) {
        logger.warn(`Page not found or failed to load: ${label}`, {
          url,
          error,
        });
      }
    }

    // 4. Discover legal pages dynamically from footer links
    try {
      await navigateWithFallback(page, effectiveBaseUrl, {
        label: "Homepage (footer discovery)",
        timeout: 12000,
      });

      const footer = await findFooter(page);

      if (!footer) {
        logger.warn("Footer not detected; skipping legal link discovery", {
          url: effectiveBaseUrl,
        });
      } else {
        const legalLinks = await footer.evaluate<{
          privacy: { href: string; text: string } | null;
          terms: { href: string; text: string } | null;
        }>((footerEl: Element) => {
          const anchors = Array.from(
            footerEl.querySelectorAll("a[href]")
          ) as HTMLAnchorElement[];

          const getMatchString = (anchor: HTMLAnchorElement) =>
            `${anchor.textContent || ""} ${
              anchor.getAttribute("aria-label") || ""
            }`
              .toLowerCase()
              .trim();

          const toResult = (anchor: HTMLAnchorElement | null) =>
            anchor
              ? {
                  href: anchor.href,
                  text:
                    anchor.textContent?.trim() ||
                    anchor.getAttribute("aria-label") ||
                    anchor.href,
                }
              : null;

          const privacyAnchor =
            anchors.find((anchor) =>
              getMatchString(anchor).includes("privacy")
            ) || null;
          const termsAnchor =
            anchors.find((anchor) => {
              const match = getMatchString(anchor);
              return match.includes("terms") || match.includes("condition");
            }) || null;

          return {
            privacy: toResult(privacyAnchor),
            terms: toResult(termsAnchor),
          };
        });

        if (legalLinks.privacy) {
          addTarget(legalLinks.privacy.href, "Privacy Policy");
        }

        if (legalLinks.terms) {
          addTarget(legalLinks.terms.href, "Terms of Service");
        }
      }
    } catch (error) {
      logger.warn("Failed to discover legal links from footer", {
        url: effectiveBaseUrl,
        error,
      });
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
