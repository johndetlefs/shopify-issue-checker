/**
 * Audit orchestrator and runner
 *
 * Coordinates the crawl, runs all checks against discovered pages,
 * scores the results, and emits the pitch pack.
 */

import { chromium } from "@playwright/test";
import { Issue } from "./types";
import { logger } from "./core/logger";
import { discoverTargets } from "./core/crawl";
import { scoreIssues } from "./core/score";
import { emitPitchPack } from "./core/emit";
import { deduplicateIssues } from "./core/deduplicate";
import { skipLinkCheck } from "./checks/skip-link";
import { megaMenuCheck } from "./checks/mega-menu";
import { axeCoreCheck } from "./checks/axe-core";

export async function runAudit(
  clientName: string,
  baseUrl: string
): Promise<string> {
  logger.info(`Starting audit for ${clientName}`, { baseUrl });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    // Step 1: Discover targets
    logger.info("Discovering page targets...");
    const targets = await discoverTargets(page, baseUrl);

    if (targets.length === 0) {
      throw new Error("No targets discovered. Cannot proceed with audit.");
    }

    // Step 2: Run checks
    logger.info(`Running checks on ${targets.length} pages...`);
    const allIssues: Issue[] = [];

    // Run skip-link check on each target
    for (const target of targets) {
      logger.info(`Checking ${target.label}...`);

      try {
        await page.goto(target.url, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        // Run skip-link check
        const skipLinkIssues = await skipLinkCheck.run({
          page,
          baseUrl,
          target,
        });

        allIssues.push(...skipLinkIssues);

        // Run mega-menu check (only on homepage for efficiency)
        if (target.label === "Homepage") {
          const megaMenuIssues = await megaMenuCheck.run({
            page,
            baseUrl,
            target,
          });

          allIssues.push(...megaMenuIssues);
        }

        // Run axe-core automated scan on all pages
        const axeIssues = await axeCoreCheck.run({
          page,
          baseUrl,
          target,
        });

        allIssues.push(...axeIssues);
      } catch (error) {
        logger.warn(`Failed to check ${target.label}`, error);
        // Continue with other targets
      }
    }

    logger.info(`Found ${allIssues.length} issues`);

    // Step 3: Deduplicate issues
    logger.info("Deduplicating site-wide issues...");
    const deduplicatedIssues = deduplicateIssues(allIssues);

    // Step 4: Score issues
    logger.info("Scoring and prioritizing issues...");
    const scoredIssues = scoreIssues(deduplicatedIssues);

    // Step 5: Emit pitch pack
    logger.info("Generating pitch pack...");
    const pitchPackPath = emitPitchPack(clientName, baseUrl, scoredIssues);

    logger.info("Audit complete!", {
      pitchPackPath,
      issueCount: scoredIssues.length,
    });
    return pitchPackPath;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}
