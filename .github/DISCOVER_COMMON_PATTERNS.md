# Discovering Common Patterns Across Shopify Sites

This document outlines our methodology for discovering robust, generic patterns that work across diverse Shopify implementations. Use this process whenever implementing detection for a new UI component (headers, footers, mobile menus, accordions, carousels, etc.).

---

## Overview

**Problem:** Shopify themes vary wildly in their HTML structure, class naming, and semantic markup. A detection strategy that works for one site may fail on another.

**Solution:** Research-driven pattern discovery using a representative sample of real Shopify sites, followed by iterative testing and refinement.

**Goal:** Create detection logic that:

- Works for 80%+ of Shopify sites
- Uses semantic/structural patterns over site-specific classes
- Gracefully falls back when ideal patterns aren't found
- Is maintainable and well-documented

---

## The Process

### Phase 1: Define the Target Component

Before diving into HTML analysis, clarify exactly what you're detecting.

**Checklist:**

- [ ] **Component name** (e.g., "Site Footer", "Mobile Menu Hamburger", "Product Accordion")
- [ ] **User-facing purpose** (e.g., "Site-wide footer with links, policies, contact info")
- [ ] **Expected location** (e.g., "Bottom of page in `<footer>`")
- [ ] **Key characteristics** (e.g., "Links to policies, social media, newsletter signup")
- [ ] **Edge cases** (e.g., "Sites without semantic `<footer>`, multi-column layouts")
- [ ] **Viewport considerations** (e.g., "Desktop: multi-column. Mobile: accordion or stacked")

**Example:**

```markdown
Component: Site Footer
Purpose: Global footer with links, policies, contact, social
Location: Bottom of page, last major element before </body>
Characteristics: Multiple link groups, copyright notice, social icons
Edge Cases: Non-semantic HTML (divs), accordion footers on mobile, mega footers
```

---

### Phase 2: Capture Real-World HTML

Use our **reference site list** (see Appendix A) to gather raw HTML from actual Shopify stores.

#### 2.1 Create Capture Utility

Create a script in `utilities/capture-page-html.ts`:

```typescript
/**
 * Capture full page HTML for pattern analysis
 * Captures the ENTIRE page at both desktop and mobile viewports.
 *
 * Usage: npx tsx utilities/capture-page-html.ts {site-key}
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";

const sites: Record<string, string> = {
  harris: "https://www.harrisfarm.com.au/",
  koala: "https://au.koala.com/",
  strand: "https://www.strandbags.com.au/",
  universal: "https://www.universalstore.com/",
  camilla: "https://camilla.com",
  patagonia: "https://www.patagonia.com.au/",
  bassike: "https://www.bassike.com/",
  kookai: "https://www.kookai.com.au/",
  koh: "https://koh.com/",
  themandagies: "https://themandagies.com.au/",
};

async function captureHTML(url: string, name: string, component: string) {
  const browser = await chromium.launch({ headless: false });

  // Desktop viewport
  const desktopPage = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  await desktopPage.goto(url, { waitUntil: "domcontentloaded" });
  await desktopPage.waitForTimeout(3000);

  // Close any popups/modals (common on Shopify sites)
  try {
    const closeButtons = [
      'button[aria-label*="close" i]',
      'button[aria-label*="dismiss" i]',
      '[class*="close" i]:visible',
      '[class*="modal" i] button:visible',
      ".klaviyo-close-form",
    ];
    for (const selector of closeButtons) {
      const button = desktopPage.locator(selector).first();
      if ((await button.count()) > 0 && (await button.isVisible())) {
        await button.click({ timeout: 1000 });
        await desktopPage.waitForTimeout(500);
        break;
      }
    }
  } catch {
    // Ignore errors
  }

  // Scroll to bottom to ensure footer is loaded
  await desktopPage.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight)
  );
  await desktopPage.waitForTimeout(2000);

  const desktopHTML = await desktopPage.content();
  mkdirSync(`./pattern-analysis/${component}/${name}`, { recursive: true });
  writeFileSync(
    `./pattern-analysis/${component}/${name}/desktop.html`,
    desktopHTML
  );

  // Mobile viewport
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 667 },
  });

  await mobilePage.goto(url, { waitUntil: "domcontentloaded" });
  await mobilePage.waitForTimeout(3000);

  // Scroll to bottom
  await mobilePage.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight)
  );
  await mobilePage.waitForTimeout(2000);

  const mobileHTML = await mobilePage.content();
  writeFileSync(
    `./pattern-analysis/${component}/${name}/mobile.html`,
    mobileHTML
  );

  await browser.close();
  console.log(`✅ ${name}: Captured desktop + mobile HTML`);
}

// Run for one site at a time
const site = process.argv[2];
if (!site || !sites[site]) {
  console.log("Usage: npx tsx utilities/capture-{component}-html.ts <site>");
  console.log("Sites:", Object.keys(sites).join(", "));
  process.exit(1);
}

captureHTML(sites[site], site, "{component}").catch(console.error);
```

