/**
 * Axe-core accessibility check
 *
 * Runs axe-core automated accessibility tests and returns
 * top violations with WCAG 2.1 AA tags.
 */

import AxeBuilder from "@axe-core/playwright";
import { Check, CheckContext, Issue, Severity, Impact, Effort } from "../types";
import { logger } from "../core/logger";

// Map axe impact to our severity levels
function mapAxeImpactToSeverity(axeImpact: string): Severity {
  switch (axeImpact) {
    case "critical":
      return "critical";
    case "serious":
      return "serious";
    case "moderate":
      return "moderate";
    case "minor":
      return "minor";
    default:
      return "moderate";
  }
}

// Map violation types to business impact
function mapViolationToImpact(tags: string[], ruleId: string): Impact {
  // Color contrast is the #1 ADA lawsuit trigger - litigation risk
  if (
    ruleId.includes("color-contrast") ||
    tags.some((t) => t.includes("color-contrast"))
  ) {
    return "litigation";
  }

  // ARIA violations are common in lawsuits - semantic/structural issues
  if (
    ruleId.includes("aria") ||
    ruleId.includes("role") ||
    ruleId.includes("list") ||
    tags.some((t) => t.includes("aria"))
  ) {
    return "litigation";
  }

  // Form controls without labels are critical WCAG violations
  // Widespread form issues = litigation, isolated = conversion
  if (
    ruleId.includes("label") ||
    ruleId.includes("select-name") ||
    ruleId.includes("input") ||
    tags.some((t) => t.includes("forms") || t.includes("input"))
  ) {
    // If it's a critical form control issue, prioritize litigation
    return ruleId.includes("select-name") || ruleId.includes("label")
      ? "litigation"
      : "conversion";
  }

  // Image violations: product images affect revenue, generic images affect trust
  if (
    ruleId.includes("image-alt") ||
    tags.some((t) => t.includes("image") || t.includes("alt"))
  ) {
    // Default to trust; would need context to determine if product images
    return "trust";
  }

  // Link and navigation issues affect both litigation and conversion
  if (
    ruleId.includes("link-name") ||
    ruleId.includes("frame-title") ||
    tags.some((t) => t.includes("link") || t.includes("navigation"))
  ) {
    return "litigation";
  }

  // Everything else is compliance/legal risk
  return "compliance";
}

// Estimate effort based on violation type
function estimateEffort(ruleId: string, nodeCount: number): Effort {
  // Simple fixes that can be scripted or bulk-applied
  const lowEffortRules = [
    "image-alt",
    "label",
    "html-has-lang",
    "document-title",
    "landmark-one-main",
  ];

  // Complex fixes requiring design/UX changes
  const highEffortRules = [
    "color-contrast",
    "focus-order",
    "scrollable-region-focusable",
  ];

  if (lowEffortRules.some((rule) => ruleId.includes(rule)) && nodeCount < 10) {
    return "low";
  }

  if (highEffortRules.some((rule) => ruleId.includes(rule))) {
    return "high";
  }

  // Medium effort for everything else
  return nodeCount > 20 ? "high" : "medium";
}

export const axeCoreCheck: Check = {
  name: "axe-core",

  async run(context: CheckContext): Promise<Issue[]> {
    const { page, target } = context;
    const issues: Issue[] = [];

    try {
      // Run axe with WCAG 2.1 AA tags
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const violations = accessibilityScanResults.violations;

      // Sort by node count (most widespread issues first) and take top 10
      const topViolations = violations
        .sort((a: any, b: any) => b.nodes.length - a.nodes.length)
        .slice(0, 10);

      logger.info(
        `Found ${violations.length} axe violations on ${target.label}`,
        {
          top: topViolations.length,
        }
      );

      // Convert each violation to an Issue
      for (const violation of topViolations) {
        const severity = mapAxeImpactToSeverity(violation.impact || "moderate");
        const impact = mapViolationToImpact(violation.tags, violation.id);
        const effort = estimateEffort(violation.id, violation.nodes.length);

        // Extract WCAG criteria from tags (e.g., "wcag131" -> "1.3.1")
        const wcagCriteria = violation.tags
          .filter((tag: string) => tag.startsWith("wcag"))
          .map((tag: string) => {
            // Parse "wcag131" -> "1.3.1", "wcag412" -> "4.1.2"
            const match = tag.match(/wcag(\d)(\d)(\d)/);
            if (match) {
              return `${match[1]}.${match[2]}.${match[3]}`;
            }
            return null;
          })
          .filter(Boolean) as string[];

        const wcagLevel = violation.tags.some((t: string) =>
          t.includes("wcag21")
        )
          ? "2.1"
          : "2.0";

        const fixPrompt = generateFixPrompt(
          violation,
          wcagCriteria,
          target.label
        );

        issues.push({
          id: `axe-${violation.id}-${target.label
            .toLowerCase()
            .replace(/\s+/g, "-")}`,
          title: violation.help,
          description: violation.description,
          severity,
          impact,
          effort,
          wcagCriteria: wcagCriteria.length > 0 ? wcagCriteria : undefined,
          wcagLevel:
            wcagCriteria.length > 0 ? (wcagLevel as "2.0" | "2.1") : undefined,
          path: target.url,
          pageLabel: target.label,
          category: "automated",
          solution: generateSolution(violation),
          copilotPrompt: fixPrompt,
          rawData: {
            ruleId: violation.id,
            helpUrl: violation.helpUrl,
            nodeCount: violation.nodes.length,
            nodes: violation.nodes.slice(0, 5).map((node: any) => ({
              html: node.html,
              target: node.target,
              failureSummary: node.failureSummary,
            })),
          },
        });
      }
    } catch (error) {
      logger.warn(`Axe-core check failed on ${target.label}`, error);
    }

    return issues;
  },
};

function generateSolution(violation: any): string {
  // Generate a concise, human-readable solution based on the violation type
  const nodeCount = violation.nodes.length;
  const firstFailure = violation.nodes[0]?.failureSummary || "";

  // Extract the first actionable fix from the failure summary
  const fixes = firstFailure
    .split("\n")
    .filter((line: string) => line.trim().length > 0)
    .slice(1); // Skip "Fix any/all of the following:"

  if (fixes.length > 0) {
    const primaryFix = fixes[0].trim();
    return `Fix ${nodeCount} instance${
      nodeCount > 1 ? "s" : ""
    }: ${primaryFix}`;
  }

  // Fallback to description
  return `Review and fix ${nodeCount} instance${
    nodeCount > 1 ? "s" : ""
  } of this issue. See the axe-core documentation for detailed guidance.`;
}

function generateFixPrompt(
  violation: any,
  wcagCriteria: string[],
  pageLabel: string
): string {
  const criteriaText =
    wcagCriteria.length > 0
      ? `WCAG ${wcagCriteria.join(", ")}`
      : "WCAG compliance";

  return `You are fixing: ${violation.help} (${criteriaText})
Target page: ${pageLabel}
Affected elements: ${violation.nodes.length}

Issue: ${violation.description}

Requirements:
1. Review the axe-core rule documentation: ${violation.helpUrl}
2. Fix all ${violation.nodes.length} instances of this violation
3. Common fixes for this rule:
${violation.nodes
  .slice(0, 3)
  .map(
    (node: any, i: number) =>
      `   ${i + 1}. ${node.failureSummary || "Review element"}`
  )
  .join("\n")}

Verification:
- Run axe-core after fixes to confirm violation is resolved
- Test with keyboard navigation and screen reader
- Ensure fix doesn't introduce new violations

Example affected element:
${violation.nodes[0]?.html || "N/A"}`;
}
