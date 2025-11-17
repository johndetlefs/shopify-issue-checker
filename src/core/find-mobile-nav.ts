/**
 * Mobile navigation finder with interaction support
 * Based on analysis of 10 Shopify sites (see MOBILE-NAV-PATTERNS.md)
 *
 * Detects both:
 * 1. Hamburger trigger (button/summary to open menu)
 * 2. Navigation drawer (the menu itself)
 * 3. Interaction pattern (how to open/close)
 */

import { Page, Locator } from "@playwright/test";

export type MobileNavPattern =
  | "details"
  | "bootstrap"
  | "data-attr"
  | "drawer"
  | "custom";

export interface MobileNavResult {
  trigger: Locator;
  drawer: Locator;
  pattern: MobileNavPattern;
  score: number;
  reason: string[];
}

/**
 * Find mobile navigation hamburger trigger and drawer
 * Returns null if not found
 */
export async function findMobileNav(
  page: Page
): Promise<MobileNavResult | null> {
  // Try each strategy in priority order
  const strategies = [
    findDetailsSummaryPattern,
    findBootstrapNavbarPattern,
    findDataAttributePattern,
    findDrawerComponentPattern,
    findClassBasedPattern,
  ];

  for (const strategy of strategies) {
    const result = await strategy(page);
    if (result && result.score > 5) {
      // Minimum confidence threshold
      return result;
    }
  }

  return null;
}

/**
 * Dismiss any blocking popups/modals on the page
 * Strategy: ESC key → close button → click overlay → fail
 */
export async function dismissPopups(page: Page): Promise<void> {
  const popupSelectors = [
    '[role="dialog"]:not([class*="nav"]):not([class*="menu"]):not([class*="drawer"])',
    '[aria-modal="true"]:not([class*="nav"]):not([class*="menu"]):not([class*="drawer"])',
    ".klaviyo-form-modal",
    ".bxc",
    '[id*="bx-campaign"]',
    '[class*="popup"]:not([class*="nav"]):not([class*="menu"])',
  ];

  for (const selector of popupSelectors) {
    try {
      const popups = page.locator(selector);
      const count = await popups.count();

      for (let i = 0; i < count; i++) {
        const popup = popups.nth(i);
        const isVisible = await popup.isVisible().catch(() => false);

        if (!isVisible) continue;

        console.log(`  → Found blocking popup (${selector})`);

        // Strategy 1: Try ESC key
        console.log(`  → Trying ESC key...`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Check if popup closed
        const stillVisible = await popup.isVisible().catch(() => false);
        if (!stillVisible) {
          console.log(`  → ESC worked - popup dismissed`);
          continue;
        }

        // Strategy 2: Look for close button in popup
        console.log(`  → ESC didn't work, looking for close button...`);
        const closeSelectors = [
          'button[aria-label*="close" i]',
          'button[aria-label*="dismiss" i]',
          ".close",
          '[class*="close"]',
          'button[class*="close"]',
        ];

        let closed = false;
        for (const closeSelector of closeSelectors) {
          const closeBtn = popup.locator(closeSelector).first();
          if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible())) {
            console.log(
              `  → Found close button (${closeSelector}), clicking...`
            );
            await closeBtn.click();
            await page.waitForTimeout(300);
            closed = true;
            break;
          }
        }

        if (closed) {
          const stillThere = await popup.isVisible().catch(() => false);
          if (!stillThere) {
            console.log(`  → Close button worked - popup dismissed`);
            continue;
          }
        }

        // Strategy 3: Click the overlay/backdrop
        console.log(`  → Close button didn't work, trying to click overlay...`);
        try {
          // Click the popup itself (some dismiss on backdrop click)
          await popup.click({ position: { x: 5, y: 5 }, timeout: 1000 });
          await page.waitForTimeout(300);

          const gone = await popup.isVisible().catch(() => false);
          if (!gone) {
            console.log(`  → Overlay click worked - popup dismissed`);
            continue;
          }
        } catch {}

        console.log(`  ⚠️  Could not dismiss popup - may interfere with test`);
      }
    } catch {
      // Continue to next selector
    }
  }
}

/**
 * Open mobile navigation menu
 */
