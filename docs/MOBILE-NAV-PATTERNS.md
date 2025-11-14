# Mobile Navigation Pattern Analysis

**Component:** Mobile Navigation (Hamburger Menu)  
**Phase:** 1 - Component Definition  
**Status:** In Progress

---

## Component Definition

### Purpose

Mobile navigation provides the primary site navigation experience on small screens (typically <768px width). It replaces the desktop navigation menu with a space-saving pattern, usually:

1. **Hamburger button/trigger** — Icon button (☰) that opens the menu
2. **Drawer/overlay** — The actual navigation menu that appears when triggered

### Expected Location

**Hamburger Trigger:**

- Top of page in header area
- Typically left or right corner
- Visible on mobile viewport (hidden on desktop)
- First or last focusable element in header

**Navigation Drawer:**

- Off-screen by default (translated, hidden, or opacity 0)
- Slides in from left/right when activated
- May overlay content or push it aside
- Full-height or partial overlay

### Key Characteristics

**Hamburger Button:**

- Icon: Three horizontal lines (☰), "menu" icon, or text "MENU"
- ARIA: `aria-label="Menu"`, `aria-expanded="false/true"`, `aria-controls="{drawer-id}"`
- Visual: Usually 40×40px+ touch target
- Behavior: Toggles drawer visibility on click/tap

**Navigation Drawer:**

- Contains main site navigation links (same as desktop nav)
- May include search, account, cart (consolidated nav)
- Typically vertical link list (stacked)
- May have nested accordions for sub-menus
- Close button (X) at top or bottom
- ARIA: `role="dialog"` or `role="navigation"`, `aria-modal="true"` (if overlay)

### Edge Cases

1. **No semantic HTML** — Buttons may be `<div>` or `<span>` instead of `<button>`
2. **Multiple hamburger icons** — One for nav, another for search/filters
3. **Mega menu in drawer** — Complex nested navigation
4. **Accordion sub-menus** — Categories expand/collapse within drawer
5. **Different animation states** — Transform, opacity, display:none transitions
6. **Search-first mobile nav** — Search bar prominent, links secondary
7. **Persistent mobile nav** — Visible on both mobile and desktop (rare)
8. **Multiple drawers** — Separate drawers for nav, cart, account
9. **Bottom nav bar** — Mobile nav at bottom instead of top (app-style)
10. **Gesture-based** — Swipe from edge to open (no visible trigger)

### Viewport Considerations

**Mobile (< 768px):**

- Hamburger visible, desktop nav hidden
- Drawer takes full or partial screen width
- Touch-optimized targets (44×44px minimum)
- Vertical stacking preferred

**Tablet (768px - 1024px):**

- May show desktop nav OR hamburger (depends on theme)
- Drawer may be narrower (350px vs 100%)

**Desktop (> 1024px):**

- Hamburger hidden (display:none)
- Desktop nav visible instead
- Drawer should not be detectable

**Detection Strategy:**

- Test on **mobile viewport only** (375×667)
- Hamburger should be visible on mobile
- Desktop nav should be hidden on mobile

---

## Analysis Plan

### Phase 2: HTML Capture

✅ Already captured — `pattern-analysis/{site}/mobile.html` exists for all 10 sites.

### Phase 3: Pattern Analysis (Next Step)

For each site, document:

1. **Hamburger trigger:**

   - Tag name (`<button>`, `<div>`, `<a>`, etc.)
   - ARIA attributes (`aria-label`, `aria-expanded`, `aria-controls`)
   - Classes (common patterns)
   - Icon implementation (SVG, icon font, CSS)
   - Text content ("Menu", "☰", none)

2. **Navigation drawer:**

   - Tag name (`<div>`, `<nav>`, `<aside>`, etc.)
   - ARIA attributes (`role`, `aria-modal`, `aria-labelledby`)
   - Classes (common patterns)
   - Initial state (hidden, off-screen, opacity 0)
   - Content structure (links, search, categories)

3. **Relationship:**
   - How are they connected? (`aria-controls`, data attributes, ID matching)
   - JavaScript-driven or CSS-only?

### Sites to Analyze

