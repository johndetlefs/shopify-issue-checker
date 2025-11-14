# Utilities — Development Tools

Development utilities for pattern analysis and testing.

---

## `capture-page-html.ts`

**Purpose:** Capture full page HTML from reference Shopify sites for pattern analysis.

**Features:**

- Captures complete page HTML (header, nav, main, footer)
- Desktop (1920×1080) and mobile (375×667) viewports
- Auto-closes popups/modals (Klaviyo, etc.)
- Scrolls to bottom to ensure all content is loaded

**Usage:**

```bash
# Capture one site
npx tsx utilities/capture-page-html.ts harris

# Capture all sites
for site in harris koala strand universal camilla patagonia bassike kookai koh gymdirect; do
  npx tsx utilities/capture-page-html.ts $site
  sleep 2
done
```

**Output:** `pattern-analysis/{site-name}/desktop.html` and `mobile.html`

**When to use:** When implementing detection for a new UI component (follow `.github/DISCOVER_COMMON_PATTERNS.md` process).

---

## `test-nav-finder.ts`

**Purpose:** Test the navigation finder across all 10 reference Shopify sites.

**Usage:**

```bash
npx tsx utilities/test-nav-finder.ts
```

**What it does:**

- Loads each reference site
- Attempts to detect main navigation
- Highlights detected navigation with red outline
- Reports success/failure rate

**Success criteria:** 80%+ detection rate (currently: 90% - 9/10 sites)

---

## `test-footer-finder.ts`

**Purpose:** Test the footer finder across all 10 reference Shopify sites.

**Usage:**

```bash
npx tsx utilities/test-footer-finder.ts
```

**What it does:**

- Loads each reference site (desktop + mobile)
- Attempts to detect site footer
- Reports tag name, role, classes, and content preview
- Calculates success rate

**Success criteria:** 80%+ detection rate (currently: 100% tested sites)

---

## Pattern Discovery Workflow

When implementing detection for a new UI component:

1. **Capture HTML** — Run `capture-page-html.ts` for all 10 sites
2. **Analyze patterns** — Review HTML in `pattern-analysis/{site}/` folders
3. **Implement finder** — Create `src/core/find-{component}.ts` with scoring-based detection
4. **Create test suite** — Create `test-{component}-finder.ts` based on existing test utilities
5. **Run tests** — Validate 80%+ success rate across diverse themes
6. **Document** — Create `docs/{COMPONENT}-FINDER-SUMMARY.md`

See `.github/DISCOVER_COMMON_PATTERNS.md` for detailed methodology.

---

## Reference Sites

Our 10 representative Shopify sites for pattern analysis:

- **harris** — https://www.harrisfarm.com.au/
- **koala** — https://au.koala.com/
- **strand** — https://www.strandbags.com.au/
- **universal** — https://www.universalstore.com/
- **camilla** — https://camilla.com
- **patagonia** — https://www.patagonia.com.au/
- **bassike** — https://www.bassike.com/
- **kookai** — https://www.kookai.com.au/
- **koh** — https://koh.com/
- **gymdirect** — https://gymdirect.com.au/

**Why these sites:**

- Mix of industries (fashion, grocery, homewares, outdoor, fitness)
- Mix of complexity (simple layouts, mega menus, accordions)
- Mix of semantic approaches (semantic HTML, ARIA, class-based)
- All real Shopify Plus or standard Shopify stores
