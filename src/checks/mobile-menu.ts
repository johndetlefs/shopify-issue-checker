/**
 * Mobile menu accessibility and usability checks
 *
 * Tests mobile navigation menu for common WCAG and conversion issues:
 * 1. Touch target size (WCAG 2.5.5)
 * 2. Hamburger keyboard accessibility (WCAG 2.1.1, 4.1.2)
 * 3. Focus trap when menu is open (WCAG 2.4.3)
 * 4. Escape key handler (WCAG 2.1.1, 2.1.2)
 * 5. Color contrast (WCAG 1.4.3)
 */

import { Check, CheckContext, Issue } from "../types";
import { logger } from "../core/logger";
import { withCleanup } from "../core/check-utils";
import {
  findMobileNav,
  openMobileNav,
  closeMobileNav,
  isMobileNavOpen,
  dismissPopups,
} from "../core/find-mobile-nav";
import { dismissPopupsWithGuards } from "../core/popup-guard";
import { annotateElement } from "../core/annotation-utils";

type DesiredNavState = "open" | "closed";

async function ensureMobileNavReady(
  page: any,
  mobileNav: any,
  label: string,
  desiredState: DesiredNavState = "open"
): Promise<void> {
  const guards =
    desiredState === "open"
      ? [
          {
            name: "mobile navigation drawer",
            isOpen: () => isMobileNavOpen(mobileNav),
            open: () => openMobileNav(mobileNav),
            waitAfterOpenMs: 600,
          },
        ]
      : [];

  await dismissPopupsWithGuards(page, guards, { label });

  if (desiredState === "closed") {
    const stillOpen = await isMobileNavOpen(mobileNav);
    if (stillOpen) {
      logger.info("Closing mobile nav for closed-state check...");
      await closeMobileNav(mobileNav);
      await page.waitForTimeout(400);
    }
  }
}

export const mobileMenuCheck: Check = {
  name: "mobile-menu",

  async run(context: CheckContext): Promise<Issue[]> {
    const { page, target } = context;
    const originalViewport = page.viewportSize() ?? {
      width: 1280,
      height: 720,
    };

    try {
      // Wrap entire check in cleanup wrapper
      return await withCleanup(page, async () => {
        const issues: Issue[] = [];

        try {
          logger.info(`Checking mobile menu on ${target.label}`);

          // Set mobile viewport
          await page.setViewportSize({ width: 375, height: 667 });
          await page.waitForTimeout(500); // Wait for responsive styles to apply

          // Dismiss any popups that appear on mobile viewport change
          logger.info("Dismissing popups before mobile nav detection...");
          await dismissPopups(page);
          await page.waitForTimeout(300);

          // Find mobile navigation using the established finder
          const mobileNav = await findMobileNav(page);

          if (!mobileNav) {
            logger.warn("No mobile navigation found", { url: target.url });
            return issues;
          }

          logger.info("Found mobile navigation", {
            pattern: mobileNav.pattern,
            score: mobileNav.score,
            reason: mobileNav.reason,
          });

          // ============================================================
          // CHECK 1: TOUCH TARGET SIZE
          // Critical for mobile conversions - small targets = mis-taps
          // ============================================================
          try {
            await ensureMobileNavReady(
              page,
              mobileNav,
              "touch-targets",
              "open"
            );

            const touchTargetIssues = await checkTouchTargets(
              page,
              mobileNav,
              target.url
            );
            issues.push(...touchTargetIssues);
          } catch (error) {
            logger.warn("Touch target check failed", error);
          }

          // ============================================================
          // CHECK 2: HAMBURGER KEYBOARD ACCESSIBILITY
          // Dramatic demo potential - shows complete access failure
          // ============================================================
          try {
            await ensureMobileNavReady(
              page,
              mobileNav,
              "hamburger-keyboard",
              "closed"
            );

            const hamburgerIssues = await checkHamburgerKeyboard(
              page,
              mobileNav,
              target.url
            );
            issues.push(...hamburgerIssues);
          } catch (error) {
            logger.warn("Hamburger keyboard check failed", error);
          }

          // ============================================================
          // CHECK 3: FOCUS TRAP
          // Easy to demonstrate - keyboard users get lost behind overlay
          // ============================================================
          try {
            await ensureMobileNavReady(page, mobileNav, "focus-trap", "open");

            const focusTrapIssues = await checkFocusTrap(
              page,
              mobileNav,
              target.url
            );
            issues.push(...focusTrapIssues);
          } catch (error) {
            logger.warn("Focus trap check failed", error);
          }

          // ============================================================
          // CHECK 4: ESCAPE KEY HANDLER
          // Simple fix, huge usability win
          // ============================================================
          try {
            await ensureMobileNavReady(page, mobileNav, "escape-key", "open");

            const escapeKeyIssues = await checkEscapeKey(
              page,
              mobileNav,
              target.url
            );
            issues.push(...escapeKeyIssues);
          } catch (error) {
            logger.warn("Escape key check failed", error);
          }

          // ============================================================
          // CHECK 5: COLOR CONTRAST
          // Automated scan + screenshots = instant proof
          // ============================================================
          try {
            await ensureMobileNavReady(page, mobileNav, "contrast", "open");

            const contrastIssues = await checkColorContrast(
              page,
              mobileNav,
              target.url
            );
            issues.push(...contrastIssues);
          } catch (error) {
            logger.warn("Color contrast check failed", error);
          }

          logger.info(
            `Mobile menu check complete: ${issues.length} issues found`
          );
          return issues;
        } catch (error) {
          logger.error("Mobile menu check failed", error);
          return issues;
        }
      }); // withCleanup handles cleanup automatically
    } finally {
      logger.info("Restoring desktop viewport after mobile menu checks...");
      await page.setViewportSize(originalViewport);
      await page.waitForTimeout(500);
    }
  },
};