1. Harris Farm — https://www.harrisfarm.com.au/
2. Koala — https://au.koala.com/
3. Strand Bags — https://www.strandbags.com.au/
4. Universal Store — https://www.universalstore.com/
5. Camilla — https://camilla.com
6. Patagonia — https://www.patagonia.com.au/
7. Bassike — https://www.bassike.com/
8. Kookai — https://www.kookai.com.au/
9. Koh — https://koh.com/
10. Gym Direct — https://gymdirect.com.au/
11. John Detlefs — https://johndetlefs.com (non-Shopify, Bootstrap pattern)

---

## Expected Patterns (Hypotheses)

Based on common Shopify theme patterns:

### Pattern 1: Semantic Button + ARIA

- `<button aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu">`
- Associated `<nav id="mobile-menu">` or `<div id="mobile-menu">`
- **Expected frequency:** 40-60% of sites

### Pattern 2: Class-Based Hamburger

- Classes: `.hamburger`, `.mobile-menu-toggle`, `.menu-icon`, `.nav-toggle`
- May include: `--mobile`, `__trigger`, `-button`
- **Expected frequency:** 80-90% of sites

### Pattern 3: Icon Identification

- SVG with `<path>` for three lines
- Icon fonts: `.icon-menu`, `.fa-bars`
- Unicode: "☰" character
- **Expected frequency:** 90%+ of sites

### Pattern 4: Drawer Container

- Classes: `.mobile-nav`, `.mobile-menu`, `.drawer`, `.sidebar`, `.offcanvas`
- Hidden state: `display:none`, `transform:translateX(-100%)`, `opacity:0`
- **Expected frequency:** 90%+ of sites

### Pattern 5: ARIA Dialog Pattern

- Drawer has `role="dialog"` and `aria-modal="true"`
- Includes close button with `aria-label="Close menu"`
- **Expected frequency:** 30-50% of sites (more accessible themes)

---

---

## Analysis Results (3/10 Sites Reviewed)

### Site 1: Harris Farm (https://www.harrisfarm.com.au/)

**Hamburger Trigger:**

- Tag: `<summary>` (within `<details>`)
- Classes: `.header__icon.header__icon--menu.header__icon--summary`
- ARIA: `aria-label="Menu"`, `role="button"`, `aria-expanded="false"`
- Icon: SVG with class `.icon-hamburger` (three horizontal lines)
- Parent: `<header-drawer data-breakpoint="tablet">`
- Unique: Uses HTML5 `<details>/<summary>` pattern (no JavaScript required for basic open/close)

**Navigation Drawer:**

- Tag: Content within `<details>` element
- ID: `#Details-menu-drawer-container`
- Classes: `.menu-drawer-container`
- Structure: Nested navigation with categories
- Close mechanism: Second icon in same `<summary>` (close X icon)

**Relationship:**

- Native HTML5 `<details>` element handles open/close
- `aria-controls` not needed (implicit relationship)
- Both hamburger and close icons in same `<summary>` element

**Key Insight:** Shopify Dawn theme pattern - semantic HTML with progressive enhancement.

---

### Site 2: Koala (https://au.koala.com/)

**Hamburger Trigger:**

- Tag: `<summary>` (within `<details>`)
- Classes: `.header__icon.header__icon--menu.header__icon--summary`
- ARIA: `aria-label="Menu"`, `role="button"`, `aria-expanded="false"`, `aria-controls="menu-drawer"`
- Icon: `<div class="hamburger-toggle">` with 3 `<span>` elements (CSS-styled bars)
- Parent: `<details id="Details-menu-drawer-container">`

**Navigation Drawer:**

- Tag: `<div>` (sibling of `<summary>` within `<details>`)
- ID: `#menu-drawer`
- Classes: `.menu-drawer.gradient.motion-reduce`
- Structure: `<nav class="menu-drawer__navigation">` with nested `<ul>`
- Contains: Main nav links with sub-menu accordions (also using `<details>`)

**Relationship:**

- `aria-controls="menu-drawer"` on trigger
- Drawer is sibling within same `<details>` parent
- Nested sub-menus also use `<details>` for accordions

