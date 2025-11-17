# Fixture Accuracy Audit Plan

## Purpose

Maintain a repeatable, offline harness that validates our navigation/mobile/footer detectors (and future checks like axe-core scans) against a frozen set of Shopify storefront snapshots. The goal is to catch regressions and false positives before they reach client-facing pitch packs.

## Directory Layout

```
fixtures/
  benchmark-matrix.json        # Metadata + expectations per store
  synthetic/
    no-nav/
      desktop.html
      mobile.html
pattern-analysis/              # Source snapshots captured from live sites
  harris/
    desktop.html
    mobile.html
  ...
artifacts/
  fixture-audit/
    2025-11-17T05-12-33Z/
      results.json
      summary.md
      axe/
        harris/
          desktop.json
          mobile.json
```

- `pattern-analysis/*/*.html` remains the canonical capture source.
- `fixtures/benchmark-matrix.json` references those HTML files so we can update expectations without copying large snapshots.
- `artifacts/fixture-audit/<timestamp>` stores each audit run for traceability.

## Expectation Schema

Each fixture entry defines the ground truth for multiple check families. Fields are optional so we can introduce coverage incrementally.

```jsonc
{
  "name": "Harris Farm",
  "slug": "harris",
  "baseUrl": "https://www.harrisfarm.com.au/",
  "desktopHtml": "pattern-analysis/harris/desktop.html",
  "mobileHtml": "pattern-analysis/harris/mobile.html",
  "expectations": {
    "navigation": { "shouldFind": true, "minLinks": 6, "maxLinks": 20 },
    "footer": { "shouldFind": true },
    "mobile-navigation": {
      "shouldFind": true,
      "notes": "Expect drawer detection via data-hamburger pattern"
    },
    "axe-core": {
      "enabled": true,
      "maxViolations": 0,
      "tags": ["wcag2a", "wcag2aa", "wcag21aa"]
    }
  }
}
```

Future checks (axe, skip link, mega menu, etc.) can extend `expectations` with new namespaces without schema churn.

## Workflow

1. **Capture/refresh snapshots** using `utilities/capture-page-html.ts` (desktop + mobile) and drop them into `pattern-analysis/<store>/`.
2. **Update expectations** in `fixtures/benchmark-matrix.json` when the site’s ground truth changes (requires manual review + sign-off).
3. **Run the fixture audit** via `npm run audit:fixtures` (added in this change) or directly with `npx tsx utilities/run-fixture-audit.ts`.
4. **Review artifacts** inside `artifacts/fixture-audit/<timestamp>/` for:

- `summary.md` + `results.json` (high-level status)
- Failure screenshots per check/viewport
- `axe/<slug>/<viewport>.json` snapshots for WCAG 2.1A/AA automated results

5. **Gate PRs** by running the fixture audit in CI; failures indicate a regression or a deliberate expectation update that needs validation.

## Scaling Guidelines

- Add new fixtures whenever we onboard a new reference site or uncover a tricky pattern.
- Pair any expectation change with a short note in the PR explaining why the ground truth shifted.
- Keep synthetic fixtures (e.g., `fixtures/synthetic/no-nav`) to exercise negative paths and reduce false positives.
- When a new check ships, add a corresponding expectation stanza even if only a subset of fixtures cover it; this keeps the schema forward-compatible.
- For axe-core, prefer setting `maxViolations` per fixture only when we expect a clean slate; otherwise leave undefined to always pass while still emitting snapshots.

## Current Offline Coverage

- `navigation` (desktop) — ensures main nav detection + link counts stay within thresholds.
- `footer` (desktop + mobile) — verifies footer finder stability.
- `mobile-navigation` (mobile) — asserts our hamburger/drawer finder keeps detecting triggers + drawers in the mobile snapshots.
- `axe-core` (desktop + mobile) — captures WCAG 2.1 A/AA violation JSON for every fixture/viewport so we can diff real regressions over time.