/**
 * CHECK 1: Touch target size
 * Verifies all interactive elements meet 44x44px minimum
 */
async function checkTouchTargets(
  page: any,
  mobileNav: any,
  url: string
): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    // Open mobile menu to check all targets
    await openMobileNav(mobileNav);
    await page.waitForTimeout(500);

    // Check touch target sizes
    const touchTargetData = await page.evaluate(() => {
      const MIN_SIZE = 44; // WCAG 2.5.5 Level AAA (recommended for mobile)
      const targets: any[] = [];

      // Find all interactive elements in mobile menu
      const drawer = document.querySelector(
        'navigation-drawer, .nav-drawer, .mobile-menu-drawer, [data-hamburger-menu], [class*="mobile"][class*="menu"]'
      );

      if (!drawer) return { tooSmall: [], totalTargets: 0 };

      const interactiveElements = drawer.querySelectorAll(
        "a, button, input, select, textarea, [role='button'], [role='link'], [tabindex]:not([tabindex='-1'])"
      );

      interactiveElements.forEach((el: any) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        // Skip hidden elements
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          styles.display === "none" ||
          styles.visibility === "hidden"
        ) {
          return;
        }

        const width = rect.width;
        const height = rect.height;
        const tooSmall = width < MIN_SIZE || height < MIN_SIZE;

        if (tooSmall) {
          targets.push({
            text: el.textContent?.trim().substring(0, 50) || "(no text)",
            tagName: el.tagName.toLowerCase(),
            width: Math.round(width),
            height: Math.round(height),
            minDimension: Math.min(width, height),
            href: el.href || null,
            ariaLabel: el.getAttribute("aria-label"),
          });
        }
      });

      return {
        tooSmall: targets,
        totalTargets: interactiveElements.length,
      };
    });

    if (touchTargetData.tooSmall.length > 0) {
      // Capture screenshot with annotation
      const rawData: { screenshotBuffer?: Buffer; examples: any[] } = {
        examples: touchTargetData.tooSmall.slice(0, 5),
      };

      try {
        // Annotate the first small touch target
        const annotationResult = await annotateElement(page, {
          containerLocator: mobileNav.drawer,
          selector: "a, button",
          labelText: `⚠️ ${touchTargetData.tooSmall[0].width}×${touchTargetData.tooSmall[0].height}px (< 44×44px)`,
          annotationType: "touch-target",
          filter: (el: Element) => {
            const rect = el.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44;
          },
          waitAfterAnnotation: 1500,
        });

        if (annotationResult) {
          rawData.screenshotBuffer = annotationResult.screenshotBuffer;
          logger.info(
            "Touch target annotation captured",
            annotationResult.elementInfo
          );
        }
      } catch (err) {
        logger.warn("Failed to capture touch target screenshot", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      issues.push({
        id: `mobile-menu-touch-targets-${Date.now()}`,
        title: "Mobile Menu Touch Targets Too Small",
        description: `${touchTargetData.tooSmall.length} of ${touchTargetData.totalTargets} interactive elements in the mobile menu are smaller than 44×44px. Small touch targets lead to mis-taps, user frustration, and abandoned shopping sessions on mobile devices.`,
        severity: "critical",
        impact: "conversion",
        effort: "low",
        wcagCriteria: ["2.5.5"],
        path: url,
        screenshot: rawData.screenshotBuffer ? "screenshot.png" : undefined,
        solution:
          "Increase padding on mobile menu links and buttons to achieve minimum 44×44px touch targets. This is especially critical for Shopify stores where 60%+ of traffic is mobile.",
        copilotPrompt: `You are fixing: Mobile menu touch targets too small (WCAG 2.5.5)
Target page: ${url}

${
  touchTargetData.tooSmall.length
} interactive elements in the mobile menu are smaller than the recommended 44×44px minimum touch target size.

Business Impact:
- 60%+ of Shopify traffic is mobile
- Small targets = mis-taps = cart abandonment
- Especially problematic for users with motor impairments
- Directly impacts conversion rates

Requirements:
1. Minimum touch target size: 44×44px (WCAG 2.5.5 Level AAA)
2. Apply to all interactive elements in mobile menu
3. Use padding to increase clickable area without changing visual size

Example fixes:

/* Option 1: Increase padding on mobile menu links */
@media (max-width: 768px) {
  .mobile-menu a,
  .mobile-menu button {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
  }
}

/* Option 2: Specific targets */
.mobile-menu a {
  padding: 16px 20px; /* Gives ~52px height with text */
}

.mobile-menu button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}

/* Close button - often too small */
.mobile-menu__close {
  width: 44px;
  height: 44px;
  padding: 10px; /* Visual icon smaller, clickable area 44px */
}

/* Submenu toggles */
.mobile-menu__toggle {
  min-width: 44px;
  min-height: 44px;
}

Common problem areas to fix:
${touchTargetData.tooSmall
  .slice(0, 5)
  .map(
    (t: any, i: number) =>
      `${i + 1}. ${t.tagName} "${t.text}" - ${t.width}×${t.height}px`
  )
  .join("\n")}

Testing:
1. Set browser to mobile viewport (375px width)
2. Use touch emulation in DevTools
3. Try tapping each element with a finger
4. Verify no mis-taps on adjacent elements

WCAG Success Criterion: 2.5.5 Target Size (Level AAA)
Note: While Level AAA, this is critical for mobile commerce conversions.`,
        rawData: {
          ...rawData,
          tooSmallCount: touchTargetData.tooSmall.length,
          totalTargets: touchTargetData.totalTargets,
          screenshotBuffer: rawData.screenshotBuffer,
        },
      });
    }

    // Close menu after checking
    await closeMobileNav(mobileNav);
  } catch (error) {
    logger.warn("Touch target check failed", error);
  }

  return issues;
}

