---
applyTo: "src/core/find-*.ts,utilities/test-*-finder.ts,docs/*-PATTERNS.md,docs/*-FINDER-SUMMARY.md"
---

# Detecting New UI Elements in Shopify Sites

**Context:** You are working on implementing robust detection for a UI component (navigation, footer, mobile menu, accordion, carousel, etc.) that must work across diverse Shopify themes without hardcoded selectors.

**Your Goal:** Create pattern-based detection logic with 80%+ success rate across our 10 reference Shopify sites.

---

## 🚨 CRITICAL: Follow the 6-Phase Process

**ALWAYS** follow the complete methodology in `.github/DISCOVER_COMMON_PATTERNS.md` when implementing detection for a new UI component. Do NOT skip phases or use ad-hoc selectors.

### Phase Overview

1. **Define the Component** — Document purpose, location, characteristics, edge cases
2. **Capture HTML** — Use `utilities/capture-page-html.ts` to get HTML from 10 reference sites
3. **Analyze Patterns** — Create `docs/{COMPONENT}-PATTERNS.md` with findings
4. **Implement Finder** — Create `src/core/find-{component}.ts` with scoring algorithm
5. **Test** — Create `utilities/test-{component}-finder.ts` and validate 80%+ success
6. **Document** — Create `docs/{COMPONENT}-FINDER-SUMMARY.md` with results

**DO NOT proceed to implementation (Phase 4) until you have completed pattern analysis (Phase 3).**

---

## 🛠️ Utilities Available

### 1. `utilities/capture-page-html.ts`

**Use for:** Capturing full page HTML from reference sites.

**When:** Phase 2 — Before analyzing patterns.

**How:**

```bash
# Capture one site
npx tsx utilities/capture-page-html.ts harris

# Capture all 10 sites
for site in harris koala strand universal camilla patagonia bassike kookai koh gymdirect; do
  npx tsx utilities/capture-page-html.ts $site
  sleep 2
done
```

**Output:** `pattern-analysis/{site-name}/desktop.html` and `mobile.html`

**Features:**

- Desktop (1920×1080) and mobile (375×667) viewports
- Auto-closes popups/modals (Klaviyo, etc.)
- Scrolls to bottom for lazy-loaded content

### 2. Test Suite Templates

**Use for:** Validating detection across reference sites.

**Reference implementations:**

- `utilities/test-nav-finder.ts` — Navigation detection tests (90% success rate)
- `utilities/test-footer-finder.ts` — Footer detection tests (100% success rate)

**Pattern to follow:**

```typescript
import { chromium } from "@playwright/test";
import { findComponent } from "../src/core/find-{component}.js";

const sites = [
  { name: "Harris Farm", url: "https://www.harrisfarm.com.au/" },
  // ... all 10 reference sites
];

async function testFinder() {
  const browser = await chromium.launch({ headless: false });
  const results = { success: 0, fail: 0 };

  for (const site of sites) {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    await page.goto(site.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const component = await findComponent(page);

    if (!component) {
      console.log(`❌ ${site.name}: No component found!`);
      results.fail++;
    } else {
      console.log(`✅ ${site.name}: Found component`);
      // Highlight with red outline for visual confirmation
      await component.evaluate((el: HTMLElement) => {
        el.style.outline = "5px solid red";
        el.style.outlineOffset = "5px";
      });
      results.success++;
      await page.waitForTimeout(2000);
    }

    await page.close();
  }

  console.log(`\nResults: ${results.success}/10 sites detected`);
  await browser.close();
}
```

### 3. Reference Finder Implementations

**Study these before implementing:**

- `src/core/find-navigation.ts` — Multi-strategy nav detection (90% success)
- `src/core/find-footer.ts` — Semantic footer detection (100% success)

**Key patterns used:**

- **Multi-strategy approach** — Semantic → ARIA → Classes → Scoring
- **Content validation** — Verify element contains expected content
- **Position checking** — Ensure element is in expected location
- **Negative signals** — Avoid false positives (e.g., filter utility nav)
- **Viewport awareness** — Desktop and mobile may differ

---

