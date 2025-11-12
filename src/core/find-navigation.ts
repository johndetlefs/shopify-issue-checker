/**
 * Smart navigation finder
 * Based on analysis of 5 Shopify sites (see NAV-PATTERNS.md)
 */

import { Page, Locator } from "@playwright/test";

export interface NavigationCandidate {
  locator: Locator;
  score: number;
  reason: string[];
  linkCount: number;
  classes: string;
  ariaLabel?: string;
}

export async function findMainNavigation(page: Page): Promise<Locator | null> {
  // Strategy 1: Try known class patterns first (most reliable)
  const knownClasses = [
    ".header__inline-menu:visible",
    ".main-menu:not(.main-menu-mobile):visible",
    '[class*="primary-nav"]:visible',
    '[class*="main-nav"]:not([class*="mobile"]):visible',
  ];

  for (const selector of knownClasses) {
    const nav = page.locator(selector).first();
    if ((await nav.count()) > 0) {
      const isVisible = await nav.isVisible();
      if (isVisible) {
        return nav;
      }
    }
  }

  // Strategy 2: Score all nav elements
  const candidates = await scoreNavigationCandidates(page);

  if (candidates.length > 0) {
    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    const winner = candidates[0];

    // Only return if score is positive (shows confidence)
    if (winner.score > 0) {
      return winner.locator;
    }
  }

  // Strategy 3: Try ARIA-labeled navigation (only if scoring failed)
  const ariaNav = page
    .locator(
      'nav[aria-label*="main" i]:visible, nav[aria-label*="primary" i]:visible'
    )
    .first();
  if ((await ariaNav.count()) > 0) {
    return ariaNav;
  }

  // Strategy 4: Fallback to any nav-like element in header
  const fallback = page
    .locator(
      'header nav:visible, header [class*="menu"]:not([class*="mobile"]):visible'
    )
    .first();
  if ((await fallback.count()) > 0) {
    return fallback;
  }

  return null;
}

async function scoreNavigationCandidates(
  page: Page
): Promise<NavigationCandidate[]> {
  // Get all nav elements, nav-role elements, AND common navigation class patterns
  const navElements = await page
    .locator(
      'nav, [role="navigation"], .shop-menu, .main-navigation, .primary-nav, sidemenu, .thb-full-menu, [class*="header"] [class*="menu"]:not([class*="mobile"]):not([class*="drawer"])'
    )
    .all();

  const candidates: NavigationCandidate[] = [];

  for (const nav of navElements) {
    const score = await calculateNavScore(page, nav);
    if (score !== null) {
      candidates.push(score);
      // Log for debugging
      const idx = candidates.length;
      console.log(
        `Nav #${idx}: score=${score.score}, links=${
          score.linkCount
        }, classes="${score.classes}", aria="${score.ariaLabel || "(none)"}"`
      );
      score.reason.forEach((r) => console.log(`  ${r}`));
    }
  }

  return candidates;
}