/**
 * CHECK 2: Hamburger keyboard accessibility
 * Verifies button is semantic and responds to Enter/Space
 */
async function checkHamburgerKeyboard(
  page: any,
  mobileNav: any,
  url: string
): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    const hamburgerData = await page.evaluate(() => {
      // Find hamburger button (should be the trigger)
      const hamburger = document.querySelector(
        'summary[aria-label*="menu" i], button[class*="hamburger"], button[class*="mobile-menu"], button[aria-label*="menu" i]'
      );

      if (!hamburger) {
        return { found: false };
      }

      const tagName = hamburger.tagName.toLowerCase();
      const role = hamburger.getAttribute("role");
      const ariaLabel = hamburger.getAttribute("aria-label");
      const ariaExpanded = hamburger.getAttribute("aria-expanded");
      const tabindex = hamburger.getAttribute("tabindex");

      // Check if it's semantically correct
      const isButton = tagName === "button" || tagName === "summary";
      const hasProperRole = role === "button" || isButton;
      const isKeyboardAccessible =
        isButton || (tabindex !== null && tabindex !== "-1");
      const hasAccessibleName = ariaLabel !== null && ariaLabel.length > 0;

      return {
        found: true,
        tagName,
        role,
        ariaLabel,
        ariaExpanded,
        tabindex,
        isButton,
        hasProperRole,
        isKeyboardAccessible,
        hasAccessibleName,
        outerHTML: hamburger.outerHTML.substring(0, 300),
      };
    });

    if (!hamburgerData.found) {
      logger.warn("Hamburger button not found for keyboard check");
      return issues;
    }

    // Test keyboard activation
    let keyboardWorks = false;
    try {
      // Focus the trigger
      await mobileNav.trigger.focus();
      await page.waitForTimeout(200);

      // Try Enter key
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      const openAfterEnter = await isMobileNavOpen(mobileNav);

      if (openAfterEnter) {
        keyboardWorks = true;
        await closeMobileNav(mobileNav);
        await page.waitForTimeout(300);
      } else {
        // Try Space key
        await mobileNav.trigger.focus();
        await page.keyboard.press("Space");
        await page.waitForTimeout(500);

        const openAfterSpace = await isMobileNavOpen(mobileNav);
        if (openAfterSpace) {
          keyboardWorks = true;
          await closeMobileNav(mobileNav);
          await page.waitForTimeout(300);
        }
      }
    } catch (error) {
      logger.warn("Error testing hamburger keyboard activation", error);
    }

    // Report issues
    if (!hamburgerData.isButton) {
      issues.push({
        id: `mobile-menu-hamburger-not-button-${Date.now()}`,
        title: "Mobile Menu Button Not Semantic HTML",
        description: `The mobile menu hamburger is a <${hamburgerData.tagName}> instead of a proper <button> or <summary> element. This prevents keyboard users from accessing the mobile menu and confuses screen readers.`,
        severity: "critical",
        impact: "litigation",
        effort: "low",
        wcagCriteria: ["2.1.1", "4.1.2"],
        path: url,
        solution:
          "Convert the mobile menu trigger to a <button> element with proper ARIA attributes (aria-label, aria-expanded, aria-controls).",
        copilotPrompt: `You are fixing: Mobile menu trigger is not a semantic button (WCAG 2.1.1, 4.1.2)
Target page: ${url}

The hamburger menu trigger is a <${hamburgerData.tagName}> instead of <button>, making it inaccessible to keyboard users.

Current code:
${hamburgerData.outerHTML}

Requirements:
1. Convert to <button type="button"> element
2. Add aria-label for screen readers
3. Add aria-expanded to indicate state
4. Add aria-controls linking to menu drawer
5. Ensure Enter and Space keys both work

Example fix:

<!-- BEFORE (inaccessible) -->
<div class="hamburger" onclick="toggleMenu()">
  <span></span>
  <span></span>
  <span></span>
</div>

<!-- AFTER (accessible) -->
<button
  type="button"
  class="hamburger"
  aria-label="Open navigation menu"
  aria-expanded="false"
  aria-controls="mobile-nav-drawer"
  onclick="toggleMenu()">
  <span></span>
  <span></span>
  <span></span>
</button>

JavaScript updates needed:

function toggleMenu() {
  const button = document.querySelector('.hamburger');
  const drawer = document.getElementById('mobile-nav-drawer');
  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  
  // Toggle state
  button.setAttribute('aria-expanded', !isExpanded);
  drawer.hidden = isExpanded;
  
  // Update label
  button.setAttribute(
    'aria-label',
    isExpanded ? 'Open navigation menu' : 'Close navigation menu'
  );
}

CSS - no changes needed:
- Keep all existing .hamburger styles
- Browser default button styles will be reset by existing CSS

Benefits:
- Keyboard accessible (Tab to focus, Enter/Space to activate)
- Screen reader announces "Open navigation menu, button"
- Proper semantic role for assistive technology

WCAG Success Criteria:
- 2.1.1 Keyboard (Level A) - Must be keyboard accessible
- 4.1.2 Name, Role, Value (Level A) - Must have proper semantic role`,
        rawData: hamburgerData,
      });
    } else if (!keyboardWorks) {
      issues.push({
        id: `mobile-menu-keyboard-not-working-${Date.now()}`,
        title: "Mobile Menu Doesn't Open with Keyboard",
        description:
          "The mobile menu hamburger button doesn't respond to keyboard activation (Enter or Space keys). Keyboard-only users cannot access the navigation menu.",
        severity: "critical",
        impact: "litigation",
        effort: "medium",
        wcagCriteria: ["2.1.1"],
        path: url,
        solution:
          "Add keyboard event handlers to the hamburger button to respond to Enter and Space key presses.",
        copilotPrompt: `You are fixing: Mobile menu doesn't open with keyboard (WCAG 2.1.1)
Target page: ${url}

The hamburger button exists but doesn't respond to Enter or Space key presses.

Current element:
${hamburgerData.outerHTML}

Requirements:
1. Add keyboard event handler for Enter and Space keys
2. Trigger same action as click event
3. Prevent default behavior to avoid page scroll on Space

Example JavaScript fix:

const hamburger = document.querySelector('.hamburger');

// Add keyboard support
hamburger.addEventListener('keydown', (e) => {
  // Check for Enter or Space key
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault(); // Prevent Space from scrolling page
    
    // Trigger the same action as click
    toggleMenu();
  }
});

// Or if using click handler, ensure it works for keyboard too:
hamburger.addEventListener('click', toggleMenu);

// Existing function
function toggleMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
  
  hamburger.setAttribute('aria-expanded', !isExpanded);
  drawer.hidden = isExpanded;
  
  hamburger.setAttribute(
    'aria-label',
    isExpanded ? 'Open navigation menu' : 'Close navigation menu'
  );
}

Testing:
1. Tab to hamburger button (should see focus indicator)
2. Press Enter - menu should open
3. Close menu
4. Tab to hamburger again
5. Press Space - menu should open
6. Verify both keys work consistently

WCAG Success Criterion: 2.1.1 Keyboard (Level A)`,
        rawData: {
          ...hamburgerData,
          keyboardWorked: false,
          testedKeys: ["Enter", "Space"],
        },
      });
    } else if (!hamburgerData.hasAccessibleName) {
      // Button works but missing accessible name
      issues.push({
        id: `mobile-menu-hamburger-no-label-${Date.now()}`,
        title: "Mobile Menu Button Missing Accessible Label",
        description:
          "The mobile menu hamburger button has no aria-label or accessible text. Screen reader users hear 'button' without knowing what it does.",
        severity: "serious",
        impact: "litigation",
        effort: "low",
        wcagCriteria: ["4.1.2"],
        path: url,
        solution:
          'Add aria-label="Open navigation menu" to the hamburger button, updating to "Close navigation menu" when the menu is open.',
        copilotPrompt: `You are fixing: Mobile menu button missing accessible label (WCAG 4.1.2)
Target page: ${url}

The hamburger button has no accessible name - screen readers announce "button" with no context.

Current element:
${hamburgerData.outerHTML}

Requirements:
1. Add aria-label to button
2. Update label when menu opens/closes
3. Be descriptive about the action

Example fix:

<!-- Add aria-label -->
<button
  type="button"
  class="hamburger"
  aria-label="Open navigation menu"
  aria-expanded="false">
  <span></span>
  <span></span>
  <span></span>
</button>

<!-- JavaScript to update label dynamically -->
function toggleMenu() {
  const button = document.querySelector('.hamburger');
  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  
  // Update aria-expanded
  button.setAttribute('aria-expanded', !isExpanded);
  
  // Update aria-label to match state
  button.setAttribute(
    'aria-label',
    isExpanded ? 'Open navigation menu' : 'Close navigation menu'
  );
  
  // Show/hide drawer
  const drawer = document.getElementById('mobile-nav-drawer');
  drawer.hidden = isExpanded;
}

Alternative labels (choose one that fits your site):
- "Toggle navigation menu"
- "Open main menu" / "Close main menu"
- "Navigation menu" (simpler)
- "Menu" (minimal but acceptable)

Best practice: Be specific about the action ("Open" vs "Close")

WCAG Success Criterion: 4.1.2 Name, Role, Value (Level A)`,
        rawData: hamburgerData,
      });
    }
  } catch (error) {
    logger.warn("Hamburger keyboard check failed", error);
  }

  return issues;
}