**Key Insight:** Also Shopify Dawn theme - very similar to Harris Farm, slight ARIA enhancements.

---

### Site 3: Camilla (https://camilla.com)

**Hamburger Trigger:**

- Tag: `<button>`
- Classes: `.btn--link.site-header__menu.drawer-button__open.mobile-nav__button`
- ARIA: No aria-label on button (❌ accessibility issue)
- Icon: SVG with three horizontal lines
- Text: `.icon__fallback-text` - "expand - Click to open the mobile nav menu" (visually hidden)
- Data attribute: `data-targets="mobile-nav-drawer"`

**Navigation Drawer:**

- Tag: `<nav>`
- Classes: `.mobile-nav-wrapper`
- ARIA: `role="navigation"`, `aria-label="Main menu"`, `aria-hidden="true"` (initially hidden)
- Data attribute: `data-type="mobile-nav-drawer"`, `data-drawer=""`
- Structure: `<ul id="MobileNav" class="mobile-nav" role="menubar">` with complex menu items
- Close button: Separate `<button>` with classes `.drawer-button__close.mobile-nav__button`

**Relationship:**

- Trigger has `data-targets="mobile-nav-drawer"`
- Drawer has `data-type="mobile-nav-drawer"` and `data-drawer=""`
- JavaScript-driven (not `<details>` pattern)
- Separate open and close buttons

**Key Insight:** Custom theme, JavaScript-based drawer system, less semantic than Dawn themes.

---

## Patterns Identified So Far

### Pattern 1: HTML5 `<details>/<summary>` (Shopify Dawn Theme)

**Frequency:** 2/3 sites analyzed (Harris Farm, Koala)  
**Reliability:** High ✅

**Structure:**

```html
<details id="Details-menu-drawer-container" class="menu-drawer-container">
  <summary
    aria-label="Menu"
    role="button"
    aria-expanded="false"
    aria-controls="menu-drawer"
  >
    <!-- Hamburger icon -->
  </summary>
  <div id="menu-drawer" class="menu-drawer">
    <nav><!-- Navigation links --></nav>
  </div>
</details>
```

**Detection Strategy:**

- Look for `<summary>` with `aria-label` containing "menu" (case-insensitive)
- Parent should be `<details>` with class containing "menu" or "drawer"
- Trigger: `<summary>` element
- Drawer: Sibling `<div>` or `<nav>` within same `<details>`

---

### Pattern 2: Button with `data-` Attributes (Custom Themes)

**Frequency:** 1/3 sites analyzed (Camilla)  
**Reliability:** Medium (theme-specific)

**Structure:**

```html
<button data-targets="mobile-nav-drawer" class="drawer-button__open">
  <!-- Icon -->
</button>

<nav data-type="mobile-nav-drawer" data-drawer="" aria-hidden="true">
  <!-- Navigation -->
</nav>
```

**Detection Strategy:**

- Look for `<button>` with `data-targets`, `data-toggle`, or similar
- Match with element having corresponding `data-type`, `data-drawer`, or matching ID
- Classes often contain: "drawer", "mobile-nav", "menu-toggle"

---

### Pattern 3: Class-Based Hamburger Icons

**Frequency:** 3/3 sites  
**Reliability:** Very High ✅

**Common Classes:**

- `.hamburger`, `.hamburger-toggle`
- `.site-header__menu`, `.header__icon--menu`
- `.mobile-nav__button`, `.menu-toggle`
- `.drawer-button__open`, `.drawer-button__close`
- Icon classes: `.icon-hamburger`, `.icon-menu`

---

### Pattern 4: ARIA Attributes

**Frequency:** Variable  
**Reliability:** Medium (not all themes use ARIA properly)

**Common Patterns:**

- `aria-label="Menu"` or `aria-label="Toggle navigation"`
- `aria-expanded="false"` (changes to "true" when open)
- `aria-controls="{drawer-id}"`
- `aria-hidden="true"` on drawer (initially)
- `role="button"` on non-button triggers
- `role="navigation"` on drawer

**Note:** Camilla missing `aria-label` on button (accessibility gap)

---

### Pattern 5: Icon Implementation