## ✅ Best Practices (DO)

1. **Start with semantic HTML** — `<footer>`, `<nav>`, `<main>`, `<section>`, etc.
2. **Validate content** — Check for expected text, links, keywords
3. **Use scoring algorithms** — Don't rely on single selector
4. **Test on ALL 10 sites** — Don't declare success until validated
5. **Handle both viewports** — Desktop and mobile patterns differ
6. **Provide fallbacks** — Graceful degradation when component not found
7. **Visual validation** — Highlight detected elements during tests
8. **Scroll before detecting** — Ensure lazy-loaded content is present
9. **Close popups first** — Dismiss modals that block content
10. **Position-aware scoring** — Location in DOM is a strong signal

---

## 🚫 Anti-Patterns (DON'T)

1. **DON'T hardcode theme classes** — `.footer-wrapper` won't work everywhere
2. **DON'T skip pattern analysis** — Never implement without reviewing 10 sites
3. **DON'T assume semantic HTML** — Many sites use `<div>` soup
4. **DON'T trust class names alone** — They're theme-specific
5. **DON'T skip mobile testing** — Mobile differs significantly from desktop
6. **DON'T ignore position** — Element location validates correct detection
7. **DON'T use ad-hoc selectors** — Always use established finder utilities
8. **DON'T batch all sites at once** — Run capture/tests one site at a time
9. **DON'T declare success prematurely** — 80%+ success required
10. **DON'T forget edge cases** — Document failures and outliers

---

## 📚 Required Documentation

Create these files during the process:

### Phase 3: Pattern Analysis

**File:** `docs/{COMPONENT}-PATTERNS.md`

**Contents:**

- Summary of findings from 10 sites
- Per-site analysis (semantic HTML, ARIA, classes, structure)
- Common patterns identified (with frequency counts)
- Edge cases discovered
- Recommended detection strategy

### Phase 6: Implementation Summary

**File:** `docs/{COMPONENT}-FINDER-SUMMARY.md`

**Contents:**

- Problem solved
- Approach taken (research → analysis → implementation)
- Test results table (all 10 sites)
- Success rate (must be 80%+)
- Key learnings
- Next steps (if any)

**See examples:**

- `docs/NAV-FINDER-SUMMARY.md` (navigation)
- `docs/FOOTER-FINDER-SUMMARY.md` (footer)

---

## 🧪 Testing Requirements

**Minimum criteria:**

- ✅ Tests created in `utilities/test-{component}-finder.ts`
- ✅ All 10 reference sites tested
- ✅ Both desktop AND mobile viewports (if applicable)
- ✅ Visual confirmation (red outline highlights)
- ✅ Console logs showing what was detected
- ✅ Success rate calculated and displayed
- ✅ **80%+ success rate achieved** (or edge cases documented)

**Run tests:**

```bash
npx tsx utilities/test-{component}-finder.ts
```

**Expected output:**

```
Testing: Harris Farm
✅ Found component
   Tag: <footer>
   Classes: site-footer footer--global
   Preview: © 2025 Harris Farm Markets...

Testing: Koala
✅ Found component
...

Results: 9/10 sites detected (90%)
```

---

## 🔄 Iteration Process

If tests fail on any site:

1. **Analyze failure** — Open `pattern-analysis/{site}/desktop.html` or `mobile.html`
2. **Document edge case** — Add to `docs/{COMPONENT}-PATTERNS.md`
3. **Update scoring** — Adjust weights or add new signals in `src/core/find-{component}.ts`
4. **Re-run tests** — Validate fix doesn't break other sites
5. **Document fix** — Add to "Critical Fixes" or "Key Learnings" in summary doc

**Repeat until 80%+ success rate achieved.**

---

## 📋 Pre-Implementation Checklist

Before writing finder code, ensure you have:

- [ ] Defined component characteristics (Phase 1)
- [ ] Captured HTML from all 10 reference sites (Phase 2)
- [ ] Created `docs/{COMPONENT}-PATTERNS.md` with analysis (Phase 3)
- [ ] Reviewed existing finders (`find-navigation.ts`, `find-footer.ts`)
- [ ] Identified 3+ common patterns across sites
- [ ] Documented edge cases and outliers
- [ ] Planned scoring algorithm (semantic → ARIA → classes → content → position)

