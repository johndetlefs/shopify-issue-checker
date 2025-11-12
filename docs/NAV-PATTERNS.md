# Navigation Pattern Analysis

## Summary of Findings (5 Shopify Sites)

### Harris Farm (www.harrisfarm.com.au)

- **Header**: ✅ Yes (`<header>`)
- **Nav elements**: ❌ 0 `<nav>` elements
- **Structure**: Uses DIVs with class `.header.header--top-left.header--mobile-center`
- **Pattern**: **Non-semantic HTML** - no `<nav>` tags at all

### Koala (au.koala.com)

- **Header**: ✅ Yes
- **Nav elements**: ✅ 4 `<nav>` elements
  1. **Utility nav** (4 links) - `.announcement-bar__utility-links--left` - About, etc.
  2. **Utility nav** (6 links) - `.announcement-bar__utility-links--right` - FAQs, Trade, Account
  3. **Mobile menu** (57 links) - `.menu-drawer__navigation`
  4. **Main navigation** (57 links) - `.header__inline-menu` ⭐ **THIS IS THE MAIN NAV**
- **Pattern**: Multiple navs, main one has class `header__inline-menu`

### Strand Bags (www.strandbags.com.au)

- **Header**: ✅ Yes
- **Nav elements**: ✅ 7 `<nav>` elements
  1. **Utility/Meta** (5 links) - `.header__main-menu` - Store Locator, Help, Account, Cart
  2. **Mobile** (3 links) - `.main-menu-mobile` - Store Locator, Help, Wishlist
  3. **Main navigation** (8 links) - No specific class! - Handbags, Travel, Luggage ⭐
     4-7. **Footer navs** (various) - Help, About, Loyalty, Legal
- **Pattern**: Main nav has NO class, just bare `<nav>` with category links

### Universal Store (www.universalstore.com)

- **Header**: ✅ Yes
- **Nav elements**: ✅ 1 `<nav>` element
  1. **Mobile drawer** (257 links) - `.mobile-menu-drawer` - Everything in mobile menu
- **Pattern**: Only mobile nav visible, desktop nav likely in non-semantic HTML

### Camilla (camilla.com)

- **Header**: ✅ Yes
- **Nav elements**: ✅ 2 `<nav>` elements + 5 with `[role="navigation"]`
  1. **Mobile** (150 links) - `.mobile-nav-wrapper` `[aria-label="Main menu"]`
  2. **Desktop main** (175 links) - No class, `[aria-label="Main menu"]` ⭐
- **Pattern**: ARIA labels used, desktop has no class

---

## Common Patterns Identified

### 1. **Semantic vs Non-Semantic**

- ❌ Harris Farm: No `<nav>` tags at all
- ✅ Others: Use `<nav>` elements (but not consistently)

### 2. **Multiple Nav Elements**

- All sites (except Harris) have **multiple `<nav>` elements**
- Common types:
  - **Utility nav**: Account, Cart, Search, Store Locator (2-6 links)
  - **Mobile nav**: Mobile drawer/hamburger menu (many links)
  - **Main nav**: Primary category navigation (5-15 top-level links)
  - **Footer nav**: Help, Legal, etc.

### 3. **Main Nav Identifiers**

- **Link count**: 5-15 **visible** top-level links (not 50+, not 2-3)
- **Link destinations**: `/collections/`, `/products/`, category pages
- **NOT utility**: Not `/account`, `/cart`, `/search`, `/pages/help`
- **Classes** (when present):
  - `header__inline-menu` (Koala)
  - No consistent pattern across sites!
- **ARIA labels**: `aria-label="Main menu"` (Camilla)
- **Position**: Inside `<header>`, visible in viewport

### 4. **Mobile vs Desktop**

- Mobile navs often have class like:
  - `.menu-drawer__navigation`
  - `.mobile-menu-drawer`
  - `.mobile-nav-wrapper`
- Desktop navs:
  - `.header__inline-menu`
  - Or no specific class!

---

## Heuristics for Finding Main Navigation

### Priority 1: Semantic + ARIA

```
nav[aria-label*="main" i],
nav[aria-label*="primary" i]
```

### Priority 2: Header inline menus

```
header nav:not([class*="mobile"]):not([class*="drawer"]):not([class*="utility"])
```

### Priority 3: Class patterns

```
.header__inline-menu,
.main-menu:not(.main-menu-mobile),
[class*="primary-nav"],
[class*="main-nav"]
```

### Priority 4: Scoring system

For each `<nav>` or navigation-like element:

- **+10**: Inside `<header>` element
- **+10**: Has `aria-label` with "main" or "primary"
- **+10**: Class contains "header", "inline", "primary", "main"
- **+5**: In top 200px of page (visible)
- **+5**: Has 5-15 direct child links
- **-5**: Class contains "mobile", "drawer", "utility", "footer"
- **-10**: Has >50 links (likely mobile menu or footer)
- **-10**: All links are utility (/account, /cart, /search)
- **-10**: Not visible (display: none, opacity: 0)

Pick the `<nav>` with highest score.

### Fallback: No `<nav>` elements (Harris Farm case)

```
header [class*="menu"],
header [class*="nav"]:not([class*="mobile"])
```

---

## Recommended Implementation Strategy

1. **Try ARIA-labeled navs first**: `nav[aria-label*="main" i]`
2. **Try class-based selectors**: `.header__inline-menu`, etc.
3. **Fallback to scoring**: Find all `<nav>` in `<header>`, score each, pick highest
4. **Last resort**: Look for navigation-like DIVs in header with multiple links

This ensures we work even when:

- Sites use non-semantic HTML
- Multiple navs exist
- Classes are inconsistent
- Mobile/desktop navs both present