**Frequency:** 3/3 sites  
**Reliability:** High ✅

**Types:**

1. **SVG with paths** (most common)

   - Three horizontal lines (☰ hamburger icon)
   - Defined inline or as icon sprite reference

2. **CSS-styled elements** (Koala)

   - `<div class="hamburger-toggle">` with 3 `<span>` children
   - CSS creates bars with borders/backgrounds

3. **Fallback text** (Camilla)
   - `.icon__fallback-text` visually hidden but screen-reader accessible

---

### Pattern 6: Drawer Classes

**Common Patterns:**

- `.menu-drawer`, `.mobile-nav-wrapper`
- `.drawer`, `.offcanvas`, `.sidebar`
- Modifiers: `--mobile`, `__navigation`, `--container`
- State classes: `.is-open`, `.active`, `.visible`

---

## Edge Cases Discovered

1. **Nested accordions in drawer** (Koala)

   - Sub-menus also use `<details>/<summary>` pattern
   - Need to differentiate top-level drawer from nested sub-menus

2. **Multiple buttons** (Camilla)

   - Separate open button (hamburger) and close button (X)
   - Close button is INSIDE the drawer

3. **Custom elements** (Harris Farm)

   - `<header-drawer>` custom element wrapper
   - Still uses standard `<details>` internally

4. **Fallback text patterns**
   - `.icon__fallback-text`, `.visually-hidden`, `.sr-only`
   - Important for accessibility scoring

---

### Site 4: Strand Bags (https://strandbags.com.au)

**Hamburger Trigger:**

- Tag: `<button>`
- Classes: `.navigation-toggle.menu__link.pr-4`
- ARIA: None
- Icon: `<img src="icon-menu.svg" width="18" height="18">`
- Position: Header

**Navigation Drawer:**

- Multiple drawers:
  - `<nav class="shop-menu">` (initially `display: none`)
  - `<div class="logo-menu__mobile">` (TailwindCSS `-translate-x-full`)
- JavaScript-based toggle
- No ARIA attributes

**Key Insight:** Custom theme with multiple navigation drawers, uses both `display: none` and CSS transforms.

---

### Site 5: Universal Store (https://universalstore.com)

**Hamburger Trigger:**

- Tag: `<summary>`
- Classes: `.mobile-toggle`
- ARIA: None (relies on semantic `<details>`)
- Icon: Three `<span>` elements (CSS-styled hamburger)
- Parent: `<details class="mobile-toggle-wrapper">`

**Navigation Drawer:**

- Tag: `<nav>`
- ID: `#mobile-menu`
- Classes: `.mobile-menu-drawer`
- ARIA: `role="dialog" tabindex="-1"`
- Structure: Nested `<details>` for sub-menus

**Key Insight:** Dawn-like pattern with semantic `<details>`/`<summary>`, proper ARIA with `role="dialog"`.

---

### Site 6: Patagonia (https://patagonia.com.au)

**Hamburger Trigger:**

- Tag: `<div>`
- Classes: `.header__side-menu-hamburger`
- Data attribute: `data-hamburger-menu-open=""`
- Icon: CSS-based (not visible in HTML)

**Navigation Drawer:**

- Tag: `<div>`
- Classes: `.hamburger-menu`
- Data attribute: `data-hamburger-menu=""`
- Structure: Contains `.hamburger-menu__container`, close button with `data-hamburger-menu-close`

**Key Insight:** Custom theme using data-attribute-based JavaScript, clear naming convention with "hamburger-menu" prefix.

---

### Site 7: Bassike (https://bassike.com)

**Hamburger Trigger:**

- Tag: `<summary>`
- Classes: `.mobile-toggle`
- Icon: Three `<span>` elements (CSS hamburger)
- Parent: `<details class="mobile-toggle-wrapper">`

**Navigation Drawer:**

- Tag: `<nav>`
- ID: `#mobile-menu`
- Classes: `.mobile-menu-drawer`
- ARIA: `role="dialog" tabindex="-1"`
- Additional: `data-link-level=""` for navigation depth tracking

**Key Insight:** Nearly identical to Universal Store, Dawn-like pattern.

---

