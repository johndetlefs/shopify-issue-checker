/**
 * Pitch pack templates
 *
 * Generates human-readable markdown content for the pitch pack:
 * summary, email draft, and per-issue findings.
 */

import { Issue } from "../types";

/**
 * Escape HTML characters in markdown titles to prevent rendering issues
 */
function escapeMarkdownTitle(title: string): string {
  // Wrap HTML tags in backticks to prevent them from being interpreted as HTML
  return title.replace(/<([^>]+)>/g, "`<$1>`");
}

export function generateSummary(clientName: string, issues: Issue[]): string {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const seriousCount = issues.filter((i) => i.severity === "serious").length;
  const moderateCount = issues.filter((i) => i.severity === "moderate").length;
  const minorCount = issues.filter((i) => i.severity === "minor").length;

  const topIssues = issues.slice(0, 5);

  // Helper function to format path(s)
  const formatPaths = (path: string | string[]): string => {
    if (Array.isArray(path)) {
      return path.length > 3
        ? `${path.slice(0, 3).join(", ")}, and ${path.length - 3} more page${
            path.length - 3 > 1 ? "s" : ""
          }`
        : path.join(", ");
    }
    return path;
  };

  return `# ${clientName} — Accessibility & Usability Audit Summary

**Generated:** ${new Date().toLocaleDateString()}

## Executive Summary

We identified **${
    issues.length
  } accessibility and usability issues** across your Shopify storefront that could be impacting conversions, customer trust, and WCAG 2.1 AA compliance.

### Issue Breakdown

- 🔴 **Critical:** ${criticalCount}
- 🟠 **Serious:** ${seriousCount}
- 🟡 **Moderate:** ${moderateCount}
- 🟢 **Minor:** ${minorCount}

---

## Top Priority Issues

${topIssues
  .map((issue, i) => {
    const issueSlug = `${String(i + 1).padStart(2, "0")}-${issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
    const screenshotPath = issue.screenshot
      ? `issues/${issueSlug}/${issue.screenshot}`
      : null;

    return `
### ${i + 1}. ${escapeMarkdownTitle(issue.title)}

- **Severity:** ${issue.severity}
- **Impact:** ${issue.impact}
- **Effort to Fix:** ${issue.effort}
- **WCAG Criteria:** ${issue.wcagCriteria?.join(", ") || "N/A"}
- **Found on:** ${formatPaths(issue.path)}

**Description:** ${issue.description}

${
  screenshotPath
    ? `**Screenshot:**\n\n![${issue.title}](${screenshotPath})\n\n*Annotations added to highlight the issue*\n`
    : ""
}**Solution:** ${issue.solution}
`;
  })
  .join("\n---\n")}}

---

## All Issues by Page

${issues
  .map(
    (issue, i) =>
      `${i + 1}. **${escapeMarkdownTitle(issue.title)}** (${
        issue.severity
      }) — ${formatPaths(issue.path)}`
  )
  .join("\n")}

---

## Next Steps

1. Review individual issue details in the \`/issues\` folder
2. Prioritize fixes based on business impact
3. Use the provided Copilot prompts for AI-assisted implementation
4. Re-audit after fixes to track progress

**Need help implementing these fixes?** We specialize in Shopify accessibility improvements with quick turnaround times.
`;
}

export function generateEmail(clientName: string, issues: Issue[]): string {
  const topWins = issues.slice(0, 3);

  return `Subject: Quick Accessibility Wins for ${clientName}

Hi [Name],

I ran a quick accessibility audit on your Shopify store and found **${
    issues.length
  } opportunities** to improve conversions, customer trust, and compliance with web accessibility standards (WCAG 2.1 AA).

Here are the top 3 quick wins:

${topWins
  .map(
    (issue, i) => `${i + 1}. **${escapeMarkdownTitle(issue.title)}**
   Impact: ${issue.impact} | Effort: ${issue.effort}
   ${issue.solution}
`
  )
  .join("\n")}

I've prepared a full report with:
- Screenshots of each issue
- Step-by-step fix instructions
- AI-ready prompts for implementation

Would you be interested in reviewing the findings? I can walk you through the top priorities in a quick 15-minute call.

Best regards,
[Your Name]

P.S. — These accessibility improvements typically increase conversions by 5-15% and help you reach a wider customer base.
`;
}