async function calculateNavScore(
  page: Page,
  nav: Locator
): Promise<NavigationCandidate | null> {
  try {
    const isVisible = await nav.isVisible();
    if (!isVisible) {
      return null; // Skip hidden navs
    }

    // Also check if element has display:none or visibility:hidden on desktop
    const isHidden = await nav.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return (
        styles.display === "none" ||
        styles.visibility === "hidden" ||
        styles.opacity === "0"
      );
    });
    if (isHidden) {
      return null;
    }

    let score = 0;
    const reasons: string[] = [];

    // Get metadata
    const classes = (await nav.getAttribute("class")) || "";
    const ariaLabel = (await nav.getAttribute("aria-label")) || undefined;

    // Count only VISIBLE top-level links (not hidden in submenus)
    // This handles mega menus where there are many hidden dropdown links
    const visibleLinks = await nav.evaluate((navEl) => {
      const allLinks = Array.from(navEl.querySelectorAll("a"));
      const visible = allLinks.filter((link) => {
        const rect = link.getBoundingClientRect();
        const styles = window.getComputedStyle(link);

        // Must have dimensions and be visible
        const hasSize = rect.width > 0 && rect.height > 0;
        const isVisible =
          styles.display !== "none" &&
          styles.visibility !== "hidden" &&
          parseFloat(styles.opacity) > 0;

        // Must not be in a hidden parent (dropdown/submenu)
        let parent = link.parentElement;
        while (parent && parent !== navEl) {
          const parentStyles = window.getComputedStyle(parent);
          if (
            parentStyles.display === "none" ||
            parentStyles.visibility === "hidden" ||
            parseFloat(parentStyles.opacity) === 0
          ) {
            return false;
          }
          parent = parent.parentElement;
        }

        return hasSize && isVisible;
      });

      return visible.length;
    });

    const linkCount = visibleLinks;

    // Skip elements with 0 or 1 links (not a real navigation)
    if (linkCount <= 1) {
      return null;
    }

    // Get locators for the visible links for further analysis
    const links = await nav.locator("a:visible").all();

    // Scoring rules (based on NAV-PATTERNS.md analysis)

    // +10: Inside header element
    const inHeader = await nav.evaluate((el) => {
      // Check for <header> tag OR any element with "header" in class
      const headerTag = el.closest("header");
      const headerClass = el.closest('[class*="header"]');
      return !!(headerTag || headerClass);
    });
    if (inHeader) {
      score += 20; // Increased from 10 - header location is critical
      reasons.push("+20: Inside <header>");
    } else {
      // Penalty for being outside header (likely footer nav)
      score -= 10;
      reasons.push("-10: Not in <header> (likely footer)");
    }

    // +10: Has aria-label with "main" or "primary"
    if (ariaLabel && /main|primary/i.test(ariaLabel)) {
      score += 10;
      reasons.push("+10: ARIA label indicates main nav");
    }

    // +10: Class contains navigation keywords (but not utility/mobile/drawer)
    const positiveNavKeywords =
      /header.*inline|primary.*nav|main.*nav(?!-mobile)/i;
    const negativeNavKeywords = /mobile|drawer|utility|footer|announcement/i;

    if (
      positiveNavKeywords.test(classes) &&
      !negativeNavKeywords.test(classes)
    ) {
      score += 10;
      reasons.push("+10: Class indicates main navigation");
    }

    // Special case: "header__main-menu" might be utility, check link content
    if (/header.*main.*menu/i.test(classes)) {
      const utilityCount = await countUtilityLinks(links);
      if (utilityCount >= linkCount * 0.8) {
        score -= 15;
        reasons.push('-15: "main-menu" class but mostly utility links');
      }
    }

    // +5: In top portion of page
    const box = await nav.boundingBox();
    if (box && box.y < 200) {
      score += 10; // Increased from 5 - being at top is very important
      reasons.push("+10: Visible in top 200px");
    } else if (box && box.y > 1000) {
      score -= 10; // Penalty for being way down (likely footer)
      reasons.push("-10: Located far down page (likely footer)");
    }

    // +5: Has optimal link count (5-15 direct links)
    if (linkCount >= 5 && linkCount <= 15) {
      score += 5;
      reasons.push(`+5: Optimal link count (${linkCount})`);
    }

    // -5: Class indicates mobile/utility/footer
    const negativeKeywords = /mobile|drawer|utility|footer|announcement/i;
    if (negativeKeywords.test(classes)) {
      score -= 15; // Increased penalty
      reasons.push("-15: Class suggests not main nav");
    }

    // -10: Too many links (>50 = likely mobile menu)
    if (linkCount > 50) {
      score -= 15; // Increased penalty
      reasons.push(`-15: Too many links (${linkCount})`);
    }

    // -10: Too few links (<3 = likely utility)
    if (linkCount < 3 && linkCount > 0) {
      score -= 15; // Increased penalty
      reasons.push(`-15: Too few links (${linkCount})`);
    }

    // +10: Bonus for optimal range (7-12 links - sweet spot for main nav)
    if (linkCount >= 7 && linkCount <= 12) {
      score += 10;
      reasons.push(`+10: Ideal link count (${linkCount})`);
    }

    // +5: Links go to collections/products (main nav pattern)
    const categoryLinkCount = await countCategoryLinks(links);
    if (categoryLinkCount >= 3) {
      score += 10; // Increased from 5
      reasons.push(`+10: Has ${categoryLinkCount} category links`);
    }

    // +10: Most links are category links (>50%)
    if (linkCount > 0 && categoryLinkCount / linkCount > 0.5) {
      score += 10;
      reasons.push(
        `+10: Majority are category links (${Math.round(
          (categoryLinkCount / linkCount) * 100
        )}%)`
      );
    }

    // -10: All links are utility links
    const utilityLinkCount = await countUtilityLinks(links);
    if (linkCount > 0 && utilityLinkCount === linkCount) {
      score -= 20; // Increased from 10
      reasons.push("-20: All links are utility links");
    }

    return {
      locator: nav,
      score,
      reason: reasons,
      linkCount,
      classes,
      ariaLabel,
    };
  } catch (error) {
    return null;
  }
}

async function countCategoryLinks(links: Locator[]): Promise<number> {
  let count = 0;
  for (const link of links) {
    try {
      const href = (await link.getAttribute("href")) || "";
      if (
        /\/collections\/|\/products\/|\/pages\/[^/]+-collection/i.test(href)
      ) {
        count++;
      }
    } catch {
      // Skip errors
    }
  }
  return count;
}

async function countUtilityLinks(links: Locator[]): Promise<number> {
  let count = 0;
  for (const link of links) {
    try {
      const href = (await link.getAttribute("href")) || "";
      const text = ((await link.textContent()) || "").toLowerCase().trim();

      // Empty text links (like logo) are utility
      if (text === "") {
        count++;
        continue;
      }

      const utilityPatterns =
        /\/account|\/cart|\/search|\/login|store.locator|help.center|wishlist|faq/i;
      const utilityText =
        /^(account|cart|bag|search|login|sign in|help|wishlist|store locator|faq|browse products|find a store)$/i;

      if (utilityPatterns.test(href) || utilityText.test(text)) {
        count++;
      }
    } catch {
      // Skip errors
    }
  }
  return count;
}