**Only proceed to implementation when all items are checked.**

---

## 📋 Implementation Checklist

When writing `src/core/find-{component}.ts`:

- [ ] Multi-strategy approach (semantic first, fallbacks second)
- [ ] Content validation function
- [ ] Position checking (if applicable)
- [ ] Scoring algorithm with clear weights
- [ ] Negative signal filtering (avoid false positives)
- [ ] Return `null` gracefully when not found
- [ ] Handle both visible and hidden elements appropriately
- [ ] TypeScript types exported (`{Component}Candidate` interface)
- [ ] JSDoc comments explaining approach

---

## 📋 Post-Implementation Checklist

After creating the finder:

- [ ] Test suite created in `utilities/test-{component}-finder.ts`
- [ ] All 10 sites tested (desktop + mobile if applicable)
- [ ] 80%+ success rate achieved
- [ ] Visual validation performed (red outlines)
- [ ] `docs/{COMPONENT}-FINDER-SUMMARY.md` created
- [ ] Edge cases documented
- [ ] Failures analyzed and explained
- [ ] Usage examples added to summary doc
- [ ] Main documentation updated (if needed)
- [ ] Commit message follows convention: `feat(detect): add {component} finder [tested: X/10]`

---

## 🔗 Reference Sites (10 Total)

Use these for ALL pattern discovery and testing:

1. **harris** — https://www.harrisfarm.com.au/ (grocery, semantic HTML)
2. **koala** — https://au.koala.com/ (homewares, mega footer)
3. **strand** — https://www.strandbags.com.au/ (fashion, accordion mobile)
4. **universal** — https://www.universalstore.com/ (fashion, large catalog)
5. **camilla** — https://camilla.com (luxury fashion, ARIA-heavy, Klaviyo popup)
6. **patagonia** — https://www.patagonia.com.au/ (outdoor, minimal design)
7. **bassike** — https://www.bassike.com/ (fashion, simple/clean)
8. **kookai** — https://www.kookai.com.au/ (fashion, complex)
9. **koh** — https://koh.com/ (DTC cleaning products)
10. **gymdirect** — https://gymdirect.com.au/ (fitness/equipment)

**Diversity:** Mix of industries, complexity, semantic approaches, geographic regions.

---

## 🎯 Success Criteria Summary

A complete implementation requires:

1. ✅ **Pattern analysis** — `docs/{COMPONENT}-PATTERNS.md` created
2. ✅ **Finder implementation** — `src/core/find-{component}.ts` with multi-strategy approach
3. ✅ **Test suite** — `utilities/test-{component}-finder.ts` created
4. ✅ **80%+ success rate** — Validated on all 10 reference sites
5. ✅ **Documentation** — `docs/{COMPONENT}-FINDER-SUMMARY.md` with results
6. ✅ **Visual validation** — Red outlines confirm correct detection
7. ✅ **Edge cases handled** — Failures documented and explained

**DO NOT merge or declare complete until all criteria are met.**

---

## 🆘 When to Use This Process

**Use this process when:**

- Implementing detection for mobile menus, hamburger buttons, accordions, carousels, breadcrumbs, product grids, filters, modals, drawers, etc.
- Any UI component that varies across Shopify themes
- You need robust detection that works for 80%+ of sites

**Don't use for:**

- Standard HTML elements (`<button>`, `<input>`, `<a>`) where native selectors work
- Components with universal HTML structure (e.g., `<form>` elements)
- One-off fixes for specific client sites (use targeted selectors instead)

---

## 📖 Full Methodology Reference

For complete details, see: **`.github/DISCOVER_COMMON_PATTERNS.md`**

This file contains:

- Detailed phase-by-phase instructions
- Code templates for each phase
- Troubleshooting guide
- Best practices and anti-patterns
- Real-world examples (nav, footer)

**Always consult this document when implementing new component detection.**

---

**Last Updated:** November 2025  
**Maintained By:** Shopify A11y Audit Team