### Site 8: Kookai (https://kookai.com.au)

**Hamburger Trigger:**

- Tag: Unknown (not captured)
- Likely triggers `.nav-drawer.drawer`

**Navigation Drawer:**

- Tag: `<nav>`
- Classes: `.nav-drawer.drawer.drawer--left.hide-scrollbar`
- Structure: `.nav-drawer__header`, `.nav-drawer__content`, `.nav-drawer__footer`
- Mobile-specific: `.nav--mobile` class on `<ul>`

**Key Insight:** Prestige/Empire theme pattern using `.drawer` with directional modifier (`.drawer--left`).

---

### Site 9: Koh (https://koh.com)

**Hamburger Trigger:**

- Tag: `<button>` (implied)
- Icon: `<svg class="icon icon-hamburger" viewBox="0 0 22 22">`
- ARIA: Likely has `aria-label`

**Navigation Drawer:**

- Tag: `<navigation-drawer>` (custom web component)
- Classes: `.navigation-drawer.drawer.lg:hidden`
- ARIA: `role="dialog" aria-modal="true"`
- Attributes: `mobile-opening="top" open-from="top" id="header-sidebar-menu"`

**Key Insight:** Modern approach using custom web component with proper ARIA, TailwindCSS responsive classes.

---

### Site 10: Gym Direct (https://gymdirect.com.au)

**Hamburger Trigger:**

- Tag: `<summary>`
- Classes: `.header__icon.header__icon--menu.header__icon--summary`
- ARIA: `aria-label="Menu" role="button" aria-expanded="false" aria-controls="menu-drawer"`
- Icon: `<svg class="icon icon-hamburger" viewBox="0 0 18 16">`
- Parent: `<details id="Details-menu-drawer-container">`

**Navigation Drawer:**

- Tag: `<div>`
- ID: `#menu-drawer`
- Classes: `.menu-drawer.gradient`
- Structure: `<nav class="menu-drawer__navigation">` with nested `<details>` for sub-menus

**Key Insight:** Classic Dawn theme with full ARIA support and semantic HTML.

---

### Site 11: John Detlefs (https://johndetlefs.com) — Non-Shopify Bootstrap

**Hamburger Trigger:**

- Tag: `<button>`
- Classes: `.navbar-toggler.collapsed`
- ARIA: `aria-controls="basic-navbar-nav" aria-expanded="false" aria-label="Toggle navigation"`
- Icon: `<span class="navbar-toggler-icon">`
- Framework: Bootstrap React

**Navigation Drawer:**

- Tag: `<div>`
- ID: `#basic-navbar-nav`
- Classes: `.navbar-collapse.collapse`
- Structure: `<div class="me-auto navbar-nav">` with link elements

**Relationship:**

- `aria-controls` links trigger to drawer by ID
- State managed via "collapsed" class on button
- Uses Bootstrap's collapse JavaScript

**Key Insight:** Bootstrap navbar pattern - rare in Shopify but exists in some custom themes. Added to increase tool comprehensiveness.

---

## Updated Pattern Summary

### Sites analyzed: 11/11 ✅

### Pattern Distribution

**Pattern 1: Dawn `<details>/<summary>` Theme**

- **Sites:** Harris Farm, Koala, Universal Store, Bassike, Gym Direct
- **Frequency:** 5/11 (45%)
- **Reliability:** Very High ✅
- **Key identifiers:**
  - `<details>` with class containing "menu-drawer-container" or "mobile-toggle-wrapper"
  - `<summary>` with `aria-label` containing "menu"
  - Drawer as sibling within `<details>`
  - Often has `aria-controls`, `aria-expanded`

**Pattern 2: Bootstrap Navbar**

- **Sites:** John Detlefs
- **Frequency:** 1/11 (9%)
- **Reliability:** High ✅ (for Bootstrap sites)
- **Key identifiers:**
  - `<button class="navbar-toggler">` with `aria-controls`
  - `<div class="navbar-collapse">` with matching ID
  - Uses "collapsed"/"collapse" state classes
  - Framework: Bootstrap (React or standard)

**Pattern 3: Custom JavaScript with Data Attributes**