export function generateFinding(issue: Issue): string {
  // Helper function to format path(s)
  const formatPaths = (path: string | string[]): string => {
    if (Array.isArray(path)) {
      if (path.length === 1) return path[0];
      return path.map((p, i) => `${i + 1}. ${p}`).join("\n");
    }
    return path;
  };

  const pathLabel =
    Array.isArray(issue.path) && issue.path.length > 1
      ? "Found on (multiple pages)"
      : "Found on";

  return `# ${escapeMarkdownTitle(issue.title)}

**Severity:** ${issue.severity}
**Business Impact:** ${issue.impact}
**Effort to Fix:** ${issue.effort}
**WCAG Criteria:** ${issue.wcagCriteria?.join(", ") || "Not applicable"}

---

## Description

${issue.description}

---
${
  issue.screenshot || issue.video || issue.codeSnippet
    ? `
## Visual Evidence

${
  issue.screenshot
    ? `### Screenshot\n\n![Issue Screenshot](${issue.screenshot})\n\n*Red annotations added to highlight the issue - these are not present on the actual site.*\n`
    : ""
}${issue.video ? `### Video\n\n[View Video Recording](${issue.video})\n` : ""}${
        issue.codeSnippet
          ? `### Problematic Code\n\n\`\`\`html\n${issue.codeSnippet}\n\`\`\`\n`
          : ""
      }
---

`
    : ""
}
## Impact

This issue affects:
- ${issue.impact === "revenue" ? "Direct revenue and sales conversions" : ""}
- ${issue.impact === "conversion" ? "User flow and conversion rates" : ""}
- ${issue.impact === "trust" ? "Brand perception and customer trust" : ""}
- ${issue.impact === "compliance" ? "Legal compliance and risk mitigation" : ""}

---

## Recommended Solution

${issue.solution}

---

## Technical Details

**${pathLabel}:** ${formatPaths(issue.path)}

${
  issue.rawData
    ? "\n**Raw diagnostic data:** See `raw.json` for technical details.\n"
    : ""
}

---

## Implementation Prompt

See \`prompt.md\` for AI-assisted fix instructions.
`;
}

export function generatePrompt(issue: Issue): string {
  // Helper function to format path(s)
  const formatPaths = (path: string | string[]): string => {
    if (Array.isArray(path)) {
      if (path.length === 1) return path[0];
      return path.map((p, i) => `${i + 1}. ${p}`).join("\n");
    }
    return path;
  };

  const pathLabel =
    Array.isArray(issue.path) && issue.path.length > 1
      ? "Found on (multiple pages)"
      : "Found on";

  return `# Fix Prompt: ${escapeMarkdownTitle(issue.title)}

## Context

You are fixing an accessibility/usability issue on a Shopify storefront.

**Issue:** ${escapeMarkdownTitle(issue.title)}
**WCAG Criteria:** ${issue.wcagCriteria?.join(", ") || "Not applicable"}
**${pathLabel}:** ${formatPaths(issue.path)}

## Requirements

${issue.copilotPrompt}

## Solution Approach

${issue.solution}

## Technical Constraints

- This is a Shopify theme (Liquid templates)
- Maintain existing functionality
- Ensure keyboard accessibility
- Preserve focus visibility with \`:focus-visible\` (don't remove outlines)
- Test with screen readers if applicable

## Acceptance Criteria

- Issue is resolved and verified on the affected page
- No regressions in existing functionality
- Solution follows Shopify best practices
- WCAG 2.1 AA compliance achieved
`;
}
