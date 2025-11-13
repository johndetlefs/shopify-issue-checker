/**
 * Mega menu keyboard navigation check
 *
 * Tests keyboard accessibility of the main navigation menu,
 * verifying that submenus can be opened and focused via keyboard.
 */

import { Check, CheckContext, Issue } from "../types";
import { logger } from "../core/logger";
import { findMainNavigation } from "../core/find-navigation";
import {
  defaultAnnotationConfig,
  generateOverlayStyles,
  generateLabelStyles,
  calculateLabelPosition,
} from "../core/annotation-styles";
import { clearAnnotations, annotateElement } from "../core/annotation-utils";

export const megaMenuCheck: Check = {
  name: "mega-menu",

  async run(context: CheckContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const { page, target } = context;

    try {
      logger.info(`Checking mega menu keyboard navigation on ${target.label}`);

      // Find the main navigation using smart selector
      const nav = await findMainNavigation(page);

      if (!nav) {
        logger.warn("No main navigation found", { url: target.url });
        return issues;
      }

      logger.info("Found main navigation", {
        classes: await nav.getAttribute("class"),
        ariaLabel: await nav.getAttribute("aria-label"),
      });

      // Track issues found
      let hasKeyboardOpenIssue = false;
      let hasEscapeIssue = false;
      let hasFocusTrapIssue = false;
      let tooManyTabStops = false;
      let hasHoverOnlyIssue = false;
      let hasMissingFocusIndicator = false;
      let hasMissingAriaIssue = false;
      let hasLinkAsButtonIssue = false;
      let hasNonSemanticNavIssue = false;
      let hasFocusReturnIssue = false;
      let hasMobileHamburgerIssue = false;
      let hasHoverTimeoutIssue = false;
      let hasArrowKeyNavigationIssue = false;

      // Check for links pretending to be buttons (runs early, independent of ARIA)
      if (!hasLinkAsButtonIssue) {
        const linkAsButtonItems = await page.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll(
              'nav a[href="#"], nav a[href="#!"], [class*="header"] a[href="#"], [class*="header"] a[href="#!"]'
            )
          );

          const problematic = items.filter((item) => {
            const hasDropdown =
              item.hasAttribute("aria-haspopup") ||
              item.hasAttribute("aria-expanded") ||
              item
                .closest("li")
                ?.querySelector('ul, .submenu, .dropdown, [role="menu"]') !==
                null;

            return hasDropdown;
          });

          return {
            count: problematic.length,
            examples: problematic.slice(0, 3).map((item) => ({
              text: item.textContent?.trim() || "(no text)",
              classes: item.className,
              hasAriaExpanded: item.hasAttribute("aria-expanded"),
              hasAriaHaspopup: item.hasAttribute("aria-haspopup"),
            })),
          };
        });

        if (linkAsButtonItems.count > 0) {
          hasLinkAsButtonIssue = true;
          issues.push({
            id: `mega-menu-link-as-button-${Date.now()}`,
            title: "Navigation Dropdown Triggers Use Links Instead of Buttons",
            description: `${linkAsButtonItems.count} navigation items use <a href="#"> for dropdown triggers instead of semantic <button> elements. This confuses screen readers (announces as "link" not "button"), doesn't work with Space key (only Enter), and violates the semantic purpose of links (navigation) vs buttons (actions).`,
            severity: "serious",
            impact: "litigation",
            effort: "low",
            wcagCriteria: ["4.1.2", "2.1.1"],
            path: target.url,
            solution:
              'Replace <a href="#"> with <button type="button"> for dropdown triggers. If the item also links to a category page, split into separate link and button elements.',
            copilotPrompt: `You are fixing: Dropdown triggers using links instead of buttons (WCAG 4.1.2, 2.1.1)
Target page: ${target.url}

Navigation items with dropdowns are using <a href="#"> which is semantically incorrect.

Requirements:
1. Replace <a href="#"> with <button type="button"> for dropdown triggers
2. Ensure Space key works (not just Enter)
3. Fix screen reader announcement from "link" to "button"

❌ BEFORE (incorrect):
<a href="#" aria-expanded="false" aria-haspopup="true">
  Products
</a>

✅ AFTER (correct - dropdown only):
<button type="button" aria-expanded="false" aria-haspopup="true">
  Products
</button>

✅ AFTER (dropdown + link to category page):
<div class="nav-item">
  <a href="/collections/products">Products</a>
  <button 
    type="button" 
    aria-expanded="false" 
    aria-haspopup="true"
    aria-label="Open Products menu">
    <svg><!-- chevron icon --></svg>
  </button>
</div>

CSS adjustments needed:
- Remove link-specific styles (text-decoration, color on hover)
- Add button reset styles:

button[aria-haspopup] {
  background: none;
  border: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: inherit;
}

button[aria-haspopup]:hover,
button[aria-haspopup]:focus-visible {
  /* Match your link hover styles */
}

4. Update JavaScript to handle button clicks (not link clicks)
5. Test with keyboard: Space and Enter should both work
6. Test with screen reader: should announce "button" not "link"

Examples found: ${JSON.stringify(linkAsButtonItems.examples, null, 2)}

WCAG Success Criteria: 
- 4.1.2 Name, Role, Value (Level A) - Element role must match behavior
- 2.1.1 Keyboard (Level A) - Space key must work on buttons`,
            rawData: linkAsButtonItems,
          });
        }
      }

      // Find navigation items that might have dropdowns/submenus within the found navigation
      const menuItems = await nav
        .locator(
          "button[aria-expanded], a[aria-expanded], button[aria-haspopup], a[aria-haspopup], .menu-item, li"
        )
        .all();

      if (menuItems.length === 0) {
        logger.info("No menu items with dropdowns detected");
        return issues;
      }

      logger.info(`Found ${menuItems.length} potential menu items to check`);

      // Check 1: Test for hover-only activation (no click handler)
      if (!hasHoverOnlyIssue) {
        const hoverOnlyItems = await page.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll("nav li, nav .menu-item")
          );
          const hoverOnly = items.filter((item) => {
            const styles = window.getComputedStyle(item);
            const hasHoverStyles = item.querySelector(":hover") !== null;
            const hasClickHandler =
              (item as HTMLElement).onclick !== null ||
              item.querySelector('button, a[role="button"]') !== null;

            // Check if submenu only appears on hover (CSS-only)
            const submenu = item.querySelector("ul, .submenu, .dropdown");
            if (submenu) {
              const submenuStyles = window.getComputedStyle(submenu);
              const hiddenByDefault =
                submenuStyles.display === "none" ||
                submenuStyles.visibility === "hidden" ||
                submenuStyles.opacity === "0";
              return hiddenByDefault && !hasClickHandler;
            }
            return false;
          });
          return hoverOnly.length;
        });

        if (hoverOnlyItems > 0) {
          hasHoverOnlyIssue = true;
          issues.push({
            id: `mega-menu-hover-only-${Date.now()}`,
            title: "Navigation Only Works on Mouse Hover",
            description: `Navigation menus only open on mouse hover, making them inaccessible on touch devices and to keyboard users. ${hoverOnlyItems} menu items affected.`,
            severity: "critical",
            impact: "conversion",
            effort: "medium",
            wcagCriteria: ["2.1.1", "2.5.5"],
            path: target.url,
            solution:
              "Add click/tap handlers to toggle menus in addition to hover. Use JavaScript to detect click/touch events and show submenus, ensuring touch device compatibility.",
            copilotPrompt: `You are fixing: Navigation only works on mouse hover (WCAG 2.1.1, 2.5.5)
Target page: ${target.url}

Menu submenus only appear on CSS :hover, making them unusable on touch devices.

Requirements:
1. Add click handlers to menu toggle elements
2. Toggle submenu visibility on click/tap
3. Keep hover for mouse users, add click for touch/keyboard
4. Example JavaScript:

   menuItems.forEach(item => {
     const toggle = item.querySelector('a, button');
     const submenu = item.querySelector('.submenu');
     
     toggle.addEventListener('click', (e) => {
       e.preventDefault();
       const isOpen = item.classList.contains('open');
       
       // Close other menus
       document.querySelectorAll('.menu-item.open').forEach(m => {
         m.classList.remove('open');
       });
       
       if (!isOpen) {
         item.classList.add('open');
         toggle.setAttribute('aria-expanded', 'true');
       } else {
         toggle.setAttribute('aria-expanded', 'false');
       }
     });
   });

5. CSS: Use .open class instead of :hover for visibility
6. Ensure works on iOS/Android touch devices
7. Test with touch emulation in DevTools

WCAG Success Criteria: 2.1.1 Keyboard (Level A), 2.5.5 Target Size (Level AAA)`,
            rawData: {
              hoverOnlyItemCount: hoverOnlyItems,
            },
          });
        }
      }

      // Check 2: Missing focus indicators
      if (!hasMissingFocusIndicator) {
        const missingFocusIndicators = await page.evaluate(() => {
          const focusableInNav = Array.from(
            document.querySelectorAll("nav a, nav button")
          );
          const missing = focusableInNav.filter((el) => {
            const styles = window.getComputedStyle(el);
            // Check if outline is removed
            const hasOutlineNone =
              styles.outline === "none" ||
              styles.outline === "0px" ||
              styles.outlineWidth === "0px";

            // Check for alternative focus styles
            const hasFocusVisible = el.matches(":focus-visible");
            const hasBoxShadow = styles.boxShadow !== "none";
            const hasBorder = styles.borderWidth !== "0px";
            const hasBackground =
              styles.backgroundColor !== "transparent" &&
              styles.backgroundColor !== "rgba(0, 0, 0, 0)";

            const hasAlternativeFocusStyle =
              hasBoxShadow || hasBorder || hasBackground;

            return hasOutlineNone && !hasAlternativeFocusStyle;
          });
          return missing.length;
        });

        if (missingFocusIndicators > 0) {
          hasMissingFocusIndicator = true;

          // Capture annotated screenshot showing focused element without visible indicator
          const rawData: { screenshotBuffer?: Buffer; codeSnippet?: string } =
            {};
          try {
            // Close any modals/popups/search overlays that might be in the way
            await page.evaluate(() => {
              // Close common modal patterns and search overlays
              const closeButtons = Array.from(
                document.querySelectorAll(
                  '[class*="close"], [class*="Close"], [class*="CLOSE"], [aria-label*="close" i], button[aria-label*="Close" i]'
                )
              );
              closeButtons.forEach((btn) => (btn as HTMLElement).click());
            });

            // Press Escape multiple times to ensure all overlays are closed
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);

            // Remove any search overlays that might obscure navigation
            await page.evaluate(() => {
              const overlays = Array.from(
                document.querySelectorAll(
                  '[class*="overlay"], [class*="Overlay"], [class*="backdrop"], [class*="Backdrop"], ' +
                    '[class*="search"], [class*="Search"], [role="search"], ' +
                    'header form, header input[type="search"], header input[type="text"]'
                )
              );
              overlays.forEach((el) => {
                const styles = window.getComputedStyle(el);
                if (
                  styles.position === "fixed" ||
                  styles.position === "absolute" ||
                  el.tagName === "FORM" ||
                  el.tagName === "INPUT"
                ) {
                  (el as HTMLElement).style.display = "none";
                  (el as HTMLElement).style.visibility = "hidden";
                }
              });
            });

            // Use the helper to annotate the first visible navigation link
            const annotationResult = await annotateElement(page, {
              containerLocator: nav,
              selector: "a, button",
              labelText: "⚠️ No visible focus indicator",
              annotationType: "focus-indicator",
              filter: (el: Element) => {
                const text = (el as HTMLElement).innerText?.trim() || "";
                const href =
                  (el as HTMLAnchorElement).href?.toLowerCase() || "";

                // Must have text content
                if (!text || text.length === 0) return false;

                // Filter out utility links
                const utilityTexts = [
                  "search",
                  "cart",
                  "bag",
                  "account",
                  "login",
                  "sign in",
                  "wishlist",
                  "store locator",
                  "help",
                  "help center",
                ];
                const utilityHrefs = [
                  "/account",
                  "/cart",
                  "/search",
                  "/login",
                  "/pages/store-locator",
                  "/pages/help",
                ];

                const isUtility =
                  utilityTexts.some(
                    (util) =>
                      text.toLowerCase() === util ||
                      text.toLowerCase().includes(util)
                  ) || utilityHrefs.some((util) => href.endsWith(util));

                return !isUtility;
              },
              waitAfterAnnotation: 2000,
            });

            if (annotationResult) {
              rawData.screenshotBuffer = annotationResult.screenshotBuffer;
              logger.info(
                "Focus indicator annotation captured",
                annotationResult.elementInfo
              );
            } else {
              logger.warn(
                "Could not annotate focus indicator - no suitable element found"
              );
            }

            // Extract code snippet
            rawData.codeSnippet = await page.evaluate(() => {
              const firstFocusable = Array.from(
                document.querySelectorAll("nav a, nav button")
              ).find((e: any) => {
                const rect = e.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              });
              if (!firstFocusable) return "";

              // Get the computed styles to show the outline: none
              const styles = window.getComputedStyle(firstFocusable);
              const outlineStyle = `outline: ${styles.outline}`;

              return `<!-- Current (problematic) code -->\n${firstFocusable.outerHTML}\n\n<!-- Computed style shows: ${outlineStyle} -->`;
            });
          } catch (err) {
            logger.warn("Failed to capture focus indicator evidence", {
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            });
          }

          issues.push({
            id: `mega-menu-no-focus-indicator-${Date.now()}`,
            title: "Navigation Links Missing Keyboard Focus Indicator",
            description: `${missingFocusIndicators} navigation elements have no visible focus indicator when keyboard users navigate to them. This makes it impossible to know where you are in the menu.`,
            severity: "serious",
            impact: "litigation",
            effort: "low",
            wcagCriteria: ["2.4.7"],
            path: target.url,
            screenshot: rawData.screenshotBuffer ? "screenshot.png" : undefined,
            codeSnippet:
              rawData.codeSnippet && rawData.codeSnippet.length > 500
                ? rawData.codeSnippet.substring(0, 500) +
                  "\n<!-- ... truncated ... -->"
                : rawData.codeSnippet,
            solution:
              "Remove 'outline: none' CSS or add custom :focus-visible styles with clear visual indicators (border, box-shadow, background change).",
            copilotPrompt: `You are fixing: Missing keyboard focus indicators (WCAG 2.4.7)
Target page: ${target.url}

Navigation links have outline: none with no alternative focus styles.

Requirements:
1. Remove or replace 'outline: none' on navigation links
2. Use :focus-visible for modern focus styling
3. Provide clear visual indicator (3:1 contrast ratio minimum)

Example CSS (choose one approach):

/* Option 1: Remove outline: none entirely */
nav a:focus,
nav button:focus {
  /* Let browser default outline show */
}

/* Option 2: Custom focus-visible style */
nav a:focus-visible,
nav button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  /* Or use box-shadow for rounded appearance */
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.3);
}

/* Option 3: Subtle but visible */
nav a:focus-visible {
  outline: none; /* Only if adding alternative */
  border-bottom: 2px solid currentColor;
  background-color: rgba(0, 0, 0, 0.05);
}

4. Ensure 3:1 contrast with background
5. Test by pressing Tab through navigation
6. Works in all modern browsers with :focus-visible polyfill for old browsers

WCAG Success Criterion: 2.4.7 Focus Visible (Level AA)`,
            rawData: {
              elementsWithoutFocusIndicator: missingFocusIndicators,
              screenshotBuffer: rawData.screenshotBuffer, // Store buffer here for emit to save
              codeSnippet: rawData.codeSnippet,
            },
          });
        }
      }

      // Check 3: Missing ARIA attributes
      if (!hasMissingAriaIssue) {
        const ariaIssues = await page.evaluate(() => {
          const expandableItems = Array.from(
            document.querySelectorAll(
              "nav li:has(ul), nav li:has(.submenu), nav .menu-item:has(.dropdown)"
            )
          );

          const missing = expandableItems.filter((item) => {
            const toggle = item.querySelector("a, button");
            if (!toggle) return false;

            const hasAriaExpanded = toggle.hasAttribute("aria-expanded");
            const hasAriaHaspopup = toggle.hasAttribute("aria-haspopup");
            const hasAriaControls = toggle.hasAttribute("aria-controls");

            return !hasAriaExpanded || !hasAriaHaspopup;
          });

          return missing.length;
        });

        if (ariaIssues > 0) {
          hasMissingAriaIssue = true;
          issues.push({
            id: `mega-menu-missing-aria-${Date.now()}`,
            title: "Navigation Missing ARIA Attributes",
            description: `${ariaIssues} expandable navigation items lack proper ARIA attributes (aria-expanded, aria-haspopup). Screen reader users cannot understand menu structure or state.`,
            severity: "serious",
            impact: "litigation",
            effort: "low",
            wcagCriteria: ["4.1.2"],
            path: target.url,
            solution:
              "Add aria-expanded, aria-haspopup, and aria-controls to all menu toggle buttons. Update aria-expanded dynamically when menus open/close.",
            copilotPrompt: `You are fixing: Missing ARIA attributes on navigation (WCAG 4.1.2)
Target page: ${target.url}

Expandable menu items missing semantic ARIA attributes for screen readers.

Requirements:
1. Add ARIA attributes to menu toggle buttons/links
2. Update aria-expanded when menus open/close
3. Ensure proper roles and labels

Example HTML structure:

<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <button 
        role="menuitem"
        aria-haspopup="true"
        aria-expanded="false"
        aria-controls="products-submenu"
        id="products-button">
        Products
      </button>
      <ul role="menu" id="products-submenu" aria-labelledby="products-button">
        <li role="none">
          <a role="menuitem" href="/product1">Product 1</a>
        </li>
      </ul>
    </li>
  </ul>
</nav>

JavaScript to update state:

toggleButton.addEventListener('click', () => {
  const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
  toggleButton.setAttribute('aria-expanded', !isExpanded);
  submenu.hidden = isExpanded;
});

4. Use role="menubar" for top level, role="menu" for submenus
5. Each interactive element needs role="menuitem"
6. Test with screen reader (NVDA, JAWS, VoiceOver)

WCAG Success Criterion: 4.1.2 Name, Role, Value (Level A)`,
            rawData: {
              itemsMissingAria: ariaIssues,
            },
          });
        }
      }

      // Check 4: Non-semantic navigation structure
      if (!hasNonSemanticNavIssue) {
        const nonSemanticNav = await page.evaluate(() => {
          // Find main navigation links in header
          const headerLinks = Array.from(
            document.querySelectorAll("header a, header button")
          ).filter((el: any) => {
            const rect = el.getBoundingClientRect();
            const text = el.innerText?.trim() || "";
            const href = el.href || "";

            // Filter for likely main nav (not utility)
            const isUtility =
              text.toLowerCase().includes("search") ||
              text.toLowerCase().includes("cart") ||
              text.toLowerCase().includes("account") ||
              text.toLowerCase().includes("login") ||
              href.includes("/account") ||
              href.includes("/cart") ||
              href.includes("/search");

            return (
              rect.top < 300 &&
              text.length > 1 &&
              text.length < 30 &&
              !isUtility
            );
          });

          if (headerLinks.length === 0) return null;

          // Check if these links are inside semantic navigation structure
          const navElements = document.querySelectorAll(
            'nav, [role="navigation"]'
          );
          const hasSemanticNav = navElements.length > 0;

          // Check if main nav links are inside semantic nav
          const linksInSemanticNav = headerLinks.filter(
            (link: any) =>
              link.closest("nav") || link.closest('[role="navigation"]')
          );

          // Check if links have appropriate roles
          const linksWithRoles = headerLinks.filter(
            (link: any) =>
              link.hasAttribute("role") &&
              (link.getAttribute("role") === "menuitem" ||
                link.getAttribute("role") === "link")
          );

          return {
            totalMainNavLinks: headerLinks.length,
            linksInSemanticNav: linksInSemanticNav.length,
            linksWithRoles: linksWithRoles.length,
            hasNavElement: hasSemanticNav,
            percentageOutsideNav: Math.round(
              ((headerLinks.length - linksInSemanticNav.length) /
                headerLinks.length) *
                100
            ),
          };
        });

        // Flag if >50% of main nav links are outside semantic nav structure
        if (nonSemanticNav && nonSemanticNav.percentageOutsideNav > 50) {
          hasNonSemanticNavIssue = true;
          issues.push({
            id: `mega-menu-non-semantic-nav-${Date.now()}`,
            title: "Navigation Uses Non-Semantic HTML Structure",
            description: `${
              nonSemanticNav.percentageOutsideNav
            }% of main navigation links (${
              nonSemanticNav.totalMainNavLinks -
              nonSemanticNav.linksInSemanticNav
            } of ${
              nonSemanticNav.totalMainNavLinks
            }) are not wrapped in semantic <nav> elements or lack proper ARIA roles. This makes it difficult for screen reader users to identify and navigate the main menu.`,
            severity: "serious",
            impact: "litigation",
            effort: "low",
            wcagCriteria: ["1.3.1", "4.1.2"],
            path: target.url,
            solution:
              "Wrap main navigation links in a <nav> element with aria-label, or add role='navigation' to the container. Add role='menuitem' to individual links for better screen reader support.",
            copilotPrompt: `You are fixing: Non-semantic navigation structure (WCAG 1.3.1, 4.1.2)
Target page: ${target.url}

Main navigation links are not wrapped in semantic HTML (<nav> element) or lack ARIA roles.
Current state: ${
              nonSemanticNav.totalMainNavLinks -
              nonSemanticNav.linksInSemanticNav
            } of ${
              nonSemanticNav.totalMainNavLinks
            } links outside semantic structure.

Requirements:
1. Wrap main navigation in a <nav> element with aria-label
2. Add appropriate ARIA roles to navigation items
3. Ensure proper semantic structure for assistive technology

Example HTML structure (Shopify Liquid):

<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar" class="main-menu">
    {% for link in linklists.main-menu.links %}
      <li role="none">
        <a href="{{ link.url }}" role="menuitem" class="main-menu__link">
          {{ link.title }}
        </a>
      </li>
    {% endfor %}
  </ul>
</nav>

Alternative with aria-label for better context:

<header>
  <nav aria-label="Primary">
    <!-- Main product/collection navigation -->
  </nav>
  <nav aria-label="Utility">
    <!-- Search, cart, account links -->
  </nav>
</header>

4. In your Shopify theme's header snippet/section:
   - Locate the main navigation markup (often in sections/header.liquid or snippets/header-nav.liquid)
   - Wrap the navigation links in <nav aria-label="Main navigation">
   - Add role="menuitem" to links if using menubar pattern
   - Keep styles intact by preserving existing classes

5. Benefits:
   - Screen readers can announce "navigation region" when user arrives
   - Users can skip to navigation using screen reader shortcuts
   - Improved semantic meaning and accessibility tree

WCAG Success Criteria: 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)`,
            rawData: nonSemanticNav,
          });
        }
      }

      // Test first few menu items with potential dropdowns
      const itemsToTest = menuItems.slice(0, 5);

      for (let i = 0; i < itemsToTest.length; i++) {
        const item = itemsToTest[i];

        try {
          // Check if item has aria-expanded or aria-haspopup
          const ariaExpanded = await item.getAttribute("aria-expanded");
          const ariaHaspopup = await item.getAttribute("aria-haspopup");

          if (!ariaExpanded && !ariaHaspopup) {
            continue; // Not a dropdown, skip
          }

          // Test keyboard activation
          await item.focus();
          await page.keyboard.press("Enter");
          await page.waitForTimeout(500); // Wait for animation

          // Check if submenu opened
          const expandedAfterEnter = await item.getAttribute("aria-expanded");

          if (expandedAfterEnter !== "true") {
            // Try Space key
            await item.focus();
            await page.keyboard.press("Space");
            await page.waitForTimeout(500);

            const expandedAfterSpace = await item.getAttribute("aria-expanded");

            if (expandedAfterSpace !== "true" && !hasKeyboardOpenIssue) {
              hasKeyboardOpenIssue = true;

              issues.push({
                id: `mega-menu-no-keyboard-open-${Date.now()}`,
                title: "Navigation Menu Not Keyboard Accessible",
                description:
                  "The main navigation menu cannot be opened using only a keyboard (Enter or Space keys). This prevents keyboard-only users from accessing important navigation links.",
                severity: "critical",
                impact: "litigation",
                effort: "medium",
                wcagCriteria: ["2.1.1", "2.1.2"],
                path: target.url,
                solution:
                  "Add keyboard event handlers to navigation menu buttons/links. When Enter or Space is pressed, toggle aria-expanded and show/hide the submenu. Ensure all interactive elements are properly focusable.",
                copilotPrompt: `You are fixing: Navigation menu not keyboard accessible (WCAG 2.1.1, 2.1.2)
Target page: ${target.url}

The dropdown navigation cannot be opened with keyboard (Enter/Space keys).

Requirements:
1. Add keyboard event listeners to menu toggle buttons/links
2. On Enter or Space keypress, toggle aria-expanded attribute
3. Show/hide submenu on keyboard activation
4. Example JavaScript:

   menuButton.addEventListener('keydown', (e) => {
     if (e.key === 'Enter' || e.key === ' ') {
       e.preventDefault();
       const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
       menuButton.setAttribute('aria-expanded', !isExpanded);
       submenu.hidden = isExpanded;
     }
   });

5. Ensure buttons have proper ARIA attributes:
   - aria-expanded="false" (initial state)
   - aria-haspopup="true"
   - aria-controls="submenu-id"

6. In Shopify theme JS, add this to header/navigation section
7. Test by pressing Tab to focus, then Enter to open

WCAG Success Criteria: 2.1.1 Keyboard (Level A), 2.1.2 No Keyboard Trap (Level A)`,
                rawData: {
                  ariaExpanded: expandedAfterSpace,
                  ariaHaspopup,
                  testedKeys: ["Enter", "Space"],
                },
              });
            }
          }

          // Test Escape key to close
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);

          const expandedAfterEscape = await item.getAttribute("aria-expanded");

          if (expandedAfterEscape === "true" && !hasEscapeIssue) {
            hasEscapeIssue = true;

            issues.push({
              id: `mega-menu-no-escape-${Date.now()}`,
              title: "Navigation Cannot Be Closed with Escape Key",
              description:
                "Open navigation menus do not close when the Escape key is pressed. This is a common expectation for keyboard users and part of standard menu accessibility patterns.",
              severity: "serious",
              impact: "litigation",
              effort: "low",
              wcagCriteria: ["2.1.1"],
              path: target.url,
              solution:
                "Add Escape key handler to close open menus and return focus to the trigger button. This improves keyboard navigation efficiency and matches user expectations.",
              copilotPrompt: `You are fixing: Navigation cannot be closed with Escape key (WCAG 2.1.1)
Target page: ${target.url}

Open menus don't close when Escape is pressed.

Requirements:
1. Add Escape key handler to menu containers
2. When Escape is pressed:
   - Close the menu (set aria-expanded="false")
   - Hide the submenu
   - Return focus to the menu button that opened it

3. Example JavaScript:

   document.addEventListener('keydown', (e) => {
     if (e.key === 'Escape') {
       const openMenus = document.querySelectorAll('[aria-expanded="true"]');
       openMenus.forEach(button => {
         button.setAttribute('aria-expanded', 'false');
         const submenuId = button.getAttribute('aria-controls');
         if (submenuId) {
           document.getElementById(submenuId).hidden = true;
         }
         button.focus(); // Return focus
       });
     }
   });

4. Test by opening menu with Enter, then pressing Escape
5. Ensure focus returns to the button that opened the menu

WCAG Success Criterion: 2.1.1 Keyboard (Level A)`,
              rawData: {
                closedOnEscape: false,
              },
            });
          }
        } catch (error) {
          logger.warn(`Error testing menu item ${i}`, error);
        }
      }

      // Count total focusable elements in navigation
      const focusableCount = await page.evaluate(() => {
        const nav = document.querySelector("nav, header");
        if (!nav) return 0;

        const focusable = nav.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return focusable.length;
      });

      if (focusableCount > 30 && !tooManyTabStops) {
        tooManyTabStops = true;

        issues.push({
          id: `mega-menu-too-many-tab-stops-${Date.now()}`,
          title: "Too Many Tab Stops in Navigation",
          description: `The navigation contains ${focusableCount} focusable elements, forcing keyboard users to tab through excessive links to reach main content. This severely impacts usability for keyboard-only users.`,
          severity: "serious",
          impact: "conversion",
          effort: "medium",
          wcagCriteria: ["2.4.1"],
          path: target.url,
          solution:
            "Implement a roving tabindex pattern or collapse submenus by default. Use arrow keys for submenu navigation instead of Tab. Ensure skip-to-content link is present and functional.",
          copilotPrompt: `You are fixing: Too many tab stops in navigation (WCAG 2.4.1)
Target page: ${target.url}

The navigation has ${focusableCount} focusable elements, making keyboard navigation tedious.

Solutions (choose one or combine):

Option 1: Roving Tabindex Pattern
1. Only the first top-level menu item is tabbable (tabindex="0")
2. All other menu items have tabindex="-1"
3. Use arrow keys to navigate between menu items
4. Update tabindex dynamically as user navigates

Option 2: Collapse Submenus by Default
1. Keep submenus hidden until activated
2. Only include top-level items in tab order
3. Use Enter/Space to expand submenus
4. Use arrow keys within expanded submenus

Option 3: Better Skip Link
1. Ensure skip-to-content link is first focusable element
2. Allow users to bypass navigation entirely
3. Consider adding multiple skip links (skip to nav, skip to content, skip to footer)

Example for roving tabindex:

menuItems.forEach((item, index) => {
  item.tabIndex = index === 0 ? 0 : -1;
  
  item.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      const next = menuItems[index + 1];
      if (next) {
        item.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
      }
    }
    // Similar for ArrowLeft, ArrowDown, ArrowUp
  });
});

WCAG Success Criterion: 2.4.1 Bypass Blocks (Level A)`,
          rawData: {
            focusableElementCount: focusableCount,
            threshold: 30,
          },
        });
      }

      // Check for proper focus management within submenus
      if (menuItems.length > 0 && !hasFocusTrapIssue) {
        // Test if focus can move out of navigation naturally
        const firstItem = menuItems[0];
        await firstItem.focus();

        // Try to tab through a few items
        for (let i = 0; i < Math.min(5, menuItems.length); i++) {
          await page.keyboard.press("Tab");
          await page.waitForTimeout(100);
        }

        // Check if we're still stuck in nav
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          const nav = document.querySelector("nav, header");
          return nav?.contains(active) || false;
        });

        // This is actually good if we moved out, but let's note if we detect issues
        logger.info(`Focus still in nav after tabbing: ${focusedElement}`);
      }

      // Check 4: Focus return after closing menu
      if (!hasFocusReturnIssue && menuItems.length > 0) {
        try {
          const testItem = menuItems[0];
          const hasExpanded = await testItem.getAttribute("aria-expanded");

          if (hasExpanded) {
            // Open menu
            await testItem.focus();
            await page.keyboard.press("Enter");
            await page.waitForTimeout(300);

            // Close with Escape
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);

            // Check if focus returned to trigger
            const focusedAfterClose = await page.evaluate(() => {
              return (
                document.activeElement?.getAttribute("aria-expanded") !== null
              );
            });

            if (!focusedAfterClose) {
              hasFocusReturnIssue = true;
              issues.push({
                id: `mega-menu-focus-not-returned-${Date.now()}`,
                title: "Focus Lost When Navigation Menu Closes",
                description:
                  "When a menu is closed (via Escape key), keyboard focus does not return to the button that opened it. Focus is lost to the document body, disorienting keyboard users.",
                severity: "moderate",
                impact: "trust",
                effort: "low",
                wcagCriteria: ["2.4.3"],
                path: target.url,
                solution:
                  "When closing a menu, explicitly move focus back to the trigger button using element.focus(). This maintains proper focus order for keyboard navigation.",
                copilotPrompt: `You are fixing: Focus not returned to trigger when menu closes (WCAG 2.4.3)
Target page: ${target.url}

When Escape closes menu, focus is lost instead of returning to trigger.

Requirements:
1. Store reference to the button that opened the menu
2. When menu closes, return focus to that button
3. Example JavaScript:

   let openedBy = null;

   menuButton.addEventListener('click', () => {
     openedBy = menuButton;
     openMenu();
   });

   function closeMenu() {
     submenu.hidden = true;
     menuButton.setAttribute('aria-expanded', 'false');
     
     if (openedBy) {
       openedBy.focus(); // Return focus
       openedBy = null;
     }
   }

   document.addEventListener('keydown', (e) => {
     if (e.key === 'Escape' && isMenuOpen) {
       closeMenu();
     }
   });

4. Also applies to click-outside-to-close behavior
5. Test: Open menu, press Escape, verify focus on trigger button

WCAG Success Criterion: 2.4.3 Focus Order (Level A)`,
                rawData: {
                  focusReturnedToTrigger: false,
                },
              });
            }
          }
        } catch (error) {
          logger.warn("Error testing focus return", error);
        }
      }

      // Check 5: Mobile hamburger keyboard accessibility
      if (!hasMobileHamburgerIssue) {
        const hamburgerIssue = await page.evaluate(() => {
          const hamburger = document.querySelector(
            'button.hamburger, button.menu-toggle, button[aria-label*="menu" i], .mobile-menu-toggle, [class*="hamburger"], [class*="menu-icon"]'
          );

          if (!hamburger) return null;

          const isButton = hamburger.tagName === "BUTTON";
          const hasTabindex = hamburger.hasAttribute("tabindex");
          const tabindexValue = hamburger.getAttribute("tabindex");
          const isKeyboardAccessible =
            isButton || (hasTabindex && tabindexValue !== "-1");

          return {
            exists: true,
            isKeyboardAccessible,
            element: hamburger.outerHTML.substring(0, 200),
          };
        });

        if (hamburgerIssue?.exists && !hamburgerIssue.isKeyboardAccessible) {
          hasMobileHamburgerIssue = true;
          issues.push({
            id: `mega-menu-hamburger-not-accessible-${Date.now()}`,
            title: "Mobile Menu Button Not Keyboard Accessible",
            description:
              "The mobile hamburger menu button is not keyboard accessible. It may be a <div> or <span> instead of a <button>, preventing keyboard users from opening the mobile menu.",
            severity: "critical",
            impact: "conversion",
            effort: "low",
            wcagCriteria: ["2.1.1", "4.1.2"],
            path: target.url,
            solution:
              "Convert mobile menu toggle to a proper <button> element or add tabindex='0' and keyboard event handlers (Enter/Space). Use semantic HTML for better accessibility.",
            copilotPrompt: `You are fixing: Mobile menu not keyboard accessible (WCAG 2.1.1, 4.1.2)
Target page: ${target.url}

Hamburger menu button is not keyboard accessible (not a button element).

Requirements:
1. Use <button> element for menu toggle
2. Add proper ARIA attributes
3. Handle keyboard events

Example fix:

<!-- Before (inaccessible) -->
<div class="hamburger-menu" onclick="toggleMenu()">
  <span></span><span></span><span></span>
</div>

<!-- After (accessible) -->
<button 
  class="hamburger-menu" 
  aria-label="Toggle navigation menu"
  aria-expanded="false"
  aria-controls="mobile-nav">
  <span></span><span></span><span></span>
</button>

JavaScript:
const hamburger = document.querySelector('.hamburger-menu');
const mobileNav = document.getElementById('mobile-nav');

hamburger.addEventListener('click', toggleMenu);
hamburger.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleMenu();
  }
});

function toggleMenu() {
  const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
  hamburger.setAttribute('aria-expanded', !isExpanded);
  mobileNav.hidden = isExpanded;
}

4. Ensure button is visible and focusable
5. Test with Tab key on mobile viewport
6. Screen reader should announce "Toggle navigation menu, button"

WCAG Success Criteria: 2.1.1 Keyboard (Level A), 4.1.2 Name, Role, Value (Level A)`,
            rawData: hamburgerIssue,
          });
        }
      }

      // Check 6: Arrow key navigation
      if (!hasArrowKeyNavigationIssue && menuItems.length > 1) {
        try {
          // Test if arrow keys work for navigation
          const firstItem = menuItems[0];
          await firstItem.focus();

          const firstItemHasFocus = await page.evaluate(() => {
            const active = document.activeElement;
            return (
              active?.getAttribute("aria-haspopup") !== null ||
              active?.getAttribute("aria-expanded") !== null
            );
          });

          if (firstItemHasFocus) {
            // Try arrow right
            await page.keyboard.press("ArrowRight");
            await page.waitForTimeout(100);

            const movedToNext = await page.evaluate(() => {
              const active = document.activeElement;
              return (
                active?.getAttribute("aria-haspopup") !== null ||
                active?.getAttribute("aria-expanded") !== null
              );
            });

            // If focus didn't move with arrow keys, it's likely Tab-only
            if (!movedToNext) {
              hasArrowKeyNavigationIssue = true;
              issues.push({
                id: `mega-menu-no-arrow-keys-${Date.now()}`,
                title: "Navigation Doesn't Support Arrow Key Navigation",
                description:
                  "The navigation menu only supports Tab key for navigation, not arrow keys. Standard menu pattern expects Left/Right arrows for horizontal menus and Up/Down for vertical menus.",
                severity: "moderate",
                impact: "trust",
                effort: "medium",
                wcagCriteria: ["2.1.1"],
                path: target.url,
                solution:
                  "Implement arrow key navigation: Right/Down to move forward, Left/Up to move backward. This follows ARIA menubar pattern and improves keyboard UX.",
                copilotPrompt: `You are fixing: No arrow key navigation in menu (WCAG 2.1.1)
Target page: ${target.url}

Menu only responds to Tab, not arrow keys (expected pattern).

Requirements:
1. Implement arrow key handlers for menu navigation
2. Right/Down arrow: move to next item
3. Left/Up arrow: move to previous item
4. Home: jump to first item
5. End: jump to last item

Example JavaScript:

const menuItems = Array.from(document.querySelectorAll('nav [role="menuitem"]'));
let currentIndex = 0;

menuItems.forEach((item, index) => {
  item.addEventListener('keydown', (e) => {
    let newIndex = index;
    
    switch(e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = (index + 1) % menuItems.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = (index - 1 + menuItems.length) % menuItems.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = menuItems.length - 1;
        break;
      default:
        return;
    }
    
    menuItems[newIndex].focus();
    currentIndex = newIndex;
  });
});

6. Consider roving tabindex: only current item has tabindex="0"
7. Test with screen reader (announces properly as menu navigation)

WCAG Success Criterion: 2.1.1 Keyboard (Level A)`,
                rawData: {
                  arrowKeysWork: false,
                  testedKeys: ["ArrowRight"],
                },
              });
            }
          }
        } catch (error) {
          logger.warn("Error testing arrow key navigation", error);
        }
      }

      // Check 7: Hover timeout (simple detection)
      if (!hasHoverTimeoutIssue) {
        const hasHoverTimeout = await page.evaluate(() => {
          // Look for CSS transitions that might indicate quick disappearing menus
          const menuItems = Array.from(
            document.querySelectorAll("nav li, nav .menu-item")
          );
          const hasQuickTransition = menuItems.some((item) => {
            const submenu = item.querySelector("ul, .submenu, .dropdown");
            if (!submenu) return false;

            const styles = window.getComputedStyle(submenu);
            const transition = styles.transition;

            // Check for very fast transitions (< 200ms) which might indicate timeout issues
            const match = transition.match(/(\d+\.?\d*)m?s/);
            if (match) {
              const duration = parseFloat(match[1]);
              const unit = match[0].includes("ms") ? 1 : 1000;
              const ms = duration * unit;

              // If transition is very fast, might disappear too quickly
              return ms < 200 && styles.display !== "block";
            }
            return false;
          });

          return hasQuickTransition;
        });

        if (hasHoverTimeout) {
          hasHoverTimeoutIssue = true;
          issues.push({
            id: `mega-menu-hover-timeout-${Date.now()}`,
            title: "Navigation Menu Disappears Too Quickly on Hover",
            description:
              "Submenus have very short hover timeouts, making them difficult to reach for users with motor impairments or less precise pointing devices.",
            severity: "moderate",
            impact: "conversion",
            effort: "low",
            wcagCriteria: ["2.5.5"],
            path: target.url,
            solution:
              "Add a hover delay before closing menus (300-500ms recommended). Consider adding a 'safe zone' triangle between trigger and submenu so mouse can move freely without menu closing.",
            copilotPrompt: `You are fixing: Menu disappears too quickly on hover (WCAG 2.5.5)
Target page: ${target.url}

Menus close too fast when mouse leaves, frustrating for motor impairment users.

Requirements:
1. Add delay before closing menu on mouse leave
2. Implement safe triangle/path to submenu
3. Recommended timeout: 300-500ms

Example JavaScript:

let closeTimeout = null;

menuItem.addEventListener('mouseenter', () => {
  clearTimeout(closeTimeout);
  openSubmenu();
});

menuItem.addEventListener('mouseleave', () => {
  closeTimeout = setTimeout(() => {
    closeSubmenu();
  }, 400); // 400ms delay
});

// Also handle submenu hover
submenu.addEventListener('mouseenter', () => {
  clearTimeout(closeTimeout);
});

submenu.addEventListener('mouseleave', () => {
  closeTimeout = setTimeout(() => {
    closeSubmenu();
  }, 400);
});

4. Alternative: Use click to open/close instead of hover
5. Test with slow mouse movements and shaky hands
6. Ensure keyboard users can still access without delay

WCAG Success Criterion: 2.5.5 Target Size (Level AAA) - relates to motor control`,
            rawData: {
              detectedQuickTransition: true,
            },
          });
        }
      }

      // ==================================================================
      // SCREEN READER SUPPORT CHECKS
      // ==================================================================

      // Check 8: Missing alt text on navigation images
      const missingAltImages = await page.evaluate(() => {
        const navImages = Array.from(
          document.querySelectorAll("nav img, header img")
        );
        const issues = navImages.filter((img) => {
          const alt = img.getAttribute("alt");
          const ariaLabel = img.getAttribute("aria-label");
          const ariaLabelledby = img.getAttribute("aria-labelledby");

          // Missing alt entirely or alt is empty/whitespace
          const hasNoAlt = !alt || alt.trim() === "";
          // No alternative labeling mechanism
          const hasNoLabel = !ariaLabel && !ariaLabelledby;
          // Not decorative (role="presentation" or alt="")
          const notMarkedDecorative =
            img.getAttribute("role") !== "presentation" && alt !== "";

          return hasNoAlt && hasNoLabel;
        });

        return {
          count: issues.length,
          examples: issues.slice(0, 3).map((img) => ({
            src: (img as HTMLImageElement).src,
            alt: img.getAttribute("alt"),
            context: img.parentElement?.tagName || "unknown",
          })),
        };
      });

      if (missingAltImages.count > 0) {
        // Capture screenshot with annotation for missing alt text
        const altTextRawData: {
          screenshotBuffer?: Buffer;
          examples: typeof missingAltImages.examples;
          count: number;
        } = {
          examples: missingAltImages.examples,
          count: missingAltImages.count,
        };

        try {
          // Use the helper to annotate the first visible image missing alt text
          const annotationResult = await annotateElement(page, {
            containerLocator: nav,
            selector: "img",
            labelText: "❌ Missing alt text",
            annotationType: "missing-alt",
            filter: (el: Element) => {
              const img = el as HTMLImageElement;
              const alt = img.getAttribute("alt");
              const ariaLabel = img.getAttribute("aria-label");
              const ariaLabelledby = img.getAttribute("aria-labelledby");

              const hasNoAlt = !alt || alt.trim() === "";
              const hasNoLabel = !ariaLabel && !ariaLabelledby;

              return hasNoAlt && hasNoLabel;
            },
            waitAfterAnnotation: 1500,
          });

          if (annotationResult) {
            altTextRawData.screenshotBuffer = annotationResult.screenshotBuffer;
            logger.info(
              "Alt text annotation captured",
              annotationResult.elementInfo
            );
          } else {
            logger.warn(
              "Could not annotate missing alt text - no suitable image found"
            );
          }
        } catch (err) {
          logger.warn("Failed to capture alt text screenshot", {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        issues.push({
          id: `mega-menu-missing-alt-text-${Date.now()}`,
          title: "Navigation Images Missing Alt Text",
          description: `${missingAltImages.count} images in the navigation lack alt text. Screen reader users cannot understand what these images represent (likely logos, category icons, or promotional banners).`,
          severity: "serious",
          impact: "litigation",
          effort: "low",
          wcagCriteria: ["1.1.1"],
          path: target.url,
          screenshot: altTextRawData.screenshotBuffer
            ? "screenshot.png"
            : undefined,
          solution:
            "Add descriptive alt attributes to all navigation images. Use alt='' for purely decorative images with role='presentation'.",
          copilotPrompt: `You are fixing: Missing alt text on navigation images (WCAG 1.1.1)
Target page: ${target.url}

${missingAltImages.count} images in navigation have no alt text.

Requirements:
1. Add alt text to all meaningful images
2. Use empty alt (alt="") for decorative images
3. Be descriptive but concise

Example fixes:

<!-- Logo -->
<img src="logo.png" alt="Company Name - Home">

<!-- Category image -->
<img src="category-bags.jpg" alt="Shop Handbags">

<!-- Decorative separator -->
<img src="divider.png" alt="" role="presentation">

<!-- Icon with adjacent text -->
<img src="search-icon.svg" alt="Search" aria-hidden="true">
<span>Search</span>

Guidelines:
- Logo: Include brand name + purpose ("Home" or "Homepage")
- Category images: "Shop [Category]" or "[Category] Collection"
- Icons with text: Use aria-hidden="true" on icon, let text speak
- Purely decorative: alt="" AND role="presentation"
- Informative: Describe what user sees/clicks

Common mistakes to avoid:
❌ alt="image" or alt="banner" (not descriptive)
❌ Missing alt entirely (screen reader reads filename)
❌ alt="Click here" (redundant with link)

WCAG Success Criterion: 1.1.1 Non-text Content (Level A)`,
          rawData: {
            ...altTextRawData,
            screenshotBuffer: altTextRawData.screenshotBuffer,
          },
        });
      }

      // Check 9: Empty links/buttons (icon-only without accessible text)
      const emptyInteractive = await page.evaluate(() => {
        const interactive = Array.from(
          document.querySelectorAll("nav a, nav button")
        );
        const empty = interactive.filter((el) => {
          const textContent = el.textContent?.trim() || "";
          const ariaLabel = el.getAttribute("aria-label");
          const ariaLabelledby = el.getAttribute("aria-labelledby");
          const title = el.getAttribute("title");

          // Has visible text
          const hasText = textContent.length > 0;
          // Has accessible name
          const hasAccessibleName = ariaLabel || ariaLabelledby || title;

          // Empty if no text AND no accessible name
          return !hasText && !hasAccessibleName;
        });

        return {
          count: empty.length,
          examples: empty.slice(0, 3).map((el) => ({
            tag: el.tagName.toLowerCase(),
            href: el.getAttribute("href"),
            class: el.className,
            innerHTML: el.innerHTML.substring(0, 100),
          })),
        };
      });

      if (emptyInteractive.count > 0) {
        // Capture screenshot with annotation for empty links/buttons
        const emptyLinksRawData: {
          screenshotBuffer?: Buffer;
          examples: typeof emptyInteractive.examples;
          count: number;
        } = {
          examples: emptyInteractive.examples,
          count: emptyInteractive.count,
        };

        try {
          // Try to expand the first mega menu to reveal hidden empty links
          await page.evaluate(() => {
            const menuTriggers = Array.from(
              document.querySelectorAll(
                'nav a, nav button, [class*="menu"] a, [class*="menu"] button'
              )
            );
            // Find and hover the first menu item with a dropdown
            const trigger = menuTriggers.find((el) =>
              el.hasAttribute("aria-haspopup")
            );
            if (trigger) {
              (trigger as HTMLElement).dispatchEvent(
                new MouseEvent("mouseenter", { bubbles: true })
              );
            }
          });

          // Wait for menu to open
          await page.waitForTimeout(500);

          // Use the helper to annotate the first visible empty link/button
          const annotationResult = await annotateElement(page, {
            selector: "nav a, nav button, header a, header button",
            labelText: "❌ No accessible text",
            annotationType: "empty-link",
            filter: (el: Element) => {
              const textContent = (el as HTMLElement).textContent?.trim() || "";
              const ariaLabel = el.getAttribute("aria-label");
              const ariaLabelledby = el.getAttribute("aria-labelledby");
              const title = el.getAttribute("title");

              const hasText = textContent.length > 0;
              const hasAccessibleName = ariaLabel || ariaLabelledby || title;

              // Must be empty
              if (hasText || hasAccessibleName) return false;

              // Must be visible (not hidden, display:none, or zero-size)
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              const isVisible =
                rect.width > 0 &&
                rect.height > 0 &&
                styles.display !== "none" &&
                styles.visibility !== "hidden" &&
                parseFloat(styles.opacity || "1") > 0.1;

              return isVisible;
            },
            waitAfterAnnotation: 1500,
          });

          if (annotationResult) {
            emptyLinksRawData.screenshotBuffer =
              annotationResult.screenshotBuffer;
            logger.info(
              "Empty link annotation captured",
              annotationResult.elementInfo
            );
          } else {
            logger.warn(
              "Could not annotate empty link - no suitable element found"
            );
          }
        } catch (err) {
          logger.warn("Failed to capture empty link screenshot", {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        issues.push({
          id: `mega-menu-empty-links-${Date.now()}`,
          title: "Navigation Has Empty Links/Buttons",
          description: `${emptyInteractive.count} navigation links or buttons have no accessible text. Screen reader users hear nothing or just "link" / "button" without knowing the purpose.`,
          severity: "serious",
          impact: "litigation",
          effort: "low",
          wcagCriteria: ["2.4.4", "4.1.2"],
          path: target.url,
          screenshot: emptyLinksRawData.screenshotBuffer
            ? "screenshot.png"
            : undefined,
          solution:
            "Add aria-label, aria-labelledby, or visible text to all interactive elements. Never rely solely on icons without text alternatives.",
          copilotPrompt: `You are fixing: Empty links/buttons in navigation (WCAG 2.4.4, 4.1.2)
Target page: ${target.url}

${emptyInteractive.count} navigation elements have no accessible text (icon-only).

Requirements:
1. Add aria-label for screen reader text
2. Or add visually-hidden text span
3. Or make icon text visible

Example fixes:

<!-- Option 1: aria-label -->
<button aria-label="Open shopping cart">
  <svg>...</svg>
</button>

<!-- Option 2: Visually hidden text -->
<a href="/cart">
  <svg aria-hidden="true">...</svg>
  <span class="sr-only">Shopping Cart</span>
</a>

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border-width: 0;
}

<!-- Option 3: Visible text + icon -->
<button>
  <svg aria-hidden="true">...</svg>
  Menu
</button>

Common icon-only patterns to fix:
- 🛒 Cart button: aria-label="Shopping cart"
- 🔍 Search button: aria-label="Search products"
- ☰ Hamburger menu: aria-label="Open navigation menu"
- 👤 Account icon: aria-label="My account"
- ❤️ Wishlist: aria-label="Wishlist"

WCAG Success Criteria: 2.4.4 Link Purpose (Level A), 4.1.2 Name, Role, Value (Level A)`,
          rawData: {
            ...emptyLinksRawData,
            screenshotBuffer: emptyLinksRawData.screenshotBuffer,
          },
        });
      }

      // Check 10: Form inputs missing labels (search in nav)
      const unlabeledInputs = await page.evaluate(() => {
        const inputs = Array.from(
          document.querySelectorAll("nav input, header input")
        );
        const unlabeled = inputs.filter((input) => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const ariaLabel = input.getAttribute("aria-label");
          const ariaLabelledby = input.getAttribute("aria-labelledby");
          const title = input.getAttribute("title");

          return !hasLabel && !ariaLabel && !ariaLabelledby && !title;
        });

        return {
          count: unlabeled.length,
          examples: unlabeled.slice(0, 3).map((input) => ({
            type: (input as HTMLInputElement).type,
            placeholder: (input as HTMLInputElement).placeholder,
            name: (input as HTMLInputElement).name,
            id: input.id,
          })),
        };
      });

      if (unlabeledInputs.count > 0) {
        issues.push({
          id: `mega-menu-unlabeled-inputs-${Date.now()}`,
          title: "Search Input Missing Label",
          description: `${unlabeledInputs.count} form input(s) in navigation lack proper labels. Screen reader users don't know what to enter. This commonly affects search bars in the header.`,
          severity: "serious",
          impact: "conversion",
          effort: "low",
          wcagCriteria: ["1.3.1", "3.3.2", "4.1.2"],
          path: target.url,
          solution:
            "Add <label> elements or aria-label attributes to all form inputs. Never rely solely on placeholder text, which disappears when typing.",
          copilotPrompt: `You are fixing: Form inputs missing labels in navigation (WCAG 1.3.1, 3.3.2, 4.1.2)
Target page: ${target.url}

${unlabeledInputs.count} input(s) in navigation have no accessible label (likely search box).

Requirements:
1. Add proper label or aria-label
2. Don't rely on placeholder as label
3. Ensure label is programmatically associated

Example fixes:

<!-- Option 1: Visible label with for/id association -->
<label for="search-input">Search</label>
<input type="search" id="search-input" placeholder="Search products...">

<!-- Option 2: aria-label (no visible label) -->
<input 
  type="search" 
  aria-label="Search products" 
  placeholder="Search products...">

<!-- Option 3: Visually hidden label -->
<label for="search" class="sr-only">Search our store</label>
<input type="search" id="search" placeholder="Search products...">

<!-- Option 4: Label wrapping input -->
<label>
  <span class="sr-only">Search</span>
  <input type="search" placeholder="Search products...">
</label>

Why placeholder is NOT enough:
- Disappears when user types
- Low contrast (often gray)
- Screen readers may skip it
- Not a replacement for <label>

Common navigation inputs:
- Search: aria-label="Search products" or "Search our store"
- Email signup: <label>Email address</label>
- Quantity: <label>Quantity</label>

WCAG Success Criteria: 1.3.1 Info and Relationships (Level A), 3.3.2 Labels or Instructions (Level A), 4.1.2 Name, Role, Value (Level A)`,
          rawData: unlabeledInputs,
        });
      }

      // ==================================================================
      // CONVERSION/USABILITY CHECKS
      // ==================================================================

      // Check 11: Color contrast on navigation text
      const contrastIssues = await page.evaluate(() => {
        const textElements = Array.from(
          document.querySelectorAll("nav a, nav button, nav span")
        );
        const lowContrast = textElements.filter((el) => {
          const styles = window.getComputedStyle(el);
          const color = styles.color;
          const bgColor = styles.backgroundColor;
          const fontSize = parseFloat(styles.fontSize);

          // Simple heuristic: if background is transparent, check parent
          if (bgColor === "rgba(0, 0, 0, 0)" || bgColor === "transparent") {
            return false; // Skip complex contrast calculation for now
          }

          // Parse RGB values
          const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          const bgMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

          if (!colorMatch || !bgMatch) return false;

          const textRgb = [
            parseInt(colorMatch[1]),
            parseInt(colorMatch[2]),
            parseInt(colorMatch[3]),
          ];
          const bgRgb = [
            parseInt(bgMatch[1]),
            parseInt(bgMatch[2]),
            parseInt(bgMatch[3]),
          ];

          // Calculate relative luminance
          const getLuminance = (rgb: number[]) => {
            const [r, g, b] = rgb.map((val) => {
              const sRGB = val / 255;
              return sRGB <= 0.03928
                ? sRGB / 12.92
                : Math.pow((sRGB + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };

          const textLum = getLuminance(textRgb);
          const bgLum = getLuminance(bgRgb);

          const ratio =
            (Math.max(textLum, bgLum) + 0.05) /
            (Math.min(textLum, bgLum) + 0.05);

          // WCAG AA requires 4.5:1 for normal text, 3:1 for large (18pt+ or 14pt+ bold)
          const isLargeText =
            fontSize >= 18 || (fontSize >= 14 && styles.fontWeight >= "700");
          const requiredRatio = isLargeText ? 3 : 4.5;

          return ratio < requiredRatio;
        });

        return {
          count: lowContrast.length,
          // Don't include too much detail to keep it simple
        };
      });

      if (contrastIssues.count > 0) {
        issues.push({
          id: `mega-menu-low-contrast-${Date.now()}`,
          title: "Navigation Text Has Low Color Contrast",
          description: `${contrastIssues.count} navigation text elements have insufficient color contrast, making them difficult to read for users with low vision or in bright lighting conditions.`,
          severity: "serious",
          impact: "conversion",
          effort: "low",
          wcagCriteria: ["1.4.3"],
          path: target.url,
          solution:
            "Increase text color contrast to meet WCAG AA standards: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold).",
          copilotPrompt: `You are fixing: Low color contrast in navigation text (WCAG 1.4.3)
Target page: ${target.url}

${contrastIssues.count} navigation text elements fail WCAG AA contrast requirements.

Requirements:
1. Normal text (< 18pt): minimum 4.5:1 contrast ratio
2. Large text (18pt+ or 14pt+ bold): minimum 3:1 contrast ratio
3. Test with online contrast checker

How to fix:

Step 1: Identify current colors
- Use browser DevTools to find text color and background color
- Example: color: #999 on background: #fff

Step 2: Check contrast ratio
- Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Enter foreground and background colors
- Verify it meets AA standard

Step 3: Adjust colors
Option A: Darken text color
  - #999 → #767676 (4.5:1 on white)
  - #ccc → #757575 (4.54:1 on white)

Option B: Darken background
  - White → light gray (#f5f5f5)
  - Adjust text accordingly

Option C: Increase font weight
  - If text is 18pt+, only need 3:1
  - font-weight: 600 or 700

Example CSS fixes:

/* Before (fails) */
nav a {
  color: #999; /* 2.85:1 - FAILS */
}

/* After (passes) */
nav a {
  color: #767676; /* 4.54:1 - PASSES AA */
}

/* Alternative: Make text larger and bolder */
nav a {
  color: #999;
  font-size: 18px;
  font-weight: 600;
  /* Now only needs 3:1, which #999 doesn't meet,
     so still use #767676 or darker */
}

Common fixes:
- Light gray on white: #767676 or darker
- Dark text on colored bg: test each combination
- Link blue: #0066cc has good contrast on white

Tools:
- WebAIM Contrast Checker
- Chrome DevTools Accessibility panel
- Stark plugin for Figma/browsers

WCAG Success Criterion: 1.4.3 Contrast (Minimum) (Level AA)`,
          rawData: contrastIssues,
        });
      }

      // Check 12: Touch target size - REMOVED
      // This check was causing issues with mobile menu detection and overlapping with search modals.
      // Consider re-implementing as a separate, more robust check in the future.

      // Check 13: Landmark roles missing
      const landmarkIssues = await page.evaluate(() => {
        // Check for semantic landmarks
        const hasNav =
          document.querySelector('nav, [role="navigation"]') !== null;
        const hasMain = document.querySelector('main, [role="main"]') !== null;
        const navElement = document.querySelector(
          'header nav, header [role="navigation"], [class*="header"] nav, [class*="header"] [role="navigation"]'
        );

        const issues = [];

        // Check if navigation exists but lacks semantic role
        if (navElement) {
          const isNav = navElement.tagName.toLowerCase() === "nav";
          const hasRole = navElement.hasAttribute("role");

          if (
            !isNav &&
            (!hasRole || navElement.getAttribute("role") !== "navigation")
          ) {
            issues.push({
              type: "nav-missing-role",
              element: navElement.tagName.toLowerCase(),
              classes: navElement.className,
            });
          }
        }

        return {
          hasNavLandmark: hasNav,
          hasMainLandmark: hasMain,
          issues: issues,
          navElement: navElement
            ? {
                tag: navElement.tagName.toLowerCase(),
                role: navElement.getAttribute("role"),
                hasAriaLabel: navElement.hasAttribute("aria-label"),
              }
            : null,
        };
      });

      if (!landmarkIssues.hasNavLandmark || landmarkIssues.issues.length > 0) {
        issues.push({
          id: `mega-menu-missing-landmarks-${Date.now()}`,
          title: "Navigation Missing Semantic Landmark Roles",
          description: `Navigation lacks proper semantic HTML landmarks. Screen reader users rely on landmarks (<nav>, <main>, role="navigation") to quickly navigate page sections. ${
            !landmarkIssues.hasNavLandmark ? "No <nav> element found." : ""
          } ${
            landmarkIssues.issues.length > 0
              ? `${landmarkIssues.issues.length} navigation elements lack proper roles.`
              : ""
          }`,
          severity: "serious",
          impact: "trust",
          effort: "low",
          wcagCriteria: ["1.3.1", "2.4.1"],
          path: target.url,
          solution:
            "Use semantic <nav> element for navigation, <main> for main content, or add role='navigation' to existing elements. Add aria-label to distinguish multiple navigation landmarks.",
          copilotPrompt: `You are fixing: Missing semantic landmark roles (WCAG 1.3.1, 2.4.1)
Target page: ${target.url}

Navigation lacks semantic landmarks for screen reader navigation.

Requirements:
1. Use <nav> element for main navigation
2. Add role="navigation" if can't change HTML element
3. Use aria-label to distinguish multiple nav landmarks
4. Ensure <main> landmark exists for main content

Example fixes:

<!-- Best: Semantic HTML -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
  </ul>
</nav>

<main>
  <!-- Page content -->
</main>

<!-- If can't change element: Add role -->
<div role="navigation" aria-label="Main navigation">
  <ul>...</ul>
</div>

<!-- Multiple navigation landmarks -->
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Footer navigation">...</nav>
<nav aria-label="Account menu">...</nav>

<!-- Common landmark structure -->
<header>
  <nav aria-label="Main navigation">...</nav>
</header>

<main>
  <nav aria-label="Breadcrumb">...</nav>
  <!-- Main content -->
</main>

<footer>
  <nav aria-label="Footer navigation">...</nav>
</footer>

Why landmarks matter:
- Screen reader shortcuts (R for regions, N for next navigation)
- Users can skip directly to main content
- Improves navigation efficiency
- Required for accessibility compliance

Test:
1. Install screen reader (NVDA, JAWS, VoiceOver)
2. Press R or navigate by landmarks
3. Verify all major sections have proper roles
4. Ensure aria-labels distinguish multiple navs

Current state: ${JSON.stringify(landmarkIssues, null, 2)}

WCAG Success Criteria:
- 1.3.1 Info and Relationships (Level A) - Semantic structure
- 2.4.1 Bypass Blocks (Level A) - Skip navigation mechanisms`,
          rawData: landmarkIssues,
        });
      }

      // Check 17: Non-descriptive link text
      const nonDescriptiveLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("nav a, header a"));
        const vague = [
          "click here",
          "read more",
          "learn more",
          "here",
          "more",
          "link",
          "click",
        ];

        const problematic = links.filter((link) => {
          const text = (link.textContent || "").trim().toLowerCase();
          const ariaLabel = (
            link.getAttribute("aria-label") || ""
          ).toLowerCase();
          const effectiveText = ariaLabel || text;

          // Check if text is vague
          return vague.some((phrase) => {
            // Exact match or very close (just "click here" or "read more info")
            return (
              effectiveText === phrase ||
              effectiveText === `${phrase} info` ||
              effectiveText.startsWith(`${phrase} -`) ||
              (effectiveText.length < 15 && effectiveText.includes(phrase))
            );
          });
        });

        return {
          count: problematic.length,
          examples: problematic.slice(0, 5).map((link) => ({
            text: link.textContent?.trim() || "",
            ariaLabel: link.getAttribute("aria-label"),
            href: link.getAttribute("href"),
          })),
        };
      });

      if (nonDescriptiveLinks.count > 0) {
        issues.push({
          id: `mega-menu-vague-link-text-${Date.now()}`,
          title: "Navigation Links Have Vague Text",
          description: `${nonDescriptiveLinks.count} navigation links use vague text like "Click here", "Read more", or "Learn more". Screen reader users navigating by links cannot understand the destination or purpose without context.`,
          severity: "moderate",
          impact: "conversion",
          effort: "low",
          wcagCriteria: ["2.4.4"],
          path: target.url,
          solution:
            "Replace vague link text with descriptive phrases that make sense out of context. The link text alone should convey the destination or action.",
          copilotPrompt: `You are fixing: Vague link text in navigation (WCAG 2.4.4)
Target page: ${target.url}

${
  nonDescriptiveLinks.count
} links use generic text that doesn't describe the destination.

Requirements:
1. Make link text descriptive and self-explanatory
2. Link purpose should be clear from text alone
3. Avoid "Click here", "Read more", "Learn more"
4. Include destination or action in link text

❌ BEFORE (vague):
<a href="/products">Click here</a> to see our products
<a href="/blog/article">Read more</a>
<a href="/about">Learn more</a>

✅ AFTER (descriptive):
<a href="/products">Shop all products</a>
<a href="/blog/article">Read: 5 Tips for Better Sleep</a>
<a href="/about">About our company</a>

Pattern examples:

<!-- Product categories -->
❌ <a href="/mens">Click here</a>
✅ <a href="/mens">Shop Men's Collection</a>

<!-- Call to action -->
❌ <a href="/sale">Learn more</a>
✅ <a href="/sale">View sale items</a>

<!-- Blog/article links -->
❌ <a href="/blog/post">Read more</a>
✅ <a href="/blog/post">Read: [Article Title]</a>

<!-- If design requires "more" button -->
<h3>Summer Collection</h3>
<p>New arrivals for warm weather...</p>
✅ <a href="/summer">Shop summer collection</a>
<!-- OR use aria-label -->
✅ <a href="/summer" aria-label="Shop summer collection">Learn more</a>

Why this matters:
- Screen reader users navigate by links list
- Link text out of context must make sense
- Improves SEO (descriptive anchor text)
- Better UX for everyone

Screen reader link list example:
Instead of hearing:
  "Click here, link"
  "Read more, link"  
  "Learn more, link"

User hears:
  "Shop Men's Collection, link"
  "View Sale Items, link"
  "About Our Company, link"

Examples found: ${JSON.stringify(nonDescriptiveLinks.examples, null, 2)}

WCAG Success Criterion: 2.4.4 Link Purpose (In Context) - Level A`,
          rawData: nonDescriptiveLinks,
        });
      }

      if (issues.length === 0) {
        logger.info("Navigation keyboard accessibility looks good", {
          url: target.url,
          focusableCount,
        });
      }
    } catch (error) {
      logger.error("Error checking mega menu navigation", error);
    }

    return issues;
  },
};
