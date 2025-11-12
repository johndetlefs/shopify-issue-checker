/**
 * Issue scoring and prioritization
 *
 * Computes priority scores for issues based on severity, impact, and effort.
 * Returns a sorted list for sales conversations.
 */

import { Issue } from "../types";

const severityWeight: Record<string, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

const impactWeight: Record<string, number> = {
  revenue: 4,
  conversion: 3,
  trust: 2,
  compliance: 1,
};

const effortDivisor: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function scoreIssues(issues: Issue[]): Issue[] {
  return issues
    .map((issue) => {
      const severity = severityWeight[issue.severity] || 1;
      const impact = impactWeight[issue.impact] || 1;
      const effort = effortDivisor[issue.effort] || 1;

      // Priority formula: (severity × impact) / effort
      const priority = (severity * impact) / effort;

      return {
        ...issue,
        priority: Math.round(priority * 100) / 100, // Round to 2 decimal places
      };
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}