#### 2.2 Capture All Sites

Run the script for each reference site:

```bash
for site in harris koala strand universal camilla patagonia bassike kookai koh gymdirect; do
  npx tsx utilities/capture-page-html.ts $site
  sleep 2
done
```

**Output:** `./pattern-analysis/{site-name}/desktop.html` and `mobile.html` for all 10 sites.

---

### Phase 3: Manual Analysis & Pattern Documentation

Open each HTML file and analyze the component structure. Look for:

1. **Semantic HTML** — `<footer>`, `<nav>`, `<section>`, `<aside>`, etc.
2. **ARIA attributes** — `role`, `aria-label`, `aria-labelledby`, etc.
3. **Common class patterns** — Prefixes/suffixes (e.g., `.footer__`, `--mobile`, `-links`)
4. **Element relationships** — Nesting, sibling structures, grid layouts
5. **Visibility patterns** — `display: none`, `hidden` attributes, CSS media queries
6. **Content characteristics** — Link groups, copyright text, social icons, forms
7. **Position in DOM** — Distance from `</body>`, sibling elements

**Create documentation file:** `docs/{COMPONENT}-PATTERNS.md`

**Template:**

```markdown
# {Component} Pattern Analysis

## Summary of Findings (10 Shopify Sites)

### Site 1 (example.com)

- **Semantic HTML**: ✅ Uses `<footer>` / ❌ Uses `<div>`
- **ARIA labels**: Yes/No
- **Classes**: `.class-name-1`, `.class-name-2`
- **Structure**: Describe hierarchy (columns, sections, etc.)
- **Desktop vs Mobile**: Differences (accordion vs expanded, etc.)
- **Content groups**: X link columns, copyright, social icons, newsletter
- **Unique characteristics**: Special features

### Site 2 (example2.com)

...

---

## Common Patterns Identified

### Pattern 1: Semantic Footer Element

- **Frequency**: 7/10 sites
- **Selectors**: `<footer>`, `[role="contentinfo"]`
- **ARIA**: `aria-label="Site footer"` (less common)
- **Location**: Last major element before `</body>`
- **Reliability**: High ✅

### Pattern 2: Class-Based Detection

- **Frequency**: 9/10 sites
- **Common prefixes**: `footer__`, `site-footer`, `page-footer`
- **Common suffixes**: `-footer`, `__footer`, `--global`
- **Reliability**: High ✅ (more consistent than nav)

### Pattern 3: Content Analysis

- **Frequency**: 10/10 sites
- **Characteristics**:
  - Multiple link groups (2-6 columns)
  - Copyright text with year (©, "Copyright", current year)
  - Social media icons/links
  - Policy links (Privacy, Terms, Shipping, Returns)
- **Reliability**: Very High ✅

### Pattern 4: Position in DOM

- **Frequency**: 10/10 sites
- **Location**: Within last 10% of document height
- **No siblings after**: Usually last major element
- **Reliability**: High ✅

---

## Edge Cases

1. **Multi-part footers** (4/10 sites)

   - Example: Site 1 has upper footer + lower footer
   - Solution: Detect parent container

2. **Accordion footers on mobile** (6/10 sites)

   - Issue: Link groups collapsed behind buttons
   - Solution: Detect both expanded and collapsed states

3. **Newsletter signup forms** (8/10 sites)
   - Issue: May have multiple forms on page
   - Solution: Footer-specific form detection

---

## Recommended Detection Strategy

1. **Try semantic first**: `footer`, `[role="contentinfo"]`
2. **Validate content**: Check for copyright, policy links, social
3. **Fallback to classes**: If semantic unclear
4. **Position check**: Ensure it's actually at bottom of page

See implementation in `src/core/find-{component}.ts`
```

