/**
 * Utility functions for accessibility checks
 * Provides cleanup and state management patterns
 */

import { Page } from "@playwright/test";
import { logger } from "./logger";
import { dismissPopups } from "./find-mobile-nav";

/**
 * Wrapper for checks that ensures cleanup of opened UI elements
 *
 * Usage:
 * await withCleanup(page, async () => {
 *   // Your check code that might open modals/menus
 *   await button.click(); // Opens modal
 *   // ... test things ...
 *   // Cleanup happens automatically
 * });
 */
export async function withCleanup<T>(
  page: Page,
  fn: () => Promise<T>
): Promise<T> {
  try {
    // Run the check function
    const result = await fn();
    return result;
  } finally {
    // ALWAYS cleanup, even if check throws error
    await closeAllOpenUI(page);
  }
}

/**
 * Close all open UI elements (modals, drawers, menus, overlays)
 * More aggressive than dismissPopups - closes EVERYTHING
 */
async function closeAllOpenUI(page: Page): Promise<void> {
  logger.info("Cleaning up open UI elements...");

  // Strategy 1: Use centralized popup dismissal
  await dismissPopups(page);

  // Strategy 2: Close expanded navigation items left open by checks
  await page.evaluate(() => {
    const expanded = document.querySelectorAll('[aria-expanded="true"]');
    expanded.forEach((el) => {
      el.setAttribute("aria-expanded", "false");

      // Hide associated submenu/drawer without forcing inline styles
      const controlsId = el.getAttribute("aria-controls");
      if (controlsId) {
        const controlled = document.getElementById(controlsId);
        if (controlled) {
          controlled.hidden = true;
          if ((controlled as HTMLElement).style) {
            (controlled as HTMLElement).style.removeProperty("display");
            (controlled as HTMLElement).style.removeProperty("visibility");
          }
        }
      }
    });
  });

  // Strategy 3: Remove lingering overlays directly if needed
  await page.evaluate(() => {
    const modals = document.querySelectorAll(
      '[role="dialog"], ' +
        '[aria-modal="true"], ' +
        ".modal, " +
        '[class*="modal"], ' +
        '[class*="overlay"]'
    );

    modals.forEach((modal) => {
      // Check if it's actually open/visible
      const styles = window.getComputedStyle(modal);
      const isVisible =
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        parseFloat(styles.opacity || "1") > 0;

      if (isVisible) {
        (modal as HTMLElement).style.display = "none";
        (modal as HTMLElement).style.visibility = "hidden";
        modal.setAttribute("aria-hidden", "true");
      }
    });
  });

  logger.info("UI cleanup complete");
}
