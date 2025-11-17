/**
 * Pitch pack templates
 *
 * Generates human-readable markdown content for the pitch pack:
 * summary, email draft, and per-issue findings.
 */

import { Issue } from "../types";

const DEFAULT_CALENDLY_URL =
  "https://calendly.com/johndetlefs/introduction-tour";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Escape HTML characters in markdown titles to prevent rendering issues
 */
function escapeMarkdownTitle(title: string): string {
  // Wrap HTML tags in backticks to prevent them from being interpreted as HTML
  return title.replace(/<([^>]+)>/g, "`<$1>`");
}

interface SummaryOptions {
  reportUrl?: string;
  calendlyUrl?: string;
}

export function generateSummary(
  clientName: string,
  issues: Issue[],
  options: SummaryOptions = {}
): string {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const seriousCount = issues.filter((i) => i.severity === "serious").length;
  const moderateCount = issues.filter((i) => i.severity === "moderate").length;
  const minorCount = issues.filter((i) => i.severity === "minor").length;

  const topIssues = issues.slice(0, 5);

  const reportUrl =
    options.reportUrl ??
    `https://johndetlefs.com/reports/${slugify(clientName)}`;
  const calendlyUrl = options.calendlyUrl ?? DEFAULT_CALENDLY_URL;

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

---

## Executive Summary

We identified **${
    issues.length
  } accessibility and usability issues** across your Shopify storefront that could be impacting:

- How easily customers navigate your menus and collections  
- Trust and experience for keyboard and screen-reader users  
- Your alignment with **WCAG 2.1 AA** accessibility standards  

Most of these issues are **low to medium effort** to address for a developer familiar with Shopify themes and accessibility best practices.

### Issue Breakdown

- 🔴 **Critical:** ${criticalCount}
- 🟠 **Serious:** ${seriousCount}
- 🟡 **Moderate:** ${moderateCount}
- 🟢 **Minor:** ${minorCount}

---

## How to Use This Report

This summary gives you a clear, non-technical overview of:

- Where accessibility and navigation issues show up on your storefront  
- How they can affect customers and revenue  
- Which areas are likely to deliver the quickest wins if you improve them  

Share it with your development team or partner agency as a starting point. If you’d like, we can also walk you through the findings in a short call and suggest a practical rollout plan.

${
  reportUrl
    ? `You can view/share this report at: **${reportUrl}**

`
    : ""
}---

## What This Means for ${clientName}

From a customer’s perspective, the current issues can result in:

- Difficulty navigating large menus or reaching main content quickly without a mouse  
- Confusing or invisible focus states when moving through navigation links  
- Incomplete information for assistive technologies (screen readers), especially in menus and structural elements  

From a business and compliance perspective, this means:

- **Conversion risk** — some customers may abandon browsing or key flows because they can’t easily move through the site using their preferred method.  
- **Brand risk** — accessibility problems can undermine the premium feel of the brand for users who encounter them.  
- **Compliance risk** — several issues map directly to WCAG 2.1 AA criteria that are commonly referenced in accessibility complaints.  

---

## Key Themes

1. **Navigation & Menus (Desktop & Mobile)**  
   Skip link problems, missing focus indicators, incomplete ARIA attributes on expandable items, and too many tab stops/focus issues when closing menus.  
2. **Screen-Reader & Keyboard Experience**  
   ARIA roles and attributes not used as expected, visually hidden elements that remain focusable, and controls without discernible text.  
3. **Content Structure & Images**  
   List items (\`<li>\`) outside of proper lists and images without alternative text.  

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
- **Effort to Address:** ${issue.effort}
- **WCAG Criteria:** ${issue.wcagCriteria?.join(", ") || "N/A"}
- **Found on:** ${formatPaths(issue.path)}

**What’s happening**  
${issue.description}

${
  screenshotPath
    ? `**Screenshot:**\n\n![${issue.title}](${screenshotPath})\n\n*Annotations added to highlight the issue*\n`
    : ""
}**Recommended direction**  
${issue.solution}
`;
  })
  .join("\n---\n")}

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

## Why a Short Review Call Helps

You can absolutely use this summary as a brief for your own developers or partner agency. Where we usually add value is in:

- **Prioritisation** — picking the 5–7 issues most likely to move the needle on navigation, inclusivity, and compliance in the next 30–60 days.  
- **Risk reduction** — avoiding fixes that solve one issue but introduce regressions elsewhere in the theme.  
- **Validation** — re-checking key flows against WCAG 2.1 AA and real user behaviour once changes are deployed.  

---

## Next Steps

1. **Share this summary internally** as a starting point for theme improvements.  
2. **Decide on a first implementation phase (30–60 days)**, focusing on navigation, skip-link, and mobile menu issues.  
3. **Optionally, have us guide the implementation** — we specialise in Shopify accessibility and navigation improvements and can help plan and validate changes.  

<div class="mt-4 mb-3">
  <a href="${calendlyUrl}" class="btn btn-primary btn-lg" target="_blank" rel="noopener">
    👉 Book a 20-minute review call
  </a>
</div>

We’ve run similar accessibility and navigation audits for other Shopify brands, and the first round of fixes typically leads to smoother navigation, fewer support issues, and measurable conversion lifts for affected users.
`;
}

interface EmailOptions {
  reportUrl?: string;
}

export function generateEmail(
  clientName: string,
  issues: Issue[],
  options: EmailOptions = {}
): string {
  const topWins = issues.slice(0, 3);
  const fallbackReportUrl = `https://johndetlefs.com/reports/${slugify(
    clientName
  )}`;
  const reportUrl = options.reportUrl ?? fallbackReportUrl;

  return `Subject: ${clientName}: your accessibility & navigation report (${
    issues.length
  } issues found)

Hi [Name],

I've put together a short accessibility & navigation report specifically for ${clientName}. It highlights **${
    issues.length
  } issues** that are likely:

- Making it harder for some customers to move through your menus and collections  
- Putting you at risk of WCAG 2.1 AA accessibility complaints  
- Leaving some easy conversion wins on the table  

A few examples:

${topWins
  .map(
    (issue, i) => `${i + 1}. **${escapeMarkdownTitle(issue.title)}**
   Impact: ${issue.impact} | Effort: ${issue.effort}
   ${issue.description}
`
  )
  .join("\n")}

You can view your report here:
👉 ${reportUrl}

Once you've had a chance to skim it, I'm happy to walk you or your dev team through the top priorities and a simple 30–60 day plan — details are at the bottom of the report.

Best,
[Your Name]

P.S. On similar Shopify stores, tightening up accessibility and navigation like this has led to smoother experiences for all users and measurable conversion lifts, especially on mobile and for keyboard/screen-reader users.
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
