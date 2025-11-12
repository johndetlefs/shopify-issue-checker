# Implementation Plan — Shopify A11y/UX “Pitch Pack” Generator (Sales Tool)

**Zero code in this file.** Follow each step in order. For every step:

- Confirm the **Goal** and **Requirements**.
- Verify the **Acceptance Criteria**.
- Paste the **Prompt to Copilot** into a new empty file or the VS Code chat and accept Copilot’s generated changes.

> Target stack: TypeScript + Playwright. Uses the Playwright VS Code extension, and (optionally) the Playwright MCP server. WCAG 2.1 AA baseline. Shopify-aware guidance.

---

## Step 0 — Environment readiness ✅

**Goal:** Confirm local tooling is ready.
**Requirements:** Node.js LTS, VS Code, Playwright extension installed, optional Playwright MCP server installed.
**Acceptance Criteria:**

- Node and VS Code are installed and up to date.
- Playwright extension visible in VS Code.
- (Optional) Playwright MCP is installed or planned.

**Prompt to Copilot:**
"Create a short checklist file named `docs/ENV_CHECKLIST.md` that lists the prerequisites for this project (Node.js LTS, VS Code, Playwright extension, optional Playwright MCP server) and includes quick verification steps."

**Status:** ✅ Complete — `docs/ENV_CHECKLIST.md` created with prerequisites and verification commands.

---

## Step 1 — Repository bootstrap ✅

**Goal:** Create a new project folder and initialize a Node/TS project.
**Requirements:** New repo root directory with a basic package manifest.
**Acceptance Criteria:**

- A new folder exists for the project.
- `package.json` created with a project name and private flag.

**Prompt to Copilot:**
"In the current folder, initialize a new Node project for a TypeScript+Playwright CLI tool named 'shopify-a11y-sales'. Add standard metadata and mark the package as private."

**Status:** ✅ Complete — `package.json` created with project metadata.

---

## Step 2 — TypeScript and Playwright configuration ✅

**Goal:** Establish TypeScript config and base Playwright setup.
**Requirements:** TypeScript compiler config aligned to modern Node; Playwright ready to run headless.
**Acceptance Criteria:**

- A `tsconfig` suitable for Node/TS projects exists.
- Playwright is configured to run Chromium in headless mode by default.

**Prompt to Copilot:**
"Generate a `tsconfig` suitable for a Node TypeScript project and add a minimal Playwright configuration for a headless Chromium run. Keep settings concise and modern."

**Status:** ✅ Complete — `tsconfig.json` and `playwright.config.ts` created with headless Chromium (1280×720 viewport).

---

## Step 2.5 — Install dependencies ✅

**Goal:** Install required packages for TypeScript, Playwright, and accessibility testing.
**Requirements:** All necessary dependencies installed and listed in `package.json`.
**Acceptance Criteria:**

- `@playwright/test`, `@axe-core/playwright`, TypeScript, and Node types are installed.
- Dependencies are properly categorized as dependencies or devDependencies.

**Prompt to Copilot:**
"Add and install dependencies: `@playwright/test`, `@axe-core/playwright`, `typescript`, `@types/node`, and `ts-node`. Update `package.json` with these as dependencies or devDependencies as appropriate."

**Status:** ✅ Complete — All dependencies installed and Chromium browser downloaded.

---

## Step 3 — Project scripts ✅

**Goal:** Provide easy commands to run the audit and (optionally) the MCP server.
**Requirements:** NPM scripts for `audit` and `mcp`.
**Acceptance Criteria:**

- `npm run audit` triggers our CLI entrypoint.
- `npm run mcp` (optional) starts a Playwright MCP server using a local config.

**Prompt to Copilot:**
"Add NPM scripts so `npm run audit` executes the CLI entrypoint, and `npm run mcp` starts the Playwright MCP server using a `.mcp/playwright.json` file. Create the MCP config with sensible defaults."

**Status:** ✅ Complete — NPM scripts added and `.mcp/playwright.json` created.

---

## Step 4 — VS Code task for one-click use ✅

**Goal:** Enable non-technical execution via VS Code Task.
**Requirements:** A VS Code task that prompts for client name and URL.
**Acceptance Criteria:**

- VS Code shows a task 'Sales Audit: generate pitch pack'.
- Running it prompts for a name and URL.

**Prompt to Copilot:**
"Create `.vscode/tasks.json` with a task called 'Sales Audit: generate pitch pack'. It should prompt for `clientName` and `url` and then run the audit command with those arguments."

