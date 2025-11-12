# Copilot Instructions — Shopify Accessibility & Usability “Pitch Pack” Generator

You are GitHub Copilot assisting with a **sales/lead-generation tool**.
**Purpose:** crawl a client’s public Shopify storefront (read-only), detect common accessibility/usability issues, and produce a tidy **pitch pack** with screenshots, human-readable findings, fix strategies, and ready-to-use prompts.
**Important:** This phase must **not change** the client’s site or theme code. It only generates local evidence and recommendations.

---

## Inputs you will receive

- **Client name** (string), e.g., “Acme Gifts”.
- **Client shop URL** (absolute URL), e.g., `https://acmegifts.myshopify.com` or their custom domain.
- Local project environment with:

  - Node.js (LTS)
  - VS Code
  - **Playwright VS Code extension**
  - **Playwright MCP server** (installed; optional for this CLI but available for agent/automation flows)

---

## What you must generate

When asked to “run the sales audit,” produce a folder:

```
/clients/{client-kebab}/pitch-pack/
  summary.md
  email.md
  score.json
  /issues/{NN}-{issue-slug}/
    finding.md
    prompt.md
    screenshot.png (if captured)
    raw.json (axe node data etc.)
```

- **summary.md**: executive summary (top wins, count, list).
- **email.md**: short, professional outreach email draft.
- **score.json**: machine-readable list for CRM/automation.
- **issues/**: one folder per issue with all assets.

---

## Scope & checks to run (sales-focused)

Aim for **provable gaps + screenshots** over exhaustive auditing.

**Implemented checks:**

1. **Skip to content** (presence, position, functionality) — 3 issue types
2. **Main navigation detection** (smart pattern-based finder with scoring)
3. **Mega menu keyboard accessibility** — 10 issue types covering:
   - Keyboard navigation (Enter/Space, Escape, focus management)
   - ARIA attributes (aria-expanded, aria-haspopup)
   - Focus indicators and return-to-trigger
   - Mobile hamburger accessibility
   - Hover timeouts and arrow key navigation

**Planned checks:**

- **Axe-core automated scan** (wcag2a/aa/21aa tags)
- **Navigation screen reader support** (alt text, labels, empty links, landmarks)
- **Navigation usability** (color contrast, touch targets, CTA clarity)
- Headings & landmarks sanity
- Form labels/inputs association

---

## Standards & constraints

- Target **WCAG 2.1 AA**.
- Don’t suggest removing keyboard outlines; prefer `:focus-visible` customization.
- No client-side edits in this phase—**generate evidence only**.
- Be Shopify-aware (Liquid templates, sections/snippets, theme JS/TS) when suggesting fixes.

---

## Folder & code expectations

The project uses **TypeScript** and **Playwright**. Core structure:

- `src/types.ts` — shared types (`Issue`, `Check`, `CheckContext`, etc.)
- `src/checks/` — accessibility checks:
  - `skip-link.ts` — Skip-to-content validation (3 checks)
  - `mega-menu.ts` — Navigation keyboard accessibility (10 checks)
- `src/core/` — utilities:
  - `crawl.ts` — Target page discovery
  - `score.ts` — Issue prioritization
  - `emit.ts` — Pitch pack generation
  - `templates.ts` — Markdown/JSON templates
  - `logger.ts` — Error handling
  - `capture.ts` — Screenshot utility
  - `find-navigation.ts` — Smart pattern-based navigation finder
- `src/runner.ts` — Orchestrates crawl and checks
- `src/cli.ts` — Entry point (Usage: `npm run audit -- "Client Name" https://domain`)
- `utilities/` — Development tools:
  - `test-nav-finder.ts` — Navigation finder test suite
  - `capture-nav-html.ts` — HTML capture utility

---

## Copilot behavior guidelines

- Prefer **TypeScript** for all code.
- Keep code small, composable, and testable.
- When generating prompts for fixes, **assume** the later “fixer” tool will pull the theme and apply patches—so provide **clear, minimal Liquid/TS snippets** and reference WCAG criteria in `prompt.md`.
- File/dir names: **kebab-case**.
- Commit messages (when asked): `chore(audit): {change}`, `feat(check): {check-name}`, `fix(a11y): {issue-title} [wcag: X.Y.Z]`.

---

## Example “prompt.md” content you should generate per issue

A concise, **actionable** fix prompt for the future fixer tool, for example:

```
You are fixing: Missing or non-functional “Skip to content” (WCAG 2.4.1).
Target page(s): /, /collections/all

Requirements:
1) Insert <a class="sr-only focusable" href="#main">Skip to main content</a> as first focusable element in <body>.
2) Ensure <main id="main" tabindex="-1"> and move focus there on activation.
3) Provide Liquid + CSS before/after snippets (Shopify theme).
4) Retain keyboard outline via :focus-visible.
```

---

## VS Code integration

- Dev runs the **VS Code Task**: “Sales Audit: generate pitch pack”.
- Screenshots are captured via Playwright (full-page where relevant).
- MCP server is optional here—keep the CLI self-sufficient.

---

## Done criteria

- On run, a **pitch-pack** folder is created for the client with:

  - `summary.md` containing: count, top wins, paths, WCAG refs.
  - At least **3 distinct issues** (if present) across targeted pages.
  - Screenshots for interaction-related issues.
  - `email.md` prefilled with top 2–3 wins.
  - `score.json` listing all issues with severity/effort/impact.
