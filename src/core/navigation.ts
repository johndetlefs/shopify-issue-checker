import { Page, Response } from "@playwright/test";
import { logger } from "./logger";

export interface NavigateWithFallbackOptions {
  waitUntil?: AllowedLoadState;
  timeout?: number;
  label?: string;
}

export interface NavigateWithFallbackResult {
  response: Response | null;
  fallbackTriggered: boolean;
  finalUrl: string;
}

const INTERRUPTED_NAVIGATION_MESSAGE = "is interrupted by another navigation";

type AllowedLoadState = "load" | "domcontentloaded" | "networkidle";

export async function navigateWithFallback(
  page: Page,
  url: string,
  options?: NavigateWithFallbackOptions
): Promise<NavigateWithFallbackResult> {
  const {
    waitUntil = "domcontentloaded" as AllowedLoadState,
    timeout = 15000,
    label,
  } = options ?? {};

  try {
    const response = await page.goto(url, { waitUntil, timeout });
    return {
      response,
      fallbackTriggered: false,
      finalUrl: page.url(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(INTERRUPTED_NAVIGATION_MESSAGE)
    ) {
      logger.warn("Navigation interrupted by client-side redirect", {
        requestedUrl: url,
        label,
        finalUrl: page.url(),
        message: error.message,
      });

      await page.waitForLoadState(waitUntil, { timeout });

      return {
        response: null,
        fallbackTriggered: true,
        finalUrl: page.url(),
      };
    }

    throw error;
  }
}