export async function openMobileNav(result: MobileNavResult): Promise<void> {
  const page = result.drawer.page();

  // If already open, nothing to do
  if (await isMobileNavOpen(result)) {
    console.log("  → Mobile nav already open, skipping trigger click");
    return;
  }

  if (result.pattern === "details") {
    // Log what we're about to click
    const tagName = await result.trigger.evaluate((el) => el.tagName);
    const ariaLabel = await result.trigger.getAttribute("aria-label");
    const classes = await result.trigger.getAttribute("class");
    console.log(
      `  → Clicking <${tagName.toLowerCase()}> aria-label="${ariaLabel}"`
    );
    console.log(`    Classes: ${classes}`);

    // Dismiss popups before clicking
    await dismissPopups(page);

    // Scroll trigger into view first
    await result.trigger.scrollIntoViewIfNeeded();

    // For details: click the summary element - NO FORCE, real user click
    await result.trigger.click({ timeout: 5000 });
    console.log(`  → Click completed`);

    // Wait for drawer to become visible (Harris Farm pattern with external drawer)
    // Give time for JavaScript to run and animations to complete
    try {
      console.log(`  → Waiting for drawer to become visible...`);
      await result.drawer.waitFor({ state: "visible", timeout: 2000 });
      console.log(`  → Drawer is now visible`);
    } catch {
      // If drawer doesn't become visible, wait anyway for animations
      console.log(
        `  → Drawer did not become visible within 2s, waiting 1s anyway`
      );
      await page.waitForTimeout(1000);
    }
  } else {
    // Dismiss popups before clicking
    await dismissPopups(page);

    // Click trigger - real user click, no force
    await result.trigger.scrollIntoViewIfNeeded();
    await result.trigger.click({ timeout: 5000 });
    await page.waitForTimeout(1000);
  }
}

/**
 * Find close button within open mobile navigation drawer OR near trigger
 */
export async function findCloseButton(
  drawer: Locator,
  trigger?: Locator
): Promise<Locator | null> {
  const closeSelectorsInDrawer = [
    ".sidemenu___close", // Harris Farm
    "button.nav-close", // Kookai
    'button[aria-label*="close" i]', // Generic close with ARIA
    'button[aria-label*="Close" i]', // Case-sensitive variant
    'button[data-type*="close"]',
    "button.drawer-button__close",
    "button.close",
    '[class*="close"][role="button"]',
    'button[class*="close"]',
    'ul[role="menu"] > button:first-of-type', // Strand: first button in menu
  ];

  // First, look for close button inside drawer
  for (const selector of closeSelectorsInDrawer) {
    try {
      const closeButtons = drawer.locator(selector);
      const count = await closeButtons.count();

      // Try each matching button to find a visible AND clickable one
      for (let i = 0; i < count; i++) {
        const closeButton = closeButtons.nth(i);
        const isVisible = await closeButton.isVisible().catch(() => false);
        if (isVisible) {
          // Also check it has a valid bounding box (not hidden/offscreen)
          const box = await closeButton.boundingBox().catch(() => null);
          if (
            box &&
            box.x >= 0 &&
            box.y >= 0 &&
            box.width > 0 &&
            box.height > 0
          ) {
            // Verify it's not blocked by checking if it's enabled and actionable
            const isEnabled = await closeButton.isEnabled().catch(() => false);
            if (isEnabled) {
              return closeButton;
            }
          }
        }
      }
    } catch (e) {
      continue;
    }
  }

  // For Patagonia-style: close icon is sibling of open icon in header, not in drawer
  if (trigger) {
    try {
      const page = drawer.page();
      // Look for close button as sibling of trigger in parent container
      const closeInHeader = page.locator("[data-hamburger-menu-close]").first();
      if ((await closeInHeader.count()) > 0) {
        return closeInHeader;
      }
    } catch {}
  }

  return null;
}

/**
 * Close mobile navigation menu
 */