**Status:** ✅ Complete — `.vscode/tasks.json` created with input prompts for client name and URL.

---

## Step 5 — Source tree layout ✅

**Goal:** Create folders and placeholder files for types, checks, core utilities, runner, CLI.
**Requirements:** `src/` structure with empty but well-named files.
**Acceptance Criteria:**

- `src/types.ts`, `src/runner.ts`, `src/cli.ts` exist.
- `src/checks/` and `src/core/` folders exist with specific check and utility files.

**Prompt to Copilot:**
"Create the following empty files with brief headers:

- `src/types.ts`
- `src/runner.ts`
- `src/cli.ts`
- `src/checks/axe-core.ts`
- `src/checks/skip-link.ts`
- `src/checks/mega-menu.ts`
- `src/core/crawl.ts`
- `src/core/score.ts`
- `src/core/templates.ts`
- `src/core/emit.ts`

Each file should have a comment describing its responsibility."

**Status:** ✅ Complete — All source files created with descriptive headers. Also created `src/core/logger.ts` for error handling (Step 8.5).

---

## Step 6 — Shared types ✅

**Goal:** Define core types that all modules will use.
**Requirements:** Types for Issue, Check, CheckContext, PageTarget, and enums for severity/impact/effort.
**Acceptance Criteria:**

- `src/types.ts` contains typed definitions for issues, checks, and scoring metadata.
- Types reflect WCAG-centric metadata and include a path reference per finding.

**Prompt to Copilot:**
"Populate `src/types.ts` with TypeScript types for an accessibility sales audit: Issue, Check, CheckContext, and PageTarget, including severity (critical/serious/moderate/minor), impact (revenue/conversion/trust/compliance), and effort (low/medium/high)."

**Status:** ✅ Complete — Full type definitions created with proper Playwright types and documentation comments. Added `AuditResult` interface for summary data.

---

## Step 7 — Crawl targets (sales-focused) ✅

**Goal:** Generate a short list of high-signal URLs to scan.
**Requirements:** A function that returns ~5–6 pages (home, collections, product if found, cart, search, policy). The function should accept a Playwright `Page` instance and the base URL, return `Promise<PageTarget[]>` where `PageTarget` includes `url` and `label` (e.g., 'Homepage', 'Product: Widget Name').
**Acceptance Criteria:**

- A utility returns a deduplicated list of first-party URLs.
- It attempts to extract one or two product/collection URLs from the homepage.
- Navigation failures are handled gracefully with appropriate logging.

**Prompt to Copilot:**
"Implement `src/core/crawl` to return a small, deduped set of scan targets for a Shopify store (home, collections, cart, search, shipping policy, plus one or two product/collection URLs discovered from the homepage). The function should accept a Playwright `Page` instance and the base URL, return `Promise<PageTarget[]>` where `PageTarget` includes `url` and `label`. Handle navigation failures gracefully. Keep it robust and fast."

**Status:** ✅ Complete — Full crawl implementation with graceful error handling, deduplication, and logging. Also completed Steps 8-11 as MVP scaffolding to enable end-to-end testing. Successfully tested with https://universalstore.com and generated complete pitch pack.

**MVP Note:** Steps 8, 9, 10, and 11 have been implemented with basic functionality to create a working MVP. The tool can now:

- Crawl Shopify stores
- Generate pitch pack structure (summary.md, email.md, score.json, issue folders)
- Run via CLI with arguments or interactive prompts
- Handle errors gracefully

Next steps will add real accessibility checks (axe-core, skip-link, mega-menu) to replace the sample issue.

---

## Step 8 — Scoring logic ✅ (MVP)

**Goal:** Prioritize issues by severity × impact ÷ effort.
**Requirements:** A pure function that sorts findings into a sensible order for sales conversations.
**Acceptance Criteria:**

- The function returns the same issues with a computed priority.
- Sorting is stable and deterministic.

**Prompt to Copilot:**
"Implement `src/core/score` to compute a numeric priority using severity, impact, and effort, then sort issues descending by priority. Keep the function pure and unit-testable."

---

## Step 8.5 — Error handling & logging

**Goal:** Add graceful error handling for blocked pages, timeouts, or missing elements.
**Requirements:** A lightweight logging utility and error handling strategy for checks.
**Acceptance Criteria:**

- Checks log warnings instead of crashing when a page fails to load.
- Missing elements (e.g., no skip-link) are treated as findings, not exceptions.
- Logger utility provides info, warn, and error levels.

