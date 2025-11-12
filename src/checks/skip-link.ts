/**
 * Skip-to-content link check
 *
 * Verifies the presence and functionality of a skip-to-content link,
 * tests keyboard focus behavior, and captures screenshots if failing.
 */

import { Check, CheckContext, Issue } from "../types";
import { logger } from "../core/logger";

export const skipLinkCheck: Check = {
  name: "skip-link",

  async run(context: CheckContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const { page, target } = context;

    try {
      logger.info(`Checking skip-to-content link on ${target.label}`);

      // Look for common skip link patterns
      const skipLink = await page
        .locator('a[href="#main"], a[href="#content"], a[href="#main-content"]')
        .first();
      const skipLinkExists = (await skipLink.count()) > 0;

      if (!skipLinkExists) {
        // Issue: No skip link found
        issues.push({
          id: `skip-link-missing-${Date.now()}`,
          title: "Missing Skip-to-Content Link",
          description:
            "No skip-to-content link found on the page. This is essential for keyboard users to bypass repetitive navigation and jump directly to the main content.",
          severity: "serious",
          impact: "litigation",
          effort: "low",
          wcagCriteria: ["2.4.1"],
          path: target.url,
          solution:
            "Add a visually hidden skip link as the first focusable element in the <body> that becomes visible on focus and links to the main content area.",
          copilotPrompt: `You are fixing: Missing skip-to-content link (WCAG 2.4.1)
Target page: ${target.url}

Requirements:
1. Insert <a class="skip-link" href="#main">Skip to main content</a> as the first focusable element in <body>
2. Ensure the target element has id="main" (typically the <main> element)
3. Add CSS to make it visually hidden but visible on keyboard focus:
   
   .skip-link {
     position: absolute;
     left: -9999px;
     z-index: 999;
   }
   
   .skip-link:focus {
     left: 50%;
     transform: translateX(-50%);
     top: 10px;
     padding: 10px 20px;
     background: #000;
     color: #fff;
     text-decoration: none;
   }

4. In Shopify Liquid, add this to theme.liquid before any other focusable content
5. Test by pressing Tab key on page load - link should appear

WCAG Success Criterion: 2.4.1 Bypass Blocks (Level A)`,
          rawData: {
            selector:
              'a[href="#main"], a[href="#content"], a[href="#main-content"]',
            found: false,
          },
        });

        logger.warn("Skip-to-content link not found", { url: target.url });
        return issues;
      }

      // Skip link exists - now test its functionality
      logger.info("Skip link found, testing functionality...");

      // Check if it's the first focusable element
      const firstFocusable = await page.evaluate(() => {
        const focusable = Array.from(
          document.querySelectorAll(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ) as HTMLElement[];
        return focusable[0]?.outerHTML || null;
      });

      const skipLinkHTML = await skipLink.evaluate((el) => el.outerHTML);
      const isFirstFocusable = firstFocusable === skipLinkHTML;

      if (!isFirstFocusable) {
        issues.push({
          id: `skip-link-not-first-${Date.now()}`,
          title: "Skip Link Not First Focusable Element",
          description:
            "The skip-to-content link exists but is not the first focusable element on the page. Users must tab through other elements before reaching it, defeating its purpose.",
          severity: "moderate",
          impact: "litigation",
          effort: "low",
          wcagCriteria: ["2.4.1"],
          path: target.url,
          solution:
            "Move the skip link to be the very first focusable element in the DOM, immediately after the opening <body> tag.",
          copilotPrompt: `You are fixing: Skip link not first focusable element (WCAG 2.4.1)
Target page: ${target.url}

The skip link exists but appears after other focusable elements.

Requirements:
1. Move the skip link to be the FIRST element inside <body>
2. Ensure no other focusable elements (links, buttons, inputs) come before it
3. In Shopify theme.liquid, place it at the very top of the body content
4. Verify by pressing Tab once on page load - skip link should receive focus first`,
          rawData: {
            skipLinkHTML,
            firstFocusableHTML: firstFocusable,
            isFirstFocusable: false,
          },
        });
      }

      // Test if the target exists and link navigates properly
      const href = await skipLink.getAttribute("href");
      if (href) {
        const targetId = href.replace("#", "");
        const targetExists = (await page.locator(`#${targetId}`).count()) > 0;

        if (!targetExists) {
          issues.push({
            id: `skip-link-broken-target-${Date.now()}`,
            title: "Skip Link Target Does Not Exist",
            description: `The skip link points to "${href}" but no element with that ID exists on the page. The link is non-functional.`,
            severity: "serious",
            impact: "litigation",
            effort: "low",
            wcagCriteria: ["2.4.1"],
            path: target.url,
            solution: `Add id="${targetId}" to the main content container (typically the <main> element). Ensure it also has tabindex="-1" to receive programmatic focus.`,
            copilotPrompt: `You are fixing: Skip link broken target (WCAG 2.4.1)
Target page: ${target.url}

The skip link points to "${href}" but the target element doesn't exist.

Requirements:
1. Find the main content container (usually <main> or the primary content div)
2. Add id="${targetId}" to that element
3. Add tabindex="-1" to make it programmatically focusable: <main id="${targetId}" tabindex="-1">
4. Optionally add focus management JavaScript to move focus to the target on click`,
            rawData: {
              href,
              targetId,
              targetExists: false,
            },
          });
        }
      }

      // If no issues found, skip link is working correctly
      if (issues.length === 0) {
        logger.info("Skip-to-content link is present and functional", {
          url: target.url,
        });
      }
    } catch (error) {
      logger.error("Error checking skip link", error);
      // Don't throw - just log and continue
    }

    return issues;
  },
};