/**
 * CHECK 3: Focus trap
 * Verifies focus stays within menu when open
 */
async function checkFocusTrap(
  page: any,
  mobileNav: any,
  url: string
): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    // Open menu
    await openMobileNav(mobileNav);
    await page.waitForTimeout(500);

    // Count focusable elements in drawer
    const focusableCount = await mobileNav.drawer.evaluate((drawer: any) => {
      const focusable = drawer.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return focusable.length;
    });

    if (focusableCount === 0) {
      logger.warn("No focusable elements in mobile menu drawer");
      await closeMobileNav(mobileNav);
      return issues;
    }

    // Tab through menu and check if focus escapes
    let focusEscaped = false;
    const firstFocusable = await mobileNav.drawer
      .locator('a, button, [tabindex]:not([tabindex="-1"])')
      .first();

    await firstFocusable.focus();
    await page.waitForTimeout(200);

    // Tab through many elements to see if focus escapes drawer
    for (let i = 0; i < focusableCount + 5; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);

      // Check if focus is still in drawer
      const focusInDrawer = await page.evaluate(() => {
        const active = document.activeElement;
        const drawer = document.querySelector(
          "navigation-drawer, .nav-drawer, .mobile-menu-drawer, [data-hamburger-menu]"
        );
        return drawer?.contains(active) || false;
      });

      if (!focusInDrawer) {
        focusEscaped = true;
        break;
      }
    }

    if (focusEscaped) {
      issues.push({
        id: `mobile-menu-no-focus-trap-${Date.now()}`,
        title: "Mobile Menu Doesn't Trap Focus",
        description:
          "When the mobile menu is open, keyboard focus can escape to elements behind the overlay. This disorients keyboard users who can't see which element they're focusing on behind the modal.",
        severity: "critical",
        impact: "litigation",
        effort: "medium",
        wcagCriteria: ["2.4.3"],
        path: url,
        solution:
          "Implement a focus trap that keeps keyboard navigation within the mobile menu while it's open. Focus should cycle from the last element back to the first.",
        copilotPrompt: `You are fixing: Mobile menu doesn't trap focus (WCAG 2.4.3)
Target page: ${url}

When the mobile menu is open, pressing Tab allows focus to escape to background elements.

Business Impact:
- Keyboard users get lost behind the overlay
- Can't see what they're focusing on
- Extremely confusing UX
- Common litigation issue

Requirements:
1. Trap focus within menu while open
2. Cycle from last element to first (and reverse with Shift+Tab)
3. Release trap when menu closes
4. Return focus to hamburger button on close

Example implementation:

// Focus trap utility
class FocusTrap {
  constructor(element) {
    this.element = element;
    this.focusableElements = null;
    this.firstFocusable = null;
    this.lastFocusable = null;
  }

  activate() {
    // Get all focusable elements
    this.focusableElements = this.element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];

    // Add event listener
    this.element.addEventListener('keydown', this.handleKeydown);
    
    // Focus first element
    this.firstFocusable?.focus();
  }

  handleKeydown = (e) => {
    if (e.key !== 'Tab') return;

    // Shift + Tab (backward)
    if (e.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable?.focus();
      }
    } 
    // Tab (forward)
    else {
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  }

  deactivate() {
    this.element.removeEventListener('keydown', this.handleKeydown);
  }
}

// Usage in your mobile menu code
let focusTrap = null;

function openMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const hamburger = document.querySelector('.hamburger');
  
  // Show drawer
  drawer.hidden = false;
  hamburger.setAttribute('aria-expanded', 'true');
  
  // Activate focus trap
  focusTrap = new FocusTrap(drawer);
  focusTrap.activate();
}

function closeMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const hamburger = document.querySelector('.hamburger');
  
  // Deactivate focus trap
  focusTrap?.deactivate();
  
  // Hide drawer
  drawer.hidden = true;
  hamburger.setAttribute('aria-expanded', 'false');
  
  // Return focus to hamburger
  hamburger.focus();
}

Alternative: Use a library like focus-trap or @shopify/polaris focus management utilities.

Testing:
1. Open mobile menu
2. Press Tab repeatedly
3. Verify focus cycles through menu items only
4. Press Shift+Tab to go backward
5. Verify focus stays in menu
6. Close menu - focus returns to hamburger

WCAG Success Criterion: 2.4.3 Focus Order (Level A)`,
        rawData: {
          focusEscaped: true,
          focusableCount,
        },
      });
    }

    // Close menu
    await closeMobileNav(mobileNav);
  } catch (error) {
    logger.warn("Focus trap check failed", error);
  }

  return issues;
}

