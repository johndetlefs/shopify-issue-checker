import { Page, Locator } from "@playwright/test";

export interface FooterCandidate {
  locator: Locator;
  score: number;
  reason: string[];
}

/**
 * Find the site footer on a Shopify page
 *
 * Strategy:
 * 1. Try semantic <footer> first (most reliable)
 * 2. Try ARIA role="contentinfo"
 * 3. Try known class patterns
 * 4. Score all candidates if above fails
 *
 * Returns null if no footer found
 */
export async function findFooter(page: Page): Promise<Locator | null> {
  // Strategy 1: Semantic <footer> element
  const semanticFooter = page.locator("footer").first();
  if (
    (await semanticFooter.count()) > 0 &&
    (await semanticFooter.isVisible())
  ) {
    const isValid = await validateFooter(semanticFooter);
    if (isValid) {
      return semanticFooter;
    }
  }

  // Strategy 2: ARIA role="contentinfo"
  const ariaFooter = page.locator('[role="contentinfo"]').first();
  if ((await ariaFooter.count()) > 0 && (await ariaFooter.isVisible())) {
    return ariaFooter;
  }

  // Strategy 3: Known class patterns (common across Shopify themes)
  const knownClasses = [
    ".site-footer:visible",
    ".page-footer:visible",
    ".footer:visible",
    "[class*='footer']:visible",
  ];

  for (const selector of knownClasses) {
    const element = page.locator(selector).last(); // Footer is usually last
    if ((await element.count()) > 0 && (await element.isVisible())) {
      const isValid = await validateFooter(element);
      if (isValid) {
        return element;
      }
    }
  }

  // Strategy 4: Score all candidates
  const candidates = await scoreCandidates(page);

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const winner = candidates[0];

    if (winner.score > 0) {
      return winner.locator;
    }
  }

  return null;
}

/**
 * Validate that a candidate element is actually a site footer
 */
async function validateFooter(element: Locator): Promise<boolean> {
  try {
    // Check for common footer content
    const text = (await element.textContent()) || "";

    // Should have copyright symbol or text
    const hasCopyright = /©|copyright/i.test(text);

    // Should have common footer keywords
    const hasFooterKeywords =
      /(privacy|terms|contact|about|shipping|returns)/i.test(text);

    // Should be near bottom of page
    const box = await element.boundingBox();
    if (!box) return false;

    const viewportSize = await element.page().viewportSize();
    if (!viewportSize) return false;

    // Get scroll height to check actual position
    const scrollHeight = await element
      .page()
      .evaluate(() => document.body.scrollHeight);

    // Footer should be in the bottom 30% of the page
    const distanceFromBottom = scrollHeight - box.y;
    const isNearBottom = distanceFromBottom < scrollHeight * 0.3;

    // Valid if it has copyright OR (has footer keywords AND is near bottom)
    return hasCopyright || (hasFooterKeywords && isNearBottom);
  } catch {
    return false;
  }
}

/**
 * Score all potential footer candidates
 */
async function scoreCandidates(page: Page): Promise<FooterCandidate[]> {
  // Get all potential candidates
  const elements = await page
    .locator('footer, [role="contentinfo"], [class*="footer"], [id*="footer"]')
    .all();

  const candidates: FooterCandidate[] = [];

  for (const element of elements) {
    const score = await calculateScore(page, element);
    if (score !== null) {
      candidates.push(score);
    }
  }

  return candidates;
}

/**
 * Calculate a score for how likely an element is to be the site footer
 */
async function calculateScore(
  page: Page,
  element: Locator
): Promise<FooterCandidate | null> {
  try {
    const isVisible = await element.isVisible();
    if (!isVisible) return null;

    let score = 0;
    const reasons: string[] = [];

    // Semantic HTML
    const tagName = await element.evaluate((el: HTMLElement) =>
      el.tagName.toLowerCase()
    );
    if (tagName === "footer") {
      score += 30;
      reasons.push("+30: Semantic <footer> element");
    }

    // ARIA role
    const role = await element.getAttribute("role");
    if (role === "contentinfo") {
      score += 25;
      reasons.push("+25: ARIA role='contentinfo'");
    }

    // Content signals
    const text = (await element.textContent()) || "";

    if (/©|copyright/i.test(text)) {
      score += 20;
      reasons.push("+20: Contains copyright");
    }

    if (/(privacy|terms)/i.test(text)) {
      score += 15;
      reasons.push("+15: Contains policy links");
    }

    if (/(contact|about)/i.test(text)) {
      score += 10;
      reasons.push("+10: Contains contact/about");
    }

    if (/(facebook|twitter|instagram|linkedin|youtube)/i.test(text)) {
      score += 5;
      reasons.push("+5: Contains social media");
    }

    // Position in DOM
    const box = await element.boundingBox();
    if (box) {
      const scrollHeight = await page.evaluate(
        () => document.body.scrollHeight
      );
      const distanceFromBottom = scrollHeight - box.y;

      if (distanceFromBottom < scrollHeight * 0.2) {
        score += 15;
        reasons.push("+15: Located near bottom of page");
      } else if (distanceFromBottom < scrollHeight * 0.3) {
        score += 10;
        reasons.push("+10: Located in bottom third of page");
      }
    }

    // Class keywords
    const classes = (await element.getAttribute("class")) || "";
    if (/\bfooter\b/i.test(classes)) {
      score += 10;
      reasons.push("+10: Class contains 'footer'");
    }

    if (/site-footer|page-footer/i.test(classes)) {
      score += 5;
      reasons.push("+5: Class indicates site-level footer");
    }

    // ID keywords
    const id = (await element.getAttribute("id")) || "";
    if (/\bfooter\b/i.test(id)) {
      score += 8;
      reasons.push("+8: ID contains 'footer'");
    }

    // Negative signals
    if (/header|nav|main|article/i.test(classes)) {
      score -= 30;
      reasons.push("-30: Class suggests not footer");
    }

    if (/header|nav|main|article/i.test(id)) {
      score -= 30;
      reasons.push("-30: ID suggests not footer");
    }

    // Check if element is at the top of page (definitely not footer)
    if (box) {
      const viewportSize = await page.viewportSize();
      if (viewportSize && box.y < viewportSize.height * 0.3) {
        score -= 20;
        reasons.push("-20: Located at top of page");
      }
    }

    return {
      locator: element,
      score,
      reason: reasons,
    };
  } catch (error) {
    return null;
  }
}