**Prompt to Copilot:**
"Create a lightweight logging utility in `src/core/logger.ts` that wraps console with severity levels (info, warn, error). Update checks and runner to log warnings when pages fail or elements are missing, and continue the audit."

---

## Step 9 — Pitch pack emission

**Goal:** Emit a human-friendly pack and machine-readable summary.
**Requirements:** Creates client-kebab `pitch-pack` folder; writes `summary.md`, `email.md`, `score.json`, and per-issue folders with `finding.md`, `prompt.md`, optional `screenshot.png` and `raw.json`.
**Acceptance Criteria:**

- Summary includes issue counts, top wins, and WCAG refs where available.
- Email draft includes top quick wins and a clear next step.
- Paths and filenames are kebab-case.

**Prompt to Copilot:**
“Implement `src/core/templates` and `src/core/emit` to generate a pitch pack: a summary, a short outreach email, a JSON score file, and per-issue folders with finding, prompt, optional screenshot and raw data. Use kebab-case for folder names.”

---

## Step 10 — Comprehensive accessibility checks ✅ (Keyboard Complete, Expanding)

**Goal:** Provide comprehensive, sales-grade checks covering keyboard, screen reader, and conversion-focused usability.
**Requirements:**

1. **Skip to content** (presence/focus) — ✅ Complete (3 checks)
2. **Smart navigation finder** — ✅ Complete (pattern-based with scoring)
3. **Mega menu comprehensive check** — ✅ Keyboard complete (10 checks), expanding to screen reader + usability
4. **Axe-core (automated WCAG scan)** — ⏳ Planned

**Navigation Finder Implementation (✅ Complete):**

The smart navigation finder uses pattern recognition and scoring to reliably identify main navigation across diverse Shopify themes:

- **Generic selectors** — `nav, [role="navigation"], [class*="header"] [class*="menu"]`, etc.
- **Scoring system** — Evaluates candidates based on:
  - Position (in header element, top 200px of page)
  - Link count (ideal: 7-12, acceptable: 5-15)
  - Link types (category vs utility links)
  - CSS visibility (only counts visible links at desktop viewport)
  - Semantic indicators (ARIA labels, class names)
- **Tested on 9 stores** — Harris Farm, Koala, Strand Bags, Universal Store, Camilla, Patagonia, Bassike, Kookai, Koh
- **Handles edge cases:**
  - Non-semantic HTML (`<sidemenu>`, `<full-menu>`, `<section class="header">`)
  - Mega menus with hidden dropdowns (counts only visible top-level links)
  - Multiple nav candidates (scores and selects highest)
  - Utility link detection (search, cart, account)

**Acceptance Criteria:**

- Each check returns one or more Issues with WCAG references when known.
- Interaction checks capture full-page screenshots when failing.
- Each issue includes a concise "copilot fix prompt" suitable for later use.
- Coverage spans three categories:
  - **Keyboard accessibility**: Navigation, focus management, skip links
  - **Screen reader support**: ARIA attributes, alt text, semantic HTML, form labels
  - **Conversion/usability**: Color contrast, touch targets, error messages

**Implemented Checks:**

### Skip-to-Content (✅ Complete — 3 checks)

1. Missing skip link detection
2. Skip link not first focusable element
3. Broken skip link target

### Smart Navigation Finder (✅ Complete)

- Pattern-based detection with multi-strategy fallback
- Scoring algorithm for candidate prioritization
- Generic selectors (no site-specific hardcoding)
- Visibility-aware link counting
- Documented in `docs/NAV-PATTERNS.md` and `docs/NAV-FINDER-SUMMARY.md`

### Mega-Menu Navigation (✅ Complete — 17 checks)

**Keyboard Accessibility (✅ Complete — 10 checks):**

1. Can't open with keyboard (Enter/Space)
2. Can't close with Escape
3. Too many tab stops (>30 threshold)
4. Hover-only activation (no click/tap)
5. Missing focus indicators (outline: none)
6. Missing ARIA attributes (aria-expanded, aria-haspopup)
7. Focus doesn't return to trigger on close
8. Mobile hamburger not keyboard accessible
9. Hover timeout too short
10. Arrow key navigation missing

**Semantic/Screen Reader Support (✅ Complete — 4 checks):**

11. Links as buttons (href="#" for dropdown triggers instead of <button>)
12. Image alt text missing/poor (logos, category images in nav)
13. Form labels missing (search inputs in nav)
14. Empty links/buttons (icon-only without text)
15. Landmark roles missing (nav, main, complementary)

