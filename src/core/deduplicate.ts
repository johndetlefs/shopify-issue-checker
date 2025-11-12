/**
 * Issue deduplication
 *
 * Consolidates identical issues found on multiple pages into single issues
 * with an array of affected paths. This prevents cluttering the pitch pack
 * with duplicate entries for site-wide problems.
 */

import { Issue } from "../types";
import { logger } from "./logger";

/**
 * Creates a unique key for an issue based on its core characteristics
 * (excluding path, which may vary for the same issue across pages)
 */
function getIssueKey(issue: Issue): string {
  return `${issue.title}|||${issue.description}|||${
    issue.severity
  }|||${issue.wcagCriteria?.join(",")}`;
}

/**
 * Deduplicates issues by consolidating identical issues with different paths
 * into single issues with path arrays.
 *
 * @param issues - Array of issues potentially containing duplicates
 * @returns Deduplicated array where each unique issue appears once with all affected paths
 */
export function deduplicateIssues(issues: Issue[]): Issue[] {
  const issueMap = new Map<string, Issue>();

  for (const issue of issues) {
    const key = getIssueKey(issue);
    const existingIssue = issueMap.get(key);

    if (existingIssue) {
      // Merge paths
      const existingPaths = Array.isArray(existingIssue.path)
        ? existingIssue.path
        : [existingIssue.path];
      const newPath = Array.isArray(issue.path) ? issue.path[0] : issue.path;

      if (!existingPaths.includes(newPath)) {
        existingIssue.path = [...existingPaths, newPath];
      }
    } else {
      // First occurrence - normalize path to string if it's a single-element array
      const normalizedIssue = { ...issue };
      if (
        Array.isArray(normalizedIssue.path) &&
        normalizedIssue.path.length === 1
      ) {
        normalizedIssue.path = normalizedIssue.path[0];
      }
      issueMap.set(key, normalizedIssue);
    }
  }

  const deduplicated = Array.from(issueMap.values());
  const duplicateCount = issues.length - deduplicated.length;

  if (duplicateCount > 0) {
    logger.info(`Deduplicated ${duplicateCount} duplicate issue(s)`, {
      before: issues.length,
      after: deduplicated.length,
    });
  }

  return deduplicated;
}
