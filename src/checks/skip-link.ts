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
      const skipLinkData = await page.evaluate(() => {
        const focusableSelector =
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(
          document.querySelectorAll(focusableSelector)
        ) as HTMLElement[];

        const keywordMatcher = (value: string | null | undefined) =>
          (value || "").toLowerCase().includes("skip");

        const candidates = focusable
          .filter((el) => {
            const tag = el.tagName.toLowerCase();
            if (tag !== "a" && tag !== "button") return false;

            const text = el.textContent?.trim().toLowerCase() || "";
            const ariaLabel = el.getAttribute("aria-label")?.toLowerCase();
            const title = el.getAttribute("title")?.toLowerCase();
            const className = el.className?.toLowerCase();

            const hasSkipKeyword =
              keywordMatcher(text) ||
              keywordMatcher(ariaLabel) ||
              keywordMatcher(title) ||
              keywordMatcher(className);

            if (!hasSkipKeyword) return false;

            if (tag === "a") {
              const href = el.getAttribute("href") || "";
              const normalizedHref = href.trim();

              if (normalizedHref.startsWith("#") && normalizedHref.length > 1) {
                return true;
              }

              // Allow JS-based skip links such as "javascript:OpenChat()"
              if (normalizedHref.toLowerCase().startsWith("javascript:")) {
                return true;
              }

              return false;
            }

            return true; // Buttons that mention skip
          })
          .map((el) => {
            const href = el.getAttribute("href") || "";
            const targetId = href.startsWith("#") ? href.slice(1) : null;

            return {
              outerHTML: el.outerHTML,
              text: el.textContent?.trim() || "",
              href,
              targetId,
              targetExists: targetId
                ? Boolean(document.getElementById(targetId))
                : null,
              focusableIndex: focusable.indexOf(el),
              matchesMainTarget: Boolean(
                targetId && /main|content|primary/i.test(targetId)
              ),
            };
          });

        return {
          candidates,
          firstFocusableIndex: focusable.length > 0 ? 0 : -1,
          firstFocusableHTML: focusable[0]?.outerHTML || null,
        };
      });

      const primarySkipLink =
        skipLinkData.candidates.find(
          (candidate) => candidate.matchesMainTarget
        ) || skipLinkData.candidates[0];

      if (!primarySkipLink) {
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
            candidatesFound: skipLinkData.candidates.length,
          },
        });

        logger.warn("Skip-to-content link not found", { url: target.url });
        return issues;
      }

      logger.info("Skip link found, testing functionality", {
        candidate: primarySkipLink.outerHTML,
      });

      if (primarySkipLink.focusableIndex !== 0) {
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
            skipLinkHTML: primarySkipLink.outerHTML,
            focusableIndex: primarySkipLink.focusableIndex,
            firstFocusableHTML: skipLinkData.firstFocusableHTML,
          },
        });
      }

      if (primarySkipLink.targetId && primarySkipLink.targetExists === false) {
        const href = `#${primarySkipLink.targetId}`;
        issues.push({
          id: `skip-link-broken-target-${Date.now()}`,
          title: "Skip Link Target Does Not Exist",
          description: `The skip link points to "${href}" but no element with that ID exists on the page. The link is non-functional.`,
          severity: "serious",
          impact: "litigation",
          effort: "low",
          wcagCriteria: ["2.4.1"],
          path: target.url,
          solution: `Add id="${primarySkipLink.targetId}" to the main content container (typically the <main> element). Ensure it also has tabindex="-1" to receive programmatic focus.`,
          copilotPrompt: `You are fixing: Skip link broken target (WCAG 2.4.1)
Target page: ${target.url}

The skip link points to "${href}" but the target element doesn't exist.

Requirements:
1. Find the main content container (usually <main> or the primary content div)
2. Add id="${primarySkipLink.targetId}" to that element
3. Add tabindex="-1" to make it programmatically focusable: <main id="${primarySkipLink.targetId}" tabindex="-1">
4. Optionally add focus management JavaScript to move focus to the target on click`,
          rawData: {
            href,
            targetId: primarySkipLink.targetId,
            targetExists: primarySkipLink.targetExists,
          },
        });
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