/**
 * CHECK 4: Escape key handler
 * Verifies Escape closes menu and returns focus
 */
async function checkEscapeKey(
  page: any,
  mobileNav: any,
  url: string
): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    // Open menu
    await openMobileNav(mobileNav);
    await page.waitForTimeout(500);

    const openBeforeEscape = await isMobileNavOpen(mobileNav);
    if (!openBeforeEscape) {
      logger.warn("Menu didn't open for Escape key test");
      return issues;
    }

    // Press Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Check if menu closed
    const openAfterEscape = await isMobileNavOpen(mobileNav);

    if (openAfterEscape) {
      issues.push({
        id: `mobile-menu-no-escape-key-${Date.now()}`,
        title: "Mobile Menu Doesn't Close with Escape Key",
        description:
          "The mobile menu doesn't close when the Escape key is pressed. This is a standard expectation for modal dialogs and keyboard navigation patterns.",
        severity: "critical",
        impact: "litigation",
        effort: "low",
        wcagCriteria: ["2.1.1", "2.1.2"],
        path: url,
        solution:
          "Add an Escape key event listener that closes the mobile menu and returns focus to the hamburger button.",
        copilotPrompt: `You are fixing: Mobile menu doesn't close with Escape key (WCAG 2.1.1, 2.1.2)
Target page: ${url}

The mobile menu doesn't respond to Escape key press - users can't exit without mouse/touch.

Business Impact:
- Keyboard users feel trapped
- Standard modal pattern expectation
- Simple fix with huge UX improvement
- Common in accessibility audits

Requirements:
1. Add Escape key listener
2. Close menu when Escape pressed
3. Return focus to hamburger button
4. Work from anywhere in the menu

Example implementation:

// Add global Escape listener when menu is open
let escapeListener = null;

function openMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const hamburger = document.querySelector('.hamburger');
  
  // Show drawer
  drawer.hidden = false;
  hamburger.setAttribute('aria-expanded', 'true');
  hamburger.setAttribute('aria-label', 'Close navigation menu');
  
  // Add Escape key listener
  escapeListener = (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  };
  
  document.addEventListener('keydown', escapeListener);
}

function closeMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const hamburger = document.querySelector('.hamburger');
  
  // Hide drawer
  drawer.hidden = true;
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Open navigation menu');
  
  // Remove Escape listener
  if (escapeListener) {
    document.removeEventListener('keydown', escapeListener);
    escapeListener = null;
  }
  
  // Return focus to hamburger
  hamburger.focus();
}

Alternative approach (if using event delegation):

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const drawer = document.getElementById('mobile-nav-drawer');
    const hamburger = document.querySelector('.hamburger');
    
    // Only close if menu is open
    if (hamburger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  }
});

Testing:
1. Open mobile menu (click hamburger)
2. Press Escape key
3. Verify menu closes
4. Verify focus returns to hamburger button
5. Test from different elements within menu
6. Ensure Escape works consistently

WCAG Success Criteria:
- 2.1.1 Keyboard (Level A) - Keyboard accessible
- 2.1.2 No Keyboard Trap (Level A) - Can exit with keyboard`,
        rawData: {
          escapeKeyWorks: false,
          menuOpenBefore: openBeforeEscape,
          menuOpenAfter: openAfterEscape,
        },
      });
    } else {
      // Check if focus returned to trigger
      const focusOnTrigger = await page.evaluate(() => {
        const active = document.activeElement;
        const hamburger = document.querySelector(
          'summary[aria-label*="menu" i], button[class*="hamburger"], button[aria-label*="menu" i]'
        );
        return active === hamburger;
      });

      if (!focusOnTrigger) {
        issues.push({
          id: `mobile-menu-escape-no-focus-return-${Date.now()}`,
          title: "Focus Not Returned After Closing Mobile Menu with Escape",
          description:
            "The mobile menu closes with Escape, but keyboard focus doesn't return to the hamburger button. Focus is lost, disorienting keyboard users.",
          severity: "serious",
          impact: "trust",
          effort: "low",
          wcagCriteria: ["2.4.3"],
          path: url,
          solution:
            "When closing the menu with Escape, explicitly call .focus() on the hamburger button to return focus.",
          copilotPrompt: `You are fixing: Focus not returned after Escape closes menu (WCAG 2.4.3)
Target page: ${url}

Menu closes with Escape but focus is lost instead of returning to hamburger button.

Requirements:
1. Store reference to the trigger button
2. When menu closes (via Escape or any method), return focus to trigger
3. Provide clear navigation context

Example fix:

function closeMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const hamburger = document.querySelector('.hamburger');
  
  // Hide drawer
  drawer.hidden = true;
  hamburger.setAttribute('aria-expanded', 'false');
  
  // IMPORTANT: Return focus to trigger
  hamburger.focus();
  
  // Remove listeners
  if (escapeListener) {
    document.removeEventListener('keydown', escapeListener);
  }
}

// This should be called from all close methods:
// - Escape key
// - Close button click
// - Backdrop/overlay click
// - Hamburger toggle

Testing:
1. Open menu
2. Press Tab to focus an element inside menu
3. Press Escape
4. Verify focus is on hamburger button (should see focus indicator)
5. Press Space - menu should re-open

WCAG Success Criterion: 2.4.3 Focus Order (Level A)`,
          rawData: {
            escapeKeyWorks: true,
            focusReturned: false,
          },
        });
      }
    }
  } catch (error) {
    logger.warn("Escape key check failed", error);
  }

  return issues;
}

