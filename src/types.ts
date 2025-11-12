/**
 * Core type definitions for Shopify A11y Sales Audit
 *
 * Defines the structure for issues, checks, scoring metadata,
 * and page targets used throughout the audit process.
 */

export type Severity = "critical" | "serious" | "moderate" | "minor";
export type Impact = "revenue" | "conversion" | "trust" | "compliance";
export type Effort = "low" | "medium" | "high";

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  impact: Impact;
  effort: Effort;
  wcagCriteria?: string[];
  path: string;
  screenshot?: string;
  solution: string;
  copilotPrompt: string;
  rawData?: any;
  priority?: number;
}

export interface PageTarget {
  url: string;
  label: string;
}

export interface CheckContext {
  page: any; // Playwright Page
  baseUrl: string;
  target: PageTarget;
}

export interface Check {
  name: string;
  run: (context: CheckContext) => Promise<Issue[]>;
}