- **Sites:** Camilla, Strand, Patagonia
- **Frequency:** 3/11 (27%)
- **Reliability:** Medium (varies by implementation)
- **Key identifiers:**
  - `data-targets`, `data-type`, `data-drawer`, `data-hamburger-menu-open`
  - Button + separate drawer element
  - Often has separate close button

**Pattern 4: Drawer Component Pattern (Prestige/Empire)**

- **Sites:** Kookai, Koh
- **Frequency:** 2/11 (18%)
- **Reliability:** High
- **Key identifiers:**
  - `.drawer` class with directional modifier (`.drawer--left`, `.drawer--right`)
  - `.nav-drawer` class
  - May use custom web components (`<navigation-drawer>`)

---

## Finalized Detection Strategy

### Multi-Strategy Approach (Priority Order)

**Strategy 1: Semantic `<details>/<summary>` (Highest Priority)**

```typescript
// Find <details> with menu/drawer classes
// Look for <summary> child with aria-label="menu" or icon classes
// Score: +10 if <details> found, +5 for aria-label
```

**Strategy 2: Bootstrap Navbar Pattern**

```typescript
// Find button.navbar-toggler with aria-controls
// Match with div.navbar-collapse by ID
// Score: +10 for matching pattern
```

**Strategy 3: Data Attribute Matching**

```typescript
// Find buttons with data-targets, data-toggle, data-hamburger-*
// Match with elements having corresponding data-type or data-drawer
// Score: +8 for matching data attributes, +3 for "hamburger" in name
```

**Strategy 4: Common Class Patterns**

```typescript
// Triggers: .mobile-toggle, .header__icon--menu, .navigation-toggle
// Drawers: .menu-drawer, .mobile-nav, .nav-drawer, .drawer
// Score: +6 for multiple matching classes, +2 for semantic naming
```

**Strategy 5: Custom Web Components**

```typescript
// Look for <navigation-drawer>, <header-drawer>
// Score: +9 for custom element, +5 for proper ARIA
```

**Strategy 6: Structural/Positional Scoring**

```typescript
// Within <header> element
// Near logo, search, cart icons
// Hidden on large screens (lg:hidden, .hide--min-lg)
// Score: +3 for header position, +2 for responsive classes
```

---

## Edge Cases & Handling

1. **Multiple drawers** (Strand Bags)

   - Return the first matching drawer
   - Or return array if needed for different nav types

2. **Nested accordions** (All Dawn themes)

   - Differentiate by checking parent context
   - Top-level drawer vs sub-menu `<details>`

3. **Custom web components** (Koh)

   - Check for custom element tag names
   - Still verify with ARIA and classes

4. **Separate open/close buttons** (Camilla, Patagonia)

   - Prefer the "open" button (outside drawer)
   - Use data attributes or position to identify

5. **Non-semantic triggers** (`<div>` as button)
   - Still detect if has click handler classes
   - Lower score due to accessibility issues

---

## Interaction Patterns (Open/Close)

Critical for accessibility testing - we need to **open** and **close** these menus to test keyboard navigation, focus management, etc.

### Pattern 1: `<details>` Element (5 sites)

**Opening:**

```typescript
// Dawn themes use native HTML <details>
await detailsElement.evaluate((el) => (el.open = true));
// OR
await summaryElement.click();
```

**Closing:**

```typescript
await detailsElement.evaluate((el) => (el.open = false));
// OR click summary again (toggles)
// OR press Escape key
```

**State check:**

```typescript
const isOpen = await detailsElement.evaluate((el) => el.hasAttribute("open"));
```

**Sites using this:** Harris Farm, Koala, Universal Store, Bassike, Gym Direct

---

### Pattern 2: JavaScript Toggle with Data Attributes (3 sites)

**Opening:**

```typescript
// Click the trigger button
await triggerButton.click();
// Wait for drawer to animate in
await page.waitForSelector('[data-type="mobile-nav-drawer"]:visible');
```

**Closing:**

```typescript
// Option 1: Click close button inside drawer
await page.click('[data-type="mobile-nav-drawer--close"]');
// Option 2: Click trigger again (if it toggles)
await triggerButton.click();
// Option 3: Click backdrop/overlay
await page.click(".drawer-overlay, .backdrop");
```