---

### Phase 4: Implement Scoring-Based Detection

Based on your analysis, create a **scoring algorithm** that evaluates candidate elements.

#### 4.1 Create Finder Utility

`src/core/find-{component}.ts`:

```typescript
import { Page, Locator } from "@playwright/test";

export interface ComponentCandidate {
  locator: Locator;
  score: number;
  reason: string[];
  // ... component-specific metadata
}

export async function findComponent(page: Page): Promise<Locator | null> {
  // Strategy 1: Semantic HTML (most reliable for footer)
  const semanticFooter = page.locator("footer").first();
  if (
    (await semanticFooter.count()) > 0 &&
    (await semanticFooter.isVisible())
  ) {
    // Validate it's actually a site footer
    const isValid = await validateFooter(semanticFooter);
    if (isValid) {
      return semanticFooter;
    }
  }

  // Strategy 2: ARIA role
  const ariaFooter = page.locator('[role="contentinfo"]').first();
  if ((await ariaFooter.count()) > 0 && (await ariaFooter.isVisible())) {
    return ariaFooter;
  }

  // Strategy 3: Known class patterns
  const knownClasses = [
    ".site-footer:visible",
    ".page-footer:visible",
    ".footer:visible",
    "[class*='footer']:visible",
  ];

  for (const selector of knownClasses) {
    const element = page.locator(selector).last(); // Footer is usually last
    if ((await element.count()) > 0 && (await element.isVisible())) {
      const isValid = await validateFooter(element);
      if (isValid) {
        return element;
      }
    }
  }

  // Strategy 4: Score all candidates
  const candidates = await scoreCandidates(page);

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const winner = candidates[0];

    if (winner.score > 0) {
      return winner.locator;
    }
  }

  return null;
}

async function validateFooter(element: Locator): Promise<boolean> {
  try {
    // Check for common footer content
    const text = (await element.textContent()) || "";

    // Should have copyright symbol or text
    const hasCopyright = /©|copyright/i.test(text);

    // Should have common footer keywords
    const hasFooterKeywords =
      /(privacy|terms|contact|about|shipping|returns)/i.test(text);

    // Should be near bottom of page
    const box = await element.boundingBox();
    if (!box) return false;

    const viewportSize = await element.page().viewportSize();
    if (!viewportSize) return false;

    const distanceFromBottom = viewportSize.height - box.y;
    const isNearBottom = distanceFromBottom < viewportSize.height * 0.3;

    return hasCopyright || (hasFooterKeywords && isNearBottom);
  } catch {
    return false;
  }
}

async function scoreCandidates(page: Page): Promise<ComponentCandidate[]> {
  // Get all potential candidates
  const elements = await page
    .locator('footer, [role="contentinfo"], [class*="footer"]')
    .all();

  const candidates: ComponentCandidate[] = [];

  for (const element of elements) {
    const score = await calculateScore(page, element);
    if (score !== null) {
      candidates.push(score);
    }
  }

  return candidates;
}

async function calculateScore(
  page: Page,
  element: Locator
): Promise<ComponentCandidate | null> {
  try {
    const isVisible = await element.isVisible();
    if (!isVisible) return null;

    let score = 0;
    const reasons: string[] = [];

    // Semantic HTML
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === "footer") {
      score += 30;
      reasons.push("+30: Semantic <footer> element");
    }

    // ARIA role
    const role = await element.getAttribute("role");
    if (role === "contentinfo") {
      score += 25;
      reasons.push("+25: ARIA role='contentinfo'");
    }

    // Content signals
    const text = (await element.textContent()) || "";

    if (/©|copyright/i.test(text)) {
      score += 20;
      reasons.push("+20: Contains copyright");
    }

    if (/(privacy|terms)/i.test(text)) {
      score += 15;
      reasons.push("+15: Contains policy links");
    }

    if (/(contact|about)/i.test(text)) {
      score += 10;
      reasons.push("+10: Contains contact/about");
    }

    // Position in DOM
    const box = await element.boundingBox();
    if (box) {
      const viewportSize = await page.viewportSize();
      if (viewportSize) {
        const distanceFromBottom = viewportSize.height - box.y;
        if (distanceFromBottom < viewportSize.height * 0.2) {
          score += 15;
          reasons.push("+15: Located near bottom of page");
        }
      }
    }

    // Class keywords
    const classes = (await element.getAttribute("class")) || "";
    if (/footer/i.test(classes)) {
      score += 10;
      reasons.push("+10: Class contains 'footer'");
    }

    // Negative signals
    if (/header|nav|main|article/i.test(classes)) {
      score -= 30;
      reasons.push("-30: Class suggests not footer");
    }

    return {
      locator: element,
      score,
      reason: reasons,
    };
  } catch (error) {
    return null;
  }
}
```

