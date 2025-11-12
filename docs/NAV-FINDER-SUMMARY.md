# Navigation Finder - Implementation Summary

## Problem Solved

Successfully created a smart navigation finder that can identify the main navigation across diverse Shopify sites with different HTML structures.

## Approach Taken

### Phase 1: Research (Manual Analysis)

- Captured raw HTML from 5 different Shopify sites
- Analyzed actual navigation structures without assumptions
- Documented patterns in `NAV-PATTERNS.md`

### Phase 2: Pattern Analysis

Key findings:

- Sites use 0-7 `<nav>` elements
- Multiple nav types: utility, mobile, main, footer
- Main nav has 5-15 **visible** top-level links
- Main nav links go to `/collections/`, `/products/`
- Utility links go to `/account`, `/cart`, `/search`

### Phase 3: Heuristic Scoring System

Created `src/core/find-navigation.ts` with scoring algorithm:

**Positive Signals:**

- +10: Inside `<header>` element
- +10: ARIA label contains "main" or "primary"
- +10: Class indicates main nav (`header__inline-menu`, `main-menu`, etc.)
- +10: Ideal link count (7-12 visible links)
- +10: Has category links (`/collections/`, `/products/`)
- +10: Majority of links are category links (>50%)
- +5: Visible in top 200px of page
- +5: Optimal link count (5-20)

**Negative Signals:**

- -15: Class suggests not main nav (`mobile`, `drawer`, `utility`, `footer`, `announcement`)
- -15: Too many links (>50)
- -15: Too few links (<3)
- -20: All links are utility links

**Critical Fix:**
Only counts **currently visible** links, ignoring hidden dropdown/submenu items. This prevents mega menus with 100+ hidden links from being penalized.

### Phase 4: Multi-Strategy Implementation

The finder tries strategies in order:

1. **Known class patterns** - Fast path for common Shopify themes
2. **Scoring system** - Evaluates all nav candidates, picks highest score
3. **ARIA fallback** - Uses semantic ARIA labels if scoring inconclusive
4. **Header fallback** - Any visible nav in header as last resort

## Test Results (Desktop Viewport 1920x1080)

| Site                | Main Nav Found             | Link Count   | Score | Status                 |
| ------------------- | -------------------------- | ------------ | ----- | ---------------------- |
| **Harris Farm**     | `.sidemenu`                | 7            | —     | ✅ Correct             |
| **Koala**           | `.header__inline-menu`     | 57           | —     | ✅ Correct             |
| **Strand Bags**     | `<nav>` (no class)         | 8            | 35    | ✅ Correct             |
| **Universal Store** | `.menu-logo-container`     | 285          | —     | ⚠️ May need refinement |
| **Camilla**         | `[aria-label="Main menu"]` | 10 (visible) | 40    | ✅ Correct             |

## Files Created/Modified

### New Files:

- `src/core/find-navigation.ts` - Smart navigation finder with scoring
- `NAV-PATTERNS.md` - Pattern analysis documentation
- `test-nav-finder.ts` - Test harness
- `capture-nav-html.ts` - HTML capture utility
- `extract-nav-structures.ts` - Structure analyzer

### Modified Files:

- `src/checks/mega-menu.ts` - Now uses `findMainNavigation()` instead of simple selector

## Usage

```typescript
import { findMainNavigation } from "./src/core/find-navigation";

const nav = await findMainNavigation(page);
if (nav) {
  // Run checks on the main navigation
  const links = await nav.locator("a:visible").all();
  // ...
}
```

## Next Steps

1. ✅ Update `mega-menu.ts` to use the new finder
2. ⚠️ Test on more sites to refine scoring
3. ⚠️ Handle edge cases (Universal Store still finding too many links)
4. ⚠️ Consider adding pattern for non-`<nav>` structures (Harris Farm uses divs)

## Key Learnings

1. **Never assume semantic HTML** - Many sites don't use `<nav>` elements
2. **Count only visible links** - Mega menus hide hundreds of dropdown items
3. **Multiple strategies needed** - No single selector works across all sites
4. **Scoring beats heuristics** - Flexible scoring adapts to different structures
5. **Test with desktop viewport** - Mobile menus dominate on small screens
