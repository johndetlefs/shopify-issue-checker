/**
 * Core type definitions for Shopify A11y Sales Audit
 *
 * Defines the structure for issues, checks, scoring metadata,
 * and page targets used throughout the audit process.
 */

import { Page } from "@playwright/test";

// Severity levels aligned with axe-core and WCAG impact
export type Severity = "critical" | "serious" | "moderate" | "minor";

// Business impact categories for sales prioritization
export type Impact = "revenue" | "conversion" | "trust" | "compliance";

// Development effort estimation
export type Effort = "low" | "medium" | "high";

/**
 * Represents a single accessibility or usability issue found during audit
 */
export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  impact: Impact;
  effort: Effort;
  wcagCriteria?: string[]; // e.g., ["1.3.1", "4.1.2"]
  path: string | string[]; // URL path(s) where issue was found - array for site-wide issues
  screenshot?: string; // Path to screenshot file (relative to issue folder)
  video?: string; // Path to video file (relative to issue folder)
  codeSnippet?: string; // HTML/CSS code snippet showing the problem
  solution: string; // Human-readable fix description
  copilotPrompt: string; // Actionable prompt for AI-assisted fixes
  rawData?: any; // Original data from check (axe nodes, etc.)
  priority?: number; // Computed priority score
}

/**
 * Represents a page to be audited
 */
export interface PageTarget {
  url: string;
  label: string; // Human-readable label (e.g., "Homepage", "Product: Widget")
}

/**
 * Context provided to each check when running
 */
export interface CheckContext {
  page: Page;
  baseUrl: string;
  target: PageTarget;
}

/**
 * Interface for accessibility/usability checks
 */
export interface Check {
  name: string;
  run: (context: CheckContext) => Promise<Issue[]>;
}

/**
 * Audit result summary
 */
export interface AuditResult {
  clientName: string;
  baseUrl: string;
  timestamp: Date;
  targets: PageTarget[];
  issues: Issue[];
  pitchPackPath: string;
}