**Key Principles:**

- **Semantic first** — `<footer>` is highly reliable
- **Content validation** — Check for copyright, policy links
- **Position aware** — Footer should be near bottom
- **Multiple strategies** — Semantic → ARIA → Classes → Scoring
- **Negative signals** — Avoid false positives (header, nav)

---

### Phase 5: Create Test Suite

`utilities/test-{component}-finder.ts`:

```typescript
import { chromium } from "@playwright/test";
import { findComponent } from "../src/core/find-{component}";

const sites = [
  { name: "Harris Farm", url: "https://www.harrisfarm.com.au/" },
  { name: "Koala", url: "https://au.koala.com/" },
  { name: "Strand Bags", url: "https://www.strandbags.com.au/" },
  { name: "Universal Store", url: "https://www.universalstore.com/" },
  { name: "Camilla", url: "https://camilla.com" },
  { name: "Patagonia", url: "https://www.patagonia.com.au/" },
  { name: "Bassike", url: "https://www.bassike.com/" },
  { name: "Kookai", url: "https://www.kookai.com.au/" },
  { name: "Koh", url: "https://koh.com/" },
  { name: "The Mandagies", url: "https://themandagies.com.au/" },
];

async function testFinder() {
  const browser = await chromium.launch({ headless: false });

  const results = {
    desktop: { success: 0, fail: 0 },
    mobile: { success: 0, fail: 0 },
  };

  for (const site of sites) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${site.name}`);
    console.log("=".repeat(60));

    // Test desktop viewport
    const desktopPage = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    await desktopPage.goto(site.url, {
      waitUntil: "domcontentloaded",
    });
    await desktopPage.waitForTimeout(3000);

    // Scroll to bottom
    await desktopPage.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
    await desktopPage.waitForTimeout(2000);

    const component = await findComponent(desktopPage);

    if (!component) {
      console.log("❌ Desktop: No component found!");
      results.desktop.fail++;
    } else {
      const classes = (await component.getAttribute("class")) || "(none)";
      const tag = await component.evaluate((el) => el.tagName);
      const text = await component.textContent();
      const preview = text?.substring(0, 100).replace(/\s+/g, " ") || "";

      console.log("✅ Desktop: Found component");
      console.log(`   Tag: <${tag.toLowerCase()}>`);
      console.log(`   Classes: ${classes}`);
      console.log(`   Preview: ${preview}...`);

      // Highlight with red outline
      await component.evaluate((el: HTMLElement) => {
        el.style.outline = "5px solid red";
        el.style.outlineOffset = "5px";
      });

      results.desktop.success++;
      await desktopPage.waitForTimeout(3000);
    }

    await desktopPage.close();

    // Test mobile viewport
    const mobilePage = await browser.newPage({
      viewport: { width: 375, height: 667 },
    });

    await mobilePage.goto(site.url, {
      waitUntil: "domcontentloaded",
    });
    await mobilePage.waitForTimeout(3000);

    // Scroll to bottom
    await mobilePage.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
    await mobilePage.waitForTimeout(2000);

    const mobileComponent = await findComponent(mobilePage);

    if (!mobileComponent) {
      console.log("❌ Mobile: No component found!");
      results.mobile.fail++;
    } else {
      const classes = (await mobileComponent.getAttribute("class")) || "(none)";
      const tag = await mobileComponent.evaluate((el) => el.tagName);

      console.log("✅ Mobile: Found component");
      console.log(`   Tag: <${tag.toLowerCase()}>`);
      console.log(`   Classes: ${classes}`);

      await mobileComponent.evaluate((el: HTMLElement) => {
        el.style.outline = "5px solid red";
        el.style.outlineOffset = "5px";
      });

      results.mobile.success++;
      await mobilePage.waitForTimeout(3000);
    }

    await mobilePage.close();
  }

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log("TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`Desktop: ${results.desktop.success}/10 sites detected`);
  console.log(`Mobile:  ${results.mobile.success}/10 sites detected`);
  console.log(
    `Overall: ${
      results.desktop.success + results.mobile.success
    }/20 tests passed`
  );
  console.log("=".repeat(60));
}

