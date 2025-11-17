/**
 * Popup guard utilities ensure that after dismissing modals/overlays,
 * critical UI (e.g., mobile navigation drawers) remains open.
 */

import type { Page } from "@playwright/test";
import { dismissPopups } from "./find-mobile-nav";
import { logger } from "./logger";

export interface GuardedUiTarget {
  name: string;
  /** Returns true if the UI element is still open/visible */
  isOpen: () => Promise<boolean>;
  /** Reopens the UI element if dismissal closed it */
  open: () => Promise<void>;
  /** Optional wait after reopening to let animations finish */
  waitAfterOpenMs?: number;
}

export interface PopupGuardOptions {
  label?: string;
}

/**
 * Dismiss blocking popups and immediately verify that guarded UI targets
 * remain open. If ESC/overlay dismissal closed them, reopen before continuing.
 */
export async function dismissPopupsWithGuards(
  page: Page,
  guards: GuardedUiTarget[] = [],
  options: PopupGuardOptions = {}
): Promise<void> {
  const label = options.label ?? "general";
  logger.info(`Dismissing popups (${label})`, { guardCount: guards.length });

  await dismissPopups(page);

  for (const guard of guards) {
    try {
      const stillOpen = await guard.isOpen();
      if (!stillOpen) {
        logger.info(`Popup guard reopening ${guard.name}`);
        await guard.open();
        if (guard.waitAfterOpenMs) {
          await page.waitForTimeout(guard.waitAfterOpenMs);
        } else {
          await page.waitForTimeout(400);
        }
      } else {
        logger.info(`Popup guard confirmed ${guard.name} remained open`);
      }
    } catch (error) {
      logger.warn(`Popup guard error for ${guard.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
