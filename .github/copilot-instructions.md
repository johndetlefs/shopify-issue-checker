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
3. **Mega menu comprehensive accessibility** — 17 issue types covering:
   - **Keyboard** (10): Enter/Space, Escape, focus management, ARIA, mobile, hover timeouts, arrow keys
   - **Screen reader** (4): Links as buttons, alt text, form labels, empty links, landmarks
   - **Usability** (3): Color contrast, touch targets, vague link text

**Planned checks:**

- **Axe-core automated scan** (wcag2a/aa/21aa tags)
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
  - `emit.ts` — Pitch pack generation (clears destination folders before writing)
  - `templates.ts` — Markdown/JSON templates
  - `logger.ts` — Error handling
  - `capture.ts` — Screenshot utility
  - `find-navigation.ts` — Smart pattern-based navigation finder
  - `find-footer.ts` — Smart pattern-based footer finder
  - `find-mobile-nav.ts` — Mobile nav discovery + helpers (open/close/isOpen)
  - `popup-guard.ts` — Shared popup guard + dismissal workflow
  - `check-utils.ts` — `withCleanup` helper for automatic teardown
- `src/runner.ts` — Orchestrates crawl and checks
- `src/cli.ts` — Entry point (Usage: `npm run audit -- "Client Name" https://domain`)
- `utilities/` — Development tools:
  - `test-nav-finder.ts` — Navigation finder test suite
  - `test-footer-finder.ts` — Footer finder test suite
  - `capture-page-html.ts` — Full page HTML capture utility (desktop + mobile)

---

## Pattern Discovery Process

When implementing detection for new UI components (e.g., mobile menus, accordions, carousels), **always follow** the methodology documented in `.github/DISCOVER_COMMON_PATTERNS.md`:

1. **Define component characteristics** — Purpose, location, key features, edge cases
2. **Capture real HTML** — Use 10 reference Shopify sites (see DISCOVER_COMMON_PATTERNS.md)
3. **Analyze patterns** — Document semantic HTML, ARIA, classes, content, position
4. **Implement scoring-based detection** — Multi-strategy with fallbacks
5. **Test and iterate** — Aim for 80%+ success rate across reference sites

**Completed implementations:**

- **Navigation finder** — See `docs/NAV-FINDER-SUMMARY.md` (9/10 success rate)
- **Footer finder** — See `docs/FOOTER-FINDER-SUMMARY.md` (implemented)

**Why this approach:**

- Works across diverse Shopify themes (not site-specific)
- Semantic/structural patterns over hardcoded classes
- Graceful fallbacks for edge cases
- Well-documented and maintainable

**When to use existing finders:**

- Need to detect site footer → Use `findFooter()` from `src/core/find-footer.ts`
- Need to detect main navigation → Use `findNavigation()` from `src/core/find-navigation.ts`
- Need new component → Follow `DISCOVER_COMMON_PATTERNS.md` process

---

## Copilot behavior guidelines

- Prefer **TypeScript** for all code.
- Keep code small, composable, and testable.
- When generating prompts for fixes, **assume** the later "fixer" tool will pull the theme and apply patches—so provide **clear, minimal Liquid/TS snippets** and reference WCAG criteria in `prompt.md`.
- File/dir names: **kebab-case**.
- Commit messages (when asked): `chore(audit): {change}`, `feat(check): {check-name}`, `fix(a11y): {issue-title} [wcag: X.Y.Z]`.

### CRITICAL: Check cleanup and popup handling

**Every check MUST clean up after itself:**

✅ **DO THIS:**

```typescript
import { withCleanup } from "../core/check-utils";

export const myCheck: Check = {
  name: "my-check",
  async run(context: CheckContext): Promise<Issue[]> {
    return withCleanup(context.page, async () => {
      const issues: Issue[] = [];

      // Your check code here
      // Open menus, modals, etc.

      // withCleanup handles cleanup automatically
      return issues;
    });
  },
};
```

**Why this matters:**

- Prevents "leftover" UI from interfering with subsequent checks
- Ensures page is in clean state for next check
- Works even if check throws error (finally block)
- Centralizes cleanup logic in one place

**Popup dismissal strategy:**

Popups (modals, overlays, email signups) can appear at ANY time:

- On page load (delayed by 2-5 seconds)
- After user interaction (scrolling, clicking)
- During viewport changes (desktop → mobile)

**Solution:** Use the shared popup guard helper so ESC-driven dismissal reopens anything you rely on (mobile nav, drawers, etc.).

```typescript
import { dismissPopupsWithGuards, GuardedUiTarget } from "../core/popup-guard";
import { isMobileNavOpen, openMobileNav } from "../core/find-mobile-nav";

const mobileNavGuard: GuardedUiTarget = {
  name: "mobile navigation",
  isOpen: () => isMobileNavOpen(mobileNav),
  open: () => openMobileNav(mobileNav),
  waitAfterOpenMs: 600,
};

await dismissPopupsWithGuards(page, [mobileNavGuard], {
  label: "mobile-menu-check",
});
```

Guards can be composed for any UI you open (mega menus, drawers, tooltips). Always keep them close to the check so future contributors see which surfaces must remain open.

**Why popup state verification matters:**

- `dismissPopups()` uses ESC key as primary strategy
- ESC can close ANY modal/drawer, including your test target
- Mobile menus, drawers, dialogs all respond to ESC
- Must verify state after dismissal, reopen if needed

**When to dismiss popups and verify state:**

- ✅ Before finding mobile nav/menus
- ✅ After setting mobile viewport (triggers new popups)
- ✅ Between each mobile menu check (popups can reappear)
- ✅ Before keyboard interaction tests
- ✅ After any operation that uses ESC key

### Mobile viewport resets

Mobile-only checks must restore the desktop viewport (or whatever size was provided) after they run. Capture the existing viewport via `const original = page.viewportSize();`, switch to the desired mobile breakpoint, and always call `page.setViewportSize(original!)` inside a `finally` block/`withCleanup` to avoid leaving later checks in a cramped layout. This also pairs nicely with popup guards—set viewport → dismiss popups with guards → run assertions → restore viewport.

### CRITICAL: Always use finder utilities for UI component detection

**NEVER use ad-hoc selectors** for common UI components. Always use the established finder utilities:

❌ **DON'T DO THIS:**

```typescript
// Ad-hoc footer detection - BAD!
const footer = page.locator("footer").first();
const footer = page.locator(".footer");
const footer = page.locator('[class*="footer"]');
```

✅ **DO THIS:**

```typescript
// Use established finder utility - GOOD!
import { findFooter } from "../core/find-footer.js";

const footer = await findFooter(page);
if (!footer) {
  logger.warn(`Footer not detected on ${page.url()}`);
  return issues; // Handle gracefully
}

// Now use footer for checks...
const footerLinks = await footer.locator("a").all();
```

**Why this matters:**

- Finder utilities work across 80%+ of Shopify themes (tested on 10+ sites)
- They handle edge cases (non-semantic HTML, popups, lazy loading)
- They use multi-strategy detection (semantic → ARIA → classes → scoring)
- They're well-documented and maintainable
- Ad-hoc selectors fail on different themes

**Available finder utilities:**

1. **`findNavigation(page)`** — Detects main site navigation

   - Location: `src/core/find-navigation.ts`
   - Success rate: 90% (9/10 sites)
   - Handles: Mega menus, non-semantic HTML, utility nav, mobile hamburgers

2. **`findFooter(page)`** — Detects site footer
   - Location: `src/core/find-footer.ts`
   - Success rate: 100% (tested sites)
   - Handles: Non-semantic HTML, multi-part footers, mobile accordions, popups

**For new UI components** (mobile menu, accordion, carousel, etc.):

- Follow `.github/DISCOVER_COMMON_PATTERNS.md` process
- Capture HTML from 10 reference sites
- Analyze patterns and create scoring-based finder
- Test to 80%+ success rate
- Document in `docs/{COMPONENT}-FINDER-SUMMARY.md`

---

## Example “prompt.md” content you should generate per issue

A concise, **actionable** fix prompt for the future fixer tool, for example:

```
You are fixing: Missing or non-functional “Skip to content” (WCAG 2.4.1).
Target page(s): /, /collections/all

Requirements:
- Insert a visually hidden yet focusable Skip to main content link whose href points at the main region and appears first inside the body.
- Ensure the main region has a matching id and receives focus when the skip link is triggered (for example by adding tabindex -1 before focusing).
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