/**
 * CHECK 5: Color contrast
 * Verifies menu text meets WCAG AA contrast ratios
 */
async function checkColorContrast(
  page: any,
  mobileNav: any,
  url: string
): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    // Open menu to check contrast
    await openMobileNav(mobileNav);
    await page.waitForTimeout(500);

    const contrastData = await page.evaluate(() => {
      // Helper: Calculate relative luminance
      const getLuminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map((val) => {
          const sRGB = val / 255;
          return sRGB <= 0.03928
            ? sRGB / 12.92
            : Math.pow((sRGB + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      // Helper: Parse RGB color
      const parseRgb = (colorStr: string): number[] | null => {
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      };

      // Helper: Get effective background color (walk up tree)
      const getBackgroundColor = (el: Element): string => {
        let current: Element | null = el;
        while (current) {
          const bg = window.getComputedStyle(current).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
            return bg;
          }
          current = current.parentElement;
        }
        return "rgb(255, 255, 255)"; // Default to white
      };

      const drawer = document.querySelector(
        'navigation-drawer, .nav-drawer, .mobile-menu-drawer, [data-hamburger-menu], [class*="mobile"][class*="menu"]'
      );

      if (!drawer) return { lowContrast: [], totalChecked: 0 };

      const textElements = drawer.querySelectorAll(
        "a, button, span, p, h1, h2, h3, h4, h5, h6, li"
      );
      const lowContrast: any[] = [];
      let totalChecked = 0;

      textElements.forEach((el: any) => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        // Skip hidden or empty elements
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          styles.display === "none" ||
          styles.visibility === "hidden" ||
          !el.textContent?.trim()
        ) {
          return;
        }

        const color = styles.color;
        const bgColor = getBackgroundColor(el);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;

        totalChecked++;

        const textRgb = parseRgb(color);
        const bgRgb = parseRgb(bgColor);

        if (!textRgb || !bgRgb) return;

        const textLum = getLuminance(textRgb);
        const bgLum = getLuminance(bgRgb);

        const ratio =
          (Math.max(textLum, bgLum) + 0.05) / (Math.min(textLum, bgLum) + 0.05);

        // WCAG AA: 4.5:1 for normal text, 3:1 for large (18pt+ or 14pt+ bold)
        const isLargeText =
          fontSize >= 18 || (fontSize >= 14 && parseInt(fontWeight) >= 700);
        const requiredRatio = isLargeText ? 3 : 4.5;

        if (ratio < requiredRatio) {
          lowContrast.push({
            text: el.textContent?.trim().substring(0, 50) || "",
            tagName: el.tagName.toLowerCase(),
            color,
            bgColor,
            ratio: ratio.toFixed(2),
            required: requiredRatio.toFixed(1),
            fontSize: Math.round(fontSize),
            isLargeText,
          });
        }
      });

      return {
        lowContrast,
        totalChecked,
      };
    });

    if (contrastData.lowContrast.length > 0) {
      // Capture screenshot with annotation
      const rawData: { screenshotBuffer?: Buffer; examples: any[] } = {
        examples: contrastData.lowContrast.slice(0, 5),
      };

      try {
        const firstIssue = contrastData.lowContrast[0];
        const annotationResult = await annotateElement(page, {
          containerLocator: mobileNav.drawer,
          selector: "a, button, span, p, h1, h2, h3, h4, h5, h6",
          labelText: `⚠️ ${firstIssue.ratio}:1 (needs ${firstIssue.required}:1)`,
          annotationType: "contrast",
          filter: (el: Element) => {
            const text = (el as HTMLElement).textContent?.trim();
            return text === firstIssue.text.substring(0, 50);
          },
          waitAfterAnnotation: 1500,
        });

        if (annotationResult) {
          rawData.screenshotBuffer = annotationResult.screenshotBuffer;
          logger.info(
            "Color contrast annotation captured",
            annotationResult.elementInfo
          );
        }
      } catch (err) {
        logger.warn("Failed to capture contrast screenshot", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      issues.push({
        id: `mobile-menu-low-contrast-${Date.now()}`,
        title: "Mobile Menu Text Has Low Color Contrast",
        description: `${contrastData.lowContrast.length} of ${contrastData.totalChecked} text elements in the mobile menu fail WCAG AA color contrast requirements. Low contrast makes text difficult to read, especially in bright outdoor lighting conditions common during mobile shopping.`,
        severity: "serious",
        impact: "conversion",
        effort: "low",
        wcagCriteria: ["1.4.3"],
        path: url,
        screenshot: rawData.screenshotBuffer ? "screenshot.png" : undefined,
        solution:
          "Increase color contrast to meet WCAG AA standards: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold). Use a contrast checker tool to verify colors.",
        copilotPrompt: `You are fixing: Mobile menu low color contrast (WCAG 1.4.3)
Target page: ${url}

${
  contrastData.lowContrast.length
} text elements in mobile menu fail WCAG AA contrast requirements.

Business Impact:
- Mobile shoppers often in bright sunlight
- Low contrast = unreadable menu = lost sales
- 8% of males have color vision deficiency
- Affects users with low vision, aging eyes

Requirements:
1. Normal text (< 18pt): minimum 4.5:1 contrast ratio
2. Large text (≥18pt or ≥14pt bold): minimum 3:1 contrast ratio
3. Test with WebAIM Contrast Checker

Examples of failing contrast:
${contrastData.lowContrast
  .slice(0, 5)
  .map(
    (item: any, i: number) =>
      `${i + 1}. "${item.text}" - ${item.ratio}:1 (needs ${
        item.required
      }:1)\n   Color: ${item.color} on ${item.bgColor}`
  )
  .join("\n")}

Common fixes:

/* Example 1: Light gray text on white background (FAILS) */
.mobile-menu a {
  color: #999999; /* 2.85:1 - FAILS */
  background: #ffffff;
}

/* FIX: Darken text color */
.mobile-menu a {
  color: #767676; /* 4.54:1 - PASSES AA */
  background: #ffffff;
}

/* Example 2: White text on light background (FAILS) */
.mobile-menu {
  background: #f0f0f0;
  color: #ffffff; /* Low contrast */
}

/* FIX: Darken background or add more contrast */
.mobile-menu {
  background: #333333; /* Dark background */
  color: #ffffff; /* Now 12.6:1 - PASSES AAA */
}

/* Example 3: Colored text on colored background */
.mobile-menu__cta {
  background: #4CAF50; /* Green */
  color: #ffffff; /* 3.3:1 - FAILS for normal text */
}

/* FIX: Darken green or increase font size */
.mobile-menu__cta {
  background: #2E7D32; /* Darker green */
  color: #ffffff; /* Now 4.5:1 - PASSES */
  /* OR */
  font-size: 18px;
  font-weight: 600; /* Large text, only needs 3:1 */
}

Tools to verify:
1. WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
2. Chrome DevTools > Accessibility panel
3. Figma/Sketch contrast plugins

Steps:
1. Identify current colors from DevTools
2. Check ratio using WebAIM tool
3. Adjust colors until passing
4. Test in mobile viewport in bright lighting
5. Verify with screen dimmed too

Mobile-specific considerations:
- Test on actual device in sunlight
- Consider anti-glare overlays reduce contrast further
- Higher contrast = better mobile UX

WCAG Success Criterion: 1.4.3 Contrast (Minimum) (Level AA)`,
        rawData: {
          ...rawData,
          lowContrastCount: contrastData.lowContrast.length,
          totalChecked: contrastData.totalChecked,
          screenshotBuffer: rawData.screenshotBuffer,
        },
      });
    }

    // Close menu
    await closeMobileNav(mobileNav);
  } catch (error) {
    logger.warn("Color contrast check failed", error);
  }

  return issues;
}