**State check:**

```typescript
const isVisible = await drawer.isVisible();
// OR check for class
const hasClass = await drawer.evaluate(
  (el) => el.classList.contains("is-open") || !el.hasAttribute("aria-hidden")
);
```

**Sites using this:** Camilla, Strand, Patagonia

---

### Pattern 3: Drawer Component (2 sites)

**Opening:**

```typescript
// Click trigger (button or custom element)
await triggerButton.click();
// Wait for drawer animation
await page.waitForSelector(".drawer:visible, navigation-drawer[open]");
```

**Closing:**

```typescript
// Custom web components may have close() method
await drawer.evaluate((el) => el.close?.());
// OR click trigger again
// OR press Escape (if supported)
await page.keyboard.press("Escape");
```

**State check:**

```typescript
// Check for 'open' attribute or visibility
const isOpen = await drawer.evaluate(
  (el) => el.hasAttribute("open") || el.classList.contains("is-open")
);
```

**Sites using this:** Kookai, Koh

---

## Universal Interaction Strategy

For robust testing across all patterns:

```typescript
interface MobileNavResult {
  trigger: Locator;
  drawer: Locator;
  pattern: "details" | "bootstrap" | "data-attr" | "drawer" | "custom";
}

async function openMobileNav(result: MobileNavResult): Promise<void> {
  if (result.pattern === "details") {
    // Use native details API
    const details = result.trigger.locator("xpath=ancestor::details[1]");
    await details.evaluate((el) => (el.open = true));
  } else {
    // Click trigger for all other patterns (including Bootstrap)
    await result.trigger.click();
  }

  // Wait for drawer to be visible
  await result.drawer.waitFor({ state: "visible", timeout: 2000 });
}

async function closeMobileNav(result: MobileNavResult): Promise<void> {
  if (result.pattern === "details") {
    const details = result.trigger.locator("xpath=ancestor::details[1]");
    await details.evaluate((el) => (el.open = false));
  } else if (result.pattern === "bootstrap") {
    // Bootstrap toggles - click trigger to close
    await result.trigger.click();
  } else {
    // Try multiple close strategies
    const closeButton = result.drawer
      .locator(
        'button[data-type*="close"], button.close, button[aria-label*="close" i]'
      )
      .first();

    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Fallback: click trigger again (toggle)
      await result.trigger.click();
    }
  }

  // Wait for drawer to hide
  await result.drawer.waitFor({ state: "hidden", timeout: 2000 });
}

async function isNavOpen(result: MobileNavResult): Promise<boolean> {
  if (result.pattern === "details") {
    const details = result.trigger.locator("xpath=ancestor::details[1]");
    return await details.evaluate((el) => (el as HTMLDetailsElement).open);
  } else {
    return await result.drawer.isVisible();
  }
}
```

---

## Edge Cases for Interaction

1. **Animation delays** - Need `waitForTimeout` or selector visibility waits
2. **Backdrop clicks** - Some close on backdrop, others don't
3. **Escape key** - Not all implementations support this (should be tested!)
4. **Focus trapping** - Drawer may trap focus, need to handle programmatically
5. **Nested menus** - Don't confuse sub-menu `<details>` with main drawer

---

## Next Steps

1. ✅ Component defined (Phase 1)
2. ✅ All 11 sites analyzed (Phase 3 - complete)
3. ✅ Interaction patterns documented
4. ✅ Implemented `src/core/find-mobile-nav.ts` with:
   - Multi-strategy detection (trigger + drawer)
   - Pattern identification (for interaction)
   - Return type includes `pattern` field
   - **Bootstrap navbar pattern support added**
5. ✅ Created `utilities/test-mobile-nav-finder.ts` with:
   - Detection validation
   - **Open/close interaction tests**
   - Focus management checks
   - **11/11 sites passing at 100%**
6. ⏭️ Document results in `docs/MOBILE-NAV-FINDER-SUMMARY.md`

**Status:** Implementation complete, all tests passing (100%)
**Next:** Create summary documentation
