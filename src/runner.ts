/**
 * Audit orchestrator and runner
 *
 * Coordinates the crawl, runs all checks against discovered pages,
 * scores the results, and emits the pitch pack.
 */

import { Issue } from "./types";

export async function runAudit(
  clientName: string,
  baseUrl: string
): Promise<void> {
  // TODO: Launch Playwright browser
  // TODO: Crawl the site to discover page targets
  // TODO: Run all checks against each page
  // TODO: Score and prioritize issues
  // TODO: Emit the pitch pack

  console.log(`Running audit for ${clientName} at ${baseUrl}`);
  throw new Error("runAudit not yet implemented");
}