export async function closeMobileNav(
  result: MobileNavResult
): Promise<boolean> {
  const page = result.drawer.page();

  // If already closed, nothing to do
  if (!(await isMobileNavOpen(result))) {
    console.log("   → Mobile nav already closed");
    return true;
  }

  // Check if there are blocking popups that might hide the close button
  const popupSelectors = [
    '[role="dialog"]:not([class*="nav"]):not([class*="menu"]):not([class*="drawer"]):not(navigation-drawer)',
    '[aria-modal="true"]:not([class*="nav"]):not([class*="menu"]):not([class*="drawer"]):not(navigation-drawer)',
    '[id*="alia"]', // Alia popup (Koh)
  ];

  let hasPopup = false;
  for (const selector of popupSelectors) {
    const popup = page.locator(selector).first();
    if (await popup.isVisible().catch(() => false)) {
      hasPopup = true;
      console.log(`   → Popup detected, dismissing with ESC...`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      break;
    }
  }

  // If we dismissed a popup, check if nav is still open
  if (hasPopup) {
    const stillOpen = await isMobileNavOpen(result);
    if (!stillOpen) {
      console.log(`   ⚠️  ESC closed the nav too - re-opening...`);
      await openMobileNav(result);
      await page.waitForTimeout(300);
    }
  }

  // Now find and click the close button
  console.log(`   → Looking for close button...`);
  const closeButton = await findCloseButton(result.drawer, result.trigger);

  if (closeButton) {
    // Found a close button - log what we found
    const closeClasses = await closeButton.getAttribute("class");
    const closeAria = await closeButton.getAttribute("aria-label");
    const closeData = await closeButton.getAttribute(
      "data-hamburger-menu-close"
    );
    const boundingBox = await closeButton.boundingBox();
    console.log(`   ✓ Found close button:`);
    if (closeAria) console.log(`     aria-label: ${closeAria}`);
    if (closeClasses) console.log(`     class: ${closeClasses}`);
    if (closeData !== null) console.log(`     data-hamburger-menu-close: true`);
    if (boundingBox) {
      console.log(
        `     position: x=${Math.round(boundingBox.x)}, y=${Math.round(
          boundingBox.y
        )}, w=${Math.round(boundingBox.width)}, h=${Math.round(
          boundingBox.height
        )}`
      );

      // If button is off-screen (negative X for left drawer, X > viewport for right drawer),
      // wait for drawer slide transition to complete
      if (boundingBox.x < 0 || boundingBox.x > 375) {
        console.log(
          `     ⚠️  Button off-screen, waiting for drawer transition...`
        );
        await page.waitForTimeout(500); // Wait for slide animation
      }
    } else {
      console.log(`     ⚠️  No bounding box - element may not be visible`);
    }

    // Close button should be visible at top of drawer - just click it
    await closeButton.click({ timeout: 2000 });
    await page.waitForTimeout(500);
    return true;
  }

  // No close button found - fall back to toggling trigger
  // For toggles, the trigger may be behind the drawer, so we need force
  console.log(`   ⚠️  No close button - attempting trigger toggle...`);
  try {
    await result.trigger.scrollIntoViewIfNeeded();
    // Force click because drawer may cover trigger on toggle-based menus
    await result.trigger.click({ timeout: 2000, force: true });
    await page.waitForTimeout(500);
    console.log(`   ✓ Trigger toggle completed`);
    return true;
  } catch (e) {
    console.log(`   ✗ Trigger toggle failed: ${e}`);
    return false;
  }
}

/**
 * Check if mobile nav is currently open
 */
export async function isMobileNavOpen(
  result: MobileNavResult
): Promise<boolean> {
  if (result.pattern === "details") {
    // For details pattern, check if drawer is actually visible
    // (Harris Farm has external drawer that may not sync with details[open])
    try {
      const isVisible = await result.drawer.isVisible({ timeout: 500 });
      return isVisible;
    } catch {
      // Fallback: check details[open] attribute
      const details = result.trigger.locator("xpath=ancestor::details[1]");
      return await details
        .evaluate((el) => (el as HTMLDetailsElement).open)
        .catch(() => false);
    }
  } else {
    // Check for explicit state indicators
    const drawerClasses = (await result.drawer.getAttribute("class")) || "";
    const ariaHidden = await result.drawer.getAttribute("aria-hidden");

    // Check for open/active classes FIRST (some sites have buggy aria-hidden)
    if (
      drawerClasses.includes("open") ||
      drawerClasses.includes("active") ||
      drawerClasses.includes("is-open")
    ) {
      return true;
    }

    // If aria-hidden is explicitly true, drawer is closed
    if (ariaHidden === "true") {
      return false;
    }

    // If aria-hidden is false, it's open
    if (ariaHidden === "false") {
      return true;
    }

    // Check trigger's aria-expanded for custom components (Koh)
    if (result.trigger) {
      const ariaExpanded = await result.trigger.getAttribute("aria-expanded");
      if (ariaExpanded === "true") {
        return true;
      }
      if (ariaExpanded === "false") {
        return false;
      }
    }

    // Fallback: Check if drawer is visible AND on-screen
    try {
      const isVisible = await result.drawer.isVisible({ timeout: 500 });
      if (!isVisible) {
        return false;
      }

      // For slide-out drawers, check if actually in viewport
      const boundingBox = await result.drawer.boundingBox();
      if (boundingBox) {
        // If drawer is off-screen (x < 0 for left drawer, x > viewport for right), it's closed
        if (boundingBox.x < 0 || boundingBox.x > 375) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Strategy 1: Semantic <details>/<summary> pattern (Dawn themes)
 * Frequency: 5/11 sites (45%)
 */
async function findDetailsSummaryPattern(
  page: Page
): Promise<MobileNavResult | null> {
  const reason: string[] = [];
  let score = 0;

  // Look for <details> with menu/drawer classes or IDs (case-insensitive for IDs)
  const detailsSelectors = [
    'details[id*="menu-drawer" i]', // Harris Farm: "Details-menu-drawer-container" (case-insensitive)
    'details[id*="menu" i]',
    'details[class*="menu-drawer"]',
    'details[class*="mobile-toggle"]',
  ];

  for (const selector of detailsSelectors) {
    const details = page.locator(selector).first();
    const count = await details.count();
    if (count === 0) continue;

    // Check if details is visible
    const isVisible = await details.isVisible().catch(() => false);
    if (!isVisible) {
      // Try anyway - might be display:none but still functional
      console.log(`  Found ${selector} but not visible, trying anyway...`);
    }

    // Check for <summary> child
    const summary = details.locator("> summary").first();
    if ((await summary.count()) === 0) {
      console.log(`  Found ${selector} but no <summary> child`);
      continue;
    }

    // Find drawer - two patterns:
    // 1. Standard Dawn: drawer is child of <details>
    const drawer = details.locator("> div, > nav").first();
    if ((await drawer.count()) > 0) {
      // Found inline drawer
      score = 10; // High confidence for semantic HTML
      reason.push("Found semantic <details>/<summary> pattern");

      // Bonus points for ARIA
      const ariaLabel = await summary.getAttribute("aria-label");
      if (ariaLabel && /menu|navigation/i.test(ariaLabel)) {
        score += 5;
        reason.push(`ARIA label: "${ariaLabel}"`);
      }

      const ariaControls = await summary.getAttribute("aria-controls");
      if (ariaControls) {
        score += 3;
        reason.push(`Has aria-controls="${ariaControls}"`);
      }

      // Check for hamburger icon
      const hasIcon = (await summary.locator("svg, img, .icon").count()) > 0;
      if (hasIcon) {
        score += 2;
        reason.push("Has icon in trigger");
      }

      return {
        trigger: summary,
        drawer,
        pattern: "details",
        score,
        reason,
      };
    }

    // 2. Harris Farm pattern: drawer elsewhere, linked by data-menu-item
    const menuItem = await summary.getAttribute("data-menu-item");
    if (menuItem) {
      const externalDrawer = page
        .locator(
          `div.sidebar[data-menu-item="${menuItem}"], nav[data-menu-item="${menuItem}"]`
        )
        .first();
      if ((await externalDrawer.count()) > 0) {
        // Log what we found for debugging
        const summaryClasses = await summary.getAttribute("class");
        const summaryAria = await summary.getAttribute("aria-label");
        console.log(`  ✓ Found Harris Farm pattern:`);
        console.log(
          `    Summary: aria-label="${summaryAria}", class="${summaryClasses}"`
        );
        console.log(`    Data link: data-menu-item="${menuItem}"`);
        console.log(
          `    External drawer: div.sidebar[data-menu-item="${menuItem}"]`
        );

        return {
          trigger: summary,
          drawer: externalDrawer,
          pattern: "details",
          score: 12, // Higher score for explicit data-attribute linking
          reason: [
            `<details> with external drawer (data-menu-item="${menuItem}")`,
          ],
        };
      }
    }

    // If we found <details>/<summary> but no drawer, keep looking
    console.log(
      `  Found ${selector} and <summary> but no drawer (inline or data-menu-item link)`
    );
  }

  return null;
}

/**
 * Strategy 2: Bootstrap navbar pattern
 * Frequency: Rare but used in some Shopify themes
 * Pattern: button.navbar-toggler[aria-controls] → div.navbar-collapse#[id]
 */
async function findBootstrapNavbarPattern(
  page: Page
): Promise<MobileNavResult | null> {
  const reason: string[] = [];
  let score = 0;

  // Look for Bootstrap navbar toggler button
  const trigger = page.locator("button.navbar-toggler[aria-controls]").first();
  if ((await trigger.count()) === 0) return null;

  // Must be visible
  const isVisible = await trigger.isVisible().catch(() => false);
  if (!isVisible) return null;

  // Get the aria-controls target ID
  const ariaControls = await trigger.getAttribute("aria-controls");
  if (!ariaControls) return null;

  // Find the matching navbar-collapse drawer
  const drawer = page.locator(`div#${ariaControls}.navbar-collapse`).first();
  if ((await drawer.count()) === 0) return null;

  score = 10;
  reason.push(
    `Bootstrap navbar: button.navbar-toggler[aria-controls="${ariaControls}"] → div#${ariaControls}.navbar-collapse`
  );

  console.log(`  ✓ Found Bootstrap navbar pattern:`);
  console.log(`    Trigger: button.navbar-toggler`);
  console.log(`    Drawer: div#${ariaControls}.navbar-collapse`);
  console.log(`    Score: ${score}`);

  return {
    trigger,
    drawer,
    pattern: "bootstrap",
    score,
    reason,
  };
}

/**
 * Strategy 3: Data attribute pattern (Custom themes)
 * Frequency: 3/11 sites (27%)
 */
async function findDataAttributePattern(
  page: Page
): Promise<MobileNavResult | null> {
  const reason: string[] = [];
  let score = 0;

  // Look for triggers with data attributes
  const triggerSelectors = [
    '[data-targets*="nav"]:not([class*="close"])',
    '[data-targets*="drawer"]:not([class*="close"])',
    '[data-targets*="mobile"]:not([class*="close"])',
    "[data-hamburger-menu-open]",
    '[data-toggle*="menu"]:not([class*="close"])',
  ];

  for (const selector of triggerSelectors) {
    const trigger = page.locator(selector).first();
    if ((await trigger.count()) === 0) continue;

    // Verify it's not a close button by checking classes AND visibility
    const triggerClasses = (await trigger.getAttribute("class")) || "";
    if (/close|dismiss/i.test(triggerClasses)) {
      continue; // Skip close buttons
    }

    // Also check if it's likely visible (open buttons are usually visible)
    const isVisible = await trigger.isVisible().catch(() => false);
    if (!isVisible) continue;

    // Get the target identifier
    const dataTargets = await trigger.getAttribute("data-targets");
    const dataToggle = await trigger.getAttribute("data-toggle");
    const hasHamburgerOpen =
      (await trigger.getAttribute("data-hamburger-menu-open")) !== null;

    // For data-hamburger-menu-open (Patagonia), look for data-hamburger-menu drawer
    if (hasHamburgerOpen) {
      const drawerSelectors = ["[data-hamburger-menu]", ".hamburger-menu"];

      for (const drawerSelector of drawerSelectors) {
        const drawer = page.locator(drawerSelector).first();
        if ((await drawer.count()) === 0) continue;

        score = 10; // High confidence for hamburger-menu pattern
        reason.push(
          "Matched data-hamburger-menu-open/data-hamburger-menu pattern"
        );

        return {
          trigger,
          drawer,
          pattern: "data-attr",
          score,
          reason,
        };
      }
    }

    const target = dataTargets || dataToggle;
    if (!target) continue;

    // Find matching drawer
    const drawerSelectors = [
      `[data-type="${target}"]`,
      `[data-drawer="${target}"]`,
      `[data-hamburger-menu="${target}"]`,
      `#${target}`,
    ];

    for (const drawerSelector of drawerSelectors) {
      const drawer = page.locator(drawerSelector).first();
      if ((await drawer.count()) === 0) continue;

      score = 8; // Good confidence for matching data attributes
      reason.push(`Matched data-targets="${target}"`);

      // Bonus for "hamburger" naming
      if (/hamburger/i.test(target)) {
        score += 3;
        reason.push('Uses "hamburger" naming');
      }

      // Bonus for nav/menu classes
      const drawerClasses = (await drawer.getAttribute("class")) || "";
      if (/nav|menu|drawer/i.test(drawerClasses)) {
        score += 2;
        reason.push("Drawer has nav/menu classes");
      }

      return {
        trigger,
        drawer,
        pattern: "data-attr",
        score,
        reason,
      };
    }
  }

  return null;
}

/**
 * Strategy 4: Drawer component pattern (Prestige/Empire themes)
 * Frequency: 2/11 sites (18%)
 */
async function findDrawerComponentPattern(
  page: Page
): Promise<MobileNavResult | null> {
  const reason: string[] = [];
  let score = 0;

  // Look for drawer elements
  const drawerSelectors = [
    "navigation-drawer", // Custom web component
    ".nav-drawer.drawer",
    '.drawer[class*="nav"]',
    '.drawer[class*="menu"]',
  ];

  for (const selector of drawerSelectors) {
    const drawer = page.locator(selector).first();
    if ((await drawer.count()) === 0) continue;

    // Find trigger - usually a button in header
    const triggerSelectors = [
      "button .icon-hamburger",
      'button[aria-label*="menu" i]',
      "header button:has(svg)",
    ];

    for (const triggerSelector of triggerSelectors) {
      const trigger = page.locator(triggerSelector).first();
      if ((await trigger.count()) === 0) continue;

      // For icon selectors, get parent button
      const actualTrigger = triggerSelector.includes(" ")
        ? trigger.locator("xpath=ancestor::button[1]")
        : trigger;

      if ((await actualTrigger.count()) === 0) continue;

      score = 7; // Medium-high confidence
      reason.push("Found drawer component");

      // Bonus for custom web component
      if (selector.includes("-")) {
        score += 4;
        reason.push("Uses custom web component");
      }

      // Bonus for ARIA
      const drawerRole = await drawer.getAttribute("role");
      if (drawerRole === "dialog") {
        score += 3;
        reason.push('Has role="dialog"');
      }

      return {
        trigger: actualTrigger,
        drawer,
        pattern: "drawer",
        score,
        reason,
      };
    }
  }

  return null;
}

/**
 * Strategy 4: Class-based pattern (Fallback)
 * Uses common class naming patterns
 */
async function findClassBasedPattern(
  page: Page
): Promise<MobileNavResult | null> {
  const reason: string[] = [];
  let score = 0;

  // Common trigger class patterns
  const triggerClasses = [
    ".mobile-toggle",
    ".header__icon--menu",
    ".navigation-toggle", // Strand Bags
    ".nav-toggle", // Kookai
    'button[class*="hamburger"]',
    '[class*="mobile-menu-toggle"]',
    '[class*="menu__link"]', // Strand Bags
  ];

  // Common drawer class patterns
  const drawerClasses = [
    ".menu-drawer",
    ".mobile-menu-drawer",
    ".mobile-nav",
    ".shop-menu", // Strand Bags
    ".logo-menu__mobile", // Strand Bags
    ".nav-drawer", // Kookai
    ".drawer.drawer--left", // Kookai (more specific)
    ".drawer", // Kookai/general
    '[id*="mobile-menu"]',
  ];

  for (const triggerClass of triggerClasses) {
    const trigger = page.locator(triggerClass).first();
    if ((await trigger.count()) === 0) continue;

    for (const drawerClass of drawerClasses) {
      const drawer = page.locator(drawerClass).first();
      if ((await drawer.count()) === 0) continue;

      score = 6; // Medium confidence
      reason.push("Matched common class patterns");

      // Verify trigger is likely a button/clickable
      const triggerTag = await trigger.evaluate((el) =>
        el.tagName.toLowerCase()
      );
      if (triggerTag === "button" || triggerTag === "summary") {
        score += 2;
        reason.push(`Trigger is <${triggerTag}>`);
      }

      // Verify drawer is nav-related
      const drawerTag = await drawer.evaluate((el) => el.tagName.toLowerCase());
      if (drawerTag === "nav") {
        score += 2;
        reason.push("Drawer is <nav>");
      }

      // Check if drawer contains links
      const linkCount = await drawer.locator("a").count();
      if (linkCount > 3) {
        score += 2;
        reason.push(`Contains ${linkCount} links`);
      }

      return {
        trigger,
        drawer,
        pattern: "custom",
        score,
        reason,
      };
    }
  }

  return null;
}