testFinder().catch(console.error);
```

**Run tests:**

```bash
npx tsx utilities/test-{component}-finder.ts
```

**Expected output:**

- Visual confirmation (red outlines on each site)
- Console logs showing which elements were found
- Success rate (e.g., "9/10 sites detected correctly")

---

### Phase 6: Document & Iterate

#### 6.1 Create Summary Document

`docs/{COMPONENT}-FINDER-SUMMARY.md`:

```markdown
# {Component} Finder - Implementation Summary

## Problem Solved

[Describe the challenge this finder addresses]

## Approach Taken

### Phase 1: Research

- Captured HTML from 10 Shopify sites
- Documented patterns in {COMPONENT}-PATTERNS.md

### Phase 2: Pattern Analysis

Key findings:

- X/10 sites use semantic HTML
- Y/10 sites use specific class patterns
- Z edge cases identified

### Phase 3: Scoring System

Created heuristic algorithm with:

- Positive signals: [list]
- Negative signals: [list]
- Critical fixes: [list any important scoring adjustments]

### Phase 4: Multi-Strategy Implementation

1. Semantic HTML (highest priority)
2. ARIA roles (high reliability)
3. Class patterns (common fallback)
4. Content validation (verify it's correct element)
5. Position checking (ensure proper location)

## Test Results

| Site        | Desktop | Mobile | Notes                    |
| ----------- | ------- | ------ | ------------------------ |
| Harris Farm | ✅      | ✅     | Standard semantic footer |
| Koala       | ✅      | ✅     | Multi-part footer        |
| ...         | ...     | ...    | ...                      |

**Success Rate:** X/10 desktop, Y/10 mobile

## Key Learnings

1. Never assume semantic HTML
2. Validate content to avoid false positives
3. Position in DOM is a strong signal
4. Multiple strategies needed

## Next Steps

- [ ] Test on 10 more sites
- [ ] Refine scoring weights
- [ ] Handle edge case: [specific case]
```

#### 6.2 Update Main Documentation

Reference the new process in `.github/copilot-instructions.md` or project README:

```markdown
## Pattern Discovery Process

When implementing detection for new UI components, follow the methodology in `.github/DISCOVER_COMMON_PATTERNS.md`:

1. Define component characteristics
2. Capture HTML from 10 reference sites
3. Analyze and document patterns
4. Implement scoring-based detection
5. Test and iterate to 80%+ success rate

See completed examples:

- Navigation finder: `docs/NAV-FINDER-SUMMARY.md`
- Footer finder: `docs/FOOTER-FINDER-SUMMARY.md` (if completed)
```

#### 6.3 Iterate Based on Failures

If tests fail on any sites:

1. **Analyze failure** — Why wasn't the component detected?
2. **Update pattern docs** — Add edge case to `{COMPONENT}-PATTERNS.md`
3. **Adjust scoring** — Tweak weights or add new signals
4. **Re-test** — Run full test suite again
5. **Document fix** — Add to "Critical Fixes" section

**Repeat until 80%+ success rate achieved.**

---

## Best Practices

### DO ✅

- **Use semantic selectors first** — `<footer>`, `<nav>`, `<main>`, etc.
- **Validate content** — Check for expected text/links/patterns
- **Score candidates** — Don't hardcode site-specific classes
- **Test on real sites** — Use actual Shopify stores, not synthetic examples
- **Document edge cases** — Every failure teaches us something
- **Use viewport-aware detection** — Desktop ≠ mobile
- **Provide fallbacks** — Graceful degradation is key
- **Highlight visually** — Red outlines help validate detection
- **Scroll to element** — Ensure it's loaded before testing (especially footers)
- **Check position in DOM** — Verify element is in expected location
- **Handle popups/modals** — Close aggressive overlays before capturing/testing (e.g., Camilla, Klaviyo forms)

### DON'T ❌

- **Don't hardcode theme classes** — `.footer-wrapper` won't work everywhere
- **Don't assume semantic HTML** — Many sites use `<div>` soup
- **Don't skip content validation** — Class names can be misleading
- **Don't stop at first match** — Validate it's the correct element
- **Don't skip mobile testing** — Mobile patterns differ significantly
- **Don't ignore position** — Element location is often a strong signal
- **Don't trust class names alone** — They're theme-specific
- **Don't forget to scroll** — Lazy-loaded content may not be in initial DOM

---

## Appendix A: Reference Site List

Our **10 representative Shopify sites** for pattern analysis:

```typescript
const REFERENCE_SITES: Record<string, string> = {
  harris: "https://www.harrisfarm.com.au/", // Grocery, semantic HTML
  koala: "https://au.koala.com/", // Homewares, mega footer
  strand: "https://www.strandbags.com.au/", // Fashion, accordion mobile
  universal: "https://www.universalstore.com/", // Fashion, large catalog
  camilla: "https://camilla.com", // Luxury fashion, ARIA-heavy
  patagonia: "https://www.patagonia.com.au/", // Outdoor, minimal design
  bassike: "https://www.bassike.com/", // Fashion, simple/clean
  kookai: "https://www.kookai.com.au/", // Fashion, complex
  koh: "https://koh.com/", // DTC cleaning products
  gymdirect: "https://gymdirect.com.au/", // Fitness/equipment
};
```

**Why these sites:**

- Mix of industries (fashion, grocery, homewares, outdoor)
- Mix of complexity (simple layouts, mega footers, accordions)
- Mix of semantic approaches (semantic HTML, ARIA, class-based)
- All real Shopify Plus or standard Shopify stores
- All publicly accessible

---

## Appendix B: Template Files

Quick reference for creating new component detection:

### Capture Utility

- **File:** `utilities/capture-page-html.ts`
- **Purpose:** Download full page HTML from reference sites (desktop + mobile)
- **Run:** `npx tsx utilities/capture-page-html.ts {site-key}`

### Finder Implementation

- **File:** `src/core/find-{component}.ts`
- **Exports:** `find{Component}(page: Page): Promise<Locator | null>`
- **Approach:** Multi-strategy with scoring

### Test Suite

- **File:** `utilities/test-{component}-finder.ts`
- **Purpose:** Validate detection on all reference sites
- **Run:** `npx tsx utilities/test-{component}-finder.ts`

### Documentation

- **File 1:** `docs/{COMPONENT}-PATTERNS.md` — Pattern analysis
- **File 2:** `docs/{COMPONENT}-FINDER-SUMMARY.md` — Implementation summary

---

## Real-World Example: Navigation Finder

See our completed navigation finder implementation:

- **Pattern analysis:** `docs/NAV-PATTERNS.md`
- **Implementation summary:** `docs/NAV-FINDER-SUMMARY.md`
- **Finder code:** `src/core/find-navigation.ts`
- **Test suite:** `utilities/test-nav-finder.ts`
- **HTML capture utility:** `utilities/capture-page-html.ts`

**Success rate:** 90% (9/10 sites detected correctly on desktop)

**Key innovations:**

- Visibility-aware link counting (ignores hidden mega menu items)
- Utility link detection (filters out cart/account/search)
- Position-based scoring (top of page = higher score)
- Class keyword scoring (positive/negative patterns)

This serves as the **reference implementation** for the process outlined in this document.

---

## Real-World Example: Footer Finder

See our completed footer finder implementation:

- **Implementation summary:** `docs/FOOTER-FINDER-SUMMARY.md`
- **Finder code:** `src/core/find-footer.ts`
- **Test suite:** `utilities/test-footer-finder.ts`
- **HTML capture utility:** `utilities/capture-page-html.ts`

**Success rate:** 100% (2/2 tested: Harris Farm, Koala; expected 90%+ overall)

**Key innovations:**

- Semantic `<footer>` tag as primary strategy (very reliable)
- Content validation (copyright, policy links) prevents false positives
- Position checking (bottom 30% of page)
- Popup handling (auto-dismiss Klaviyo and other modals)
- Scroll-to-footer ensures lazy-loaded content is captured

**Usage in checks:**

```typescript
import { findFooter } from "../core/find-footer.js";

const footer = await findFooter(page);
if (footer) {
  // Perform footer-specific accessibility checks
  const footerLinks = await footer.locator("a").all();
  // ...
}
```

---

## Questions & Troubleshooting

### Q: What if no pattern emerges across all 10 sites?

**A:** Look for **majority patterns** (7/10+) and provide fallbacks for outliers. Document the outliers as edge cases.

### Q: What if scoring produces ties or low-confidence winners?

**A:** Add more signals, increase weight differences, or add a tiebreaker (e.g., "first in DOM order" or "closest to bottom").

### Q: Should we support sites that don't use the component at all?

**A:** Yes — return `null` gracefully and document that the component is optional. Don't throw errors.

### Q: How often should we re-test the reference sites?

**A:** Quarterly, or whenever major Shopify theme updates roll out. Sites can change their structure.

### Q: Can we add more reference sites?

**A:** Yes! Expand the list when you encounter edge cases in the wild. Keep geographic diversity (AU/US/UK).

### Q: What if a site has multiple instances of the component?

**A:** Use scoring to identify the "primary" instance, or return multiple candidates if appropriate for the use case.

---

## Workflow Checklist

When implementing detection for a new component:

- [ ] Define component characteristics (Phase 1)
- [ ] Create capture utility (Phase 2.1)
- [ ] Capture HTML from all 10 reference sites (Phase 2.2)
- [ ] Analyze patterns and document findings (Phase 3)
- [ ] Create scoring-based finder (Phase 4)
- [ ] Build test suite (Phase 5)
- [ ] Run tests and validate visually (Phase 5)
- [ ] Document results and learnings (Phase 6.1)
- [ ] Update main docs (Phase 6.2)
- [ ] Iterate on failures until 80%+ success (Phase 6.3)
- [ ] Commit with clear message: `feat(detect): add {component} finder [tested: X/10]`

---

**Version:** 1.0  
**Last Updated:** November 2025  
**Maintained By:** Shopify A11y Audit Team
