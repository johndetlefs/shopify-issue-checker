# Shopify Accessibility & UX “Pitch Pack” Generator — README

This repository contains a **read‑only sales/lead‑gen tool** that scans a public Shopify storefront to surface **high‑impact accessibility & usability** issues and emits a tidy **pitch pack** (summary, screenshots, issue cards, fix prompts, and an outreach email draft).

> Phase 1: evidence only. No theme edits. WCAG 2.1 AA baseline.

---

## What you get

- `/clients/{client-kebab}/pitch-pack/` containing:

  - `summary.md` — executive summary and top wins
  - `email.md` — ready‑to‑edit client email
  - `score.json` — machine‑readable issue inventory
  - `issues/*` — per‑issue folder: finding, prompt, screenshot, raw data

### Implemented checks

1. **Skip to content** — 3 checks:
   - Missing skip link
   - Skip link not first focusable
   - Broken skip link target
2. **Smart navigation finder** — Pattern-based detection with scoring (see `docs/NAV-FINDER-SUMMARY.md`)
3. **Smart footer finder** — Pattern-based detection with content validation (see `docs/FOOTER-FINDER-SUMMARY.md`)
4. **Mega-menu comprehensive** — 17 checks covering:
   - **Keyboard accessibility** (10): Navigation, focus, ARIA, mobile hamburger
   - **Screen reader support** (4): Links as buttons, alt text, form labels, empty links, landmarks
   - **Usability** (3): Color contrast, touch targets, vague link text

### Planned checks

- **Axe-core** automated WCAG 2.1 AA scan
- Headings/landmarks, focus-visible

See `.github/IMPLEMENTATION_PLAN.md` Step 10 for full details.

---

## Prerequisites

- **Node.js LTS**
- **VS Code** with **Playwright** extension
- (Optional) **Playwright MCP server** for agent‑driven flows

See `docs/ENV_CHECKLIST.md` for a quick verification list.

---

## Quick start

1. Open the repo in VS Code.
2. Run the task: **Run Task → “Sales Audit: generate pitch pack”**.
3. Enter **Client Name** and **Shop URL** (e.g., `https://example.myshopify.com`).
4. Inspect output in `/clients/{client-kebab}/pitch-pack/`.

> CLI alternative (if scripts are set): `npm run audit -- "Client Name" https://store.url`

---

## How to use the pitch pack

- Pull **2–3 top issues** and 1–2 **screenshots** into your outreach.
- Paste/adjust `email.md` into your email client.
- Offer a fixed‑fee remediation pass with verification.

---

## WCAG & Shopify notes

- Target **WCAG 2.1 AA**.
- Never remove keyboard outlines; customize via `:focus-visible`.
- For Shopify fixes (Phase 2), prefer Liquid/sections/snippets and minimal TS.

---

## Troubleshooting

- **No issues found**: try a product or collection page, or run during business hours when menus/banners render fully.
- **Blocked by bot checks**: switch to the store’s `.myshopify.com` domain if public.
- **Empty screenshots**: ensure Playwright has browser binaries installed and headless mode is permitted.

---

## Next steps (Phase 2 — separate tool)

- A fixer utility that pulls the theme, reads each `issues/*/prompt.md`, applies minimal patches, and re‑verifies.

---

## Contributing

- Prefer **TypeScript**.
- Keep checks small, composable, and aligned with WCAG 2.1 AA.
- Add rationale and a Copilot‑ready prompt to every new issue type.
- Use `withCleanup` plus `dismissPopupsWithGuards` (`src/core/popup-guard.ts`) whenever a check opens drawers/menus or dismisses modals so the next check starts from a clean, predictable UI state.
- **For new UI component detection**, follow the process in `.github/DISCOVER_COMMON_PATTERNS.md`:
  1. Capture HTML from 10 reference Shopify sites
  2. Analyze patterns (semantic, ARIA, classes, content)
  3. Implement scoring-based detection with fallbacks
  4. Test and iterate to 80%+ success rate
  - See completed examples: `docs/NAV-FINDER-SUMMARY.md`, `docs/FOOTER-FINDER-SUMMARY.md`

---

## References

- WCAG 2.1 AA success criteria (Bypass Blocks 2.4.1, Keyboard 2.1.1, Focus Visible 2.4.7, Contrast 1.4.3, etc.)
- WAI‑ARIA Authoring Practices for menus/menus buttons
