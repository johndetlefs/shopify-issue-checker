/**
 * Pitch pack templates
 *
 * Generates human-readable markdown content for the pitch pack:
 * summary, email draft, and per-issue findings.
 */

import { Issue } from "../types";

export function generateSummary(clientName: string, issues: Issue[]): string {
  // TODO: Generate executive summary with issue count, top wins
  // TODO: Include WCAG references where available
  // TODO: List all issues with paths

  return `# ${clientName} - Accessibility & Usability Audit Summary\n\n(Not yet implemented)`;
}

export function generateEmail(clientName: string, issues: Issue[]): string {
  // TODO: Generate short, professional outreach email
  // TODO: Highlight top 2-3 quick wins
  // TODO: Include clear next step/CTA

  return `Subject: Quick Accessibility Wins for ${clientName}\n\n(Not yet implemented)`;
}

export function generateFinding(issue: Issue): string {
  // TODO: Generate detailed finding.md for an issue
  // TODO: Include severity, impact, WCAG refs, solution

  return `# ${issue.title}\n\n(Not yet implemented)`;
}

export function generatePrompt(issue: Issue): string {
  // TODO: Generate actionable copilot fix prompt
  // TODO: Include Liquid/CSS/TS snippets where relevant

  return issue.copilotPrompt || "(Not yet implemented)";
}
