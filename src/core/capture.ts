/**
 * Visual evidence capture utilities
 *
 * Helpers for capturing screenshots, videos, and code snippets
 * to include in pitch pack issues.
 */

import { Page } from "@playwright/test";
import { join } from "path";
import { mkdirSync } from "fs";
import { logger } from "./logger";

function kebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Capture a screenshot and save to the issue folder
 */
export async function captureScreenshot(
  page: Page,
  clientName: string,
  issueTitle: string,
  issueIndex: number,
  options?: {
    fullPage?: boolean;
    element?: string; // Selector to highlight or screenshot
  }
): Promise<string> {
  try {
    const clientSlug = kebabCase(clientName);
    const issueSlug = `${String(issueIndex).padStart(2, "0")}-${kebabCase(
      issueTitle
    )}`;
    const issueDir = join(
      process.cwd(),
      "clients",
      clientSlug,
      "pitch-pack",
      "issues",
      issueSlug
    );

    // Ensure directory exists
    mkdirSync(issueDir, { recursive: true });

    const screenshotPath = join(issueDir, "screenshot.png");

    // Highlight element if selector provided
    if (options?.element) {
      await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) {
          (el as HTMLElement).style.outline = "3px solid red";
          (el as HTMLElement).style.outlineOffset = "2px";
        }
      }, options.element);
    }

    // Capture screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: options?.fullPage ?? false,
    });

    // Remove highlight
    if (options?.element) {
      await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) {
          (el as HTMLElement).style.outline = "";
          (el as HTMLElement).style.outlineOffset = "";
        }
      }, options.element);
    }

    logger.info("Screenshot captured", { path: screenshotPath });
    return "screenshot.png"; // Relative to issue folder
  } catch (error) {
    logger.warn("Failed to capture screenshot", error);
    return "";
  }
}

/**
 * Extract code snippet from an element
 */
export async function captureCodeSnippet(
  page: Page,
  selector: string,
  options?: {
    includeParent?: boolean;
    maxLength?: number;
  }
): Promise<string> {
  try {
    const snippet = await page.evaluate(
      ({ sel, includeParent }) => {
        const el = document.querySelector(sel);
        if (!el) return "";

        const target =
          includeParent && el.parentElement ? el.parentElement : el;
        return target.outerHTML;
      },
      { sel: selector, includeParent: options?.includeParent ?? false }
    );

    const maxLength = options?.maxLength ?? 500;
    return snippet.length > maxLength
      ? snippet.substring(0, maxLength) + "\n<!-- ... truncated ... -->"
      : snippet;
  } catch (error) {
    logger.warn("Failed to capture code snippet", error);
    return "";
  }
}

/**
 * Start video recording for interaction issues
 */
export async function startVideoRecording(
  page: Page,
  clientName: string,
  issueTitle: string,
  issueIndex: number
): Promise<string> {
  try {
    const clientSlug = kebabCase(clientName);
    const issueSlug = `${String(issueIndex).padStart(2, "0")}-${kebabCase(
      issueTitle
    )}`;
    const issueDir = join(
      process.cwd(),
      "clients",
      clientSlug,
      "pitch-pack",
      "issues",
      issueSlug
    );

    mkdirSync(issueDir, { recursive: true });

    const videoPath = join(issueDir, "recording.webm");

    // Note: Playwright video recording needs to be set up at context level
    // This is a placeholder - actual implementation would use context.tracing or page.video()
    logger.info("Video recording would start", { path: videoPath });

    return "recording.webm";
  } catch (error) {
    logger.warn("Failed to start video recording", error);
    return "";
  }
}