**Conversion/Usability (✅ Complete — 3 checks):**

16. Color contrast failures (text hard to read)
17. Touch targets too small (<44×44px)
18. Vague link text ("Click here", "Read more")

### Axe-Core Automated Check (⏳ Planned)

- Runs automated WCAG 2.1 AA scan
- Filters for wcag2a, wcag2aa, wcag21aa tags
- Captures top violations with node-level details
- Includes heading hierarchy, semantic HTML, label associations

**Status:**

- ✅ Skip-link check: Complete (3 issue types)
- ✅ Smart navigation finder: Complete (pattern-based with scoring)
- ✅ Mega-menu comprehensive: Complete (17 issue types - keyboard, screen reader, usability)
- ⏳ Axe-core automated scan: Planned

---

## Step 11 — Runner and CLI

**Goal:** Orchestrate crawl → checks → scoring → pitch pack; expose a CLI.
**Requirements:** Runner accepts client name + URL, iterates pages, accumulates Issues, scores them, and emits the pack. CLI parses args and prints the output path and issue count.
**Acceptance Criteria:**

- `npm run audit -- "Client Name" https://host` completes without errors.
- Output appears under `/clients/{client-kebab}/pitch-pack/`.

**Prompt to Copilot:**
"Wire `src/runner` to navigate the selected targets, run all checks, score the results, and call the emitter. Create `src/cli` to accept positional args: `ts-node src/cli.ts "Client Name" https://example.com` or fall back to interactive prompts if args are missing. Use a library like `commander` or `yargs` if helpful, or keep it minimal with `process.argv`. Log the pitch-pack path and total issues found."

---

## Step 12 — VS Code Task verification

**Goal:** Enable one-click runs for non-CLI users.
**Requirements:** Ensure the VS Code task prompts for values and runs the audit.
**Acceptance Criteria:**

- Running the VS Code task generates an audit identical to the CLI.
- Inputs are validated or echoed clearly.

**Prompt to Copilot:**
“Verify `.vscode/tasks.json` provides a task ‘Sales Audit: generate pitch pack’ that prompts for clientName and url and then invokes the audit script with those values.”

---

## Step 13 — Copilot instructions file

**Goal:** Provide Copilot with persistent context for how to behave in this repo.
**Requirements:** A `.github/copilot-instructions.md` describing purpose, outputs, checks, standards, and constraints.
**Acceptance Criteria:**

- File exists in `.github/`.
- Content describes the sales tool and the expected artifacts.

**Prompt to Copilot:**
“Create `.github/copilot-instructions.md` summarizing this project’s purpose (sales pitch pack), required outputs, minimal checks, WCAG 2.1 AA baseline, and how Copilot should generate fix prompts per issue to be used by a future fixer tool.”

---

## Step 14 — First run & QA

**Goal:** Test on a real Shopify storefront (public).
**Requirements:** Choose any publicly accessible store for a dry run.
**Acceptance Criteria:**

- Pitch pack is created.
- `summary.md` and top 2–3 `issues/*` look persuasive and clear.
- `email.md` reads professionally with concrete wins.
- Screenshots are captured at viewport width 1280×720 (desktop) for consistency.
- `raw.json` contains enough context to reproduce the issue (e.g., axe-core nodes, DOM snapshot for skip-link).

**Prompt to Copilot:**
"Prepare a QA checklist `docs/SALES_QA.md` describing how to review the generated pitch pack (clarity of summary, persuasiveness of email, correctness of WCAG references, relevance of screenshots, actionable fix prompts, screenshot viewport consistency, and completeness of raw.json data)."

---

## Step 15 — Optional enhancements

**Goal:** Add polish when time allows.
**Requirements:** Ideas only, not mandatory for MVP.
**Acceptance Criteria:**

- A short list of enhancements exists for later sprints.

**Prompt to Copilot:**
“Draft a backlog list `docs/BACKLOG.md` with optional enhancements: additional checks (headings/landmarks, images-alt, forms-labels, focus-visible), multi-page crawling controls, PDF export, pitch-pack zipping, configurable page list, and minimal telemetry for hit-rate.”

---

## Completion criteria

- The CLI runs via NPM and the VS Code task.
- A pitch pack folder is produced with summary, email, score, and issue folders containing findings, prompts, and screenshots/raw data where applicable.
- The implementation remains read-only (sales mode) and WCAG 2.1 AA aware.
