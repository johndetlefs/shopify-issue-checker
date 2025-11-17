import { Page, Locator } from "@playwright/test";
import { AnnotationConfig, defaultAnnotationConfig } from "./annotation-styles";

/**
 * Options for annotating an element in a screenshot
 */
export interface AnnotateElementOptions {
  /**
   * Optional container locator to scope the search.
   * If provided, selector will be searched within this locator.
   */
  containerLocator?: Locator;

  /**
   * CSS selector to find the element(s) to annotate.
   * Combined with filter function if provided.
   */
  selector: string;

  /**
   * Text to display in the annotation label.
   * Can be a static string or a function that receives the element
   * and returns a string (useful for dynamic labels like dimensions).
   */
  labelText: string | ((element: Element) => string);

  /**
   * Type identifier for this annotation (e.g., 'focus-indicator', 'missing-alt')
   * Used for data attributes and debugging
   */
  annotationType: string;

  /**
   * Optional filter function to select which element to annotate.
   * Receives an element and should return true to annotate it.
   * If not provided, the first matching visible element is annotated.
   */
  filter?: (element: Element, context?: any) => boolean;

  /**
   * Optional serializable context passed to the filter function inside the page.
   * Useful for matching dynamic text without relying on closures (which break
   * when the function is stringified for evaluation).
   */
  filterContext?: any;

  /**
   * Optional custom annotation configuration to override defaults
   */
  customConfig?: Partial<AnnotationConfig>;

  /**
   * Optional delay in ms to wait after adding annotation before screenshot.
   * Defaults to 1500ms.
   */
  waitAfterAnnotation?: number;
}

/**
 * Result of an annotation operation
 */
export interface AnnotationResult {
  /**
   * Screenshot buffer captured with the annotation
   */
  screenshotBuffer: Buffer;

  /**
   * Information about the annotated element
   */
  elementInfo: {
    tag: string;
    text?: string;
    src?: string;
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

/**
 * Remove any existing annotation overlays/labels and marked flags from the page
 * This ensures screenshots for different issues don't include stale annotations.
 */
export async function clearAnnotations(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      // Remove any annotation elements added to the document
      const annots = Array.from(document.querySelectorAll("[data-a11y-annot]"));
      annots.forEach((el) => el.remove());

      // Clean up any elements that were marked as annotated
      const marked = Array.from(
        document.querySelectorAll("[data-a11y-marked]")
      );
      marked.forEach((el: any) => {
        if (el.__annotationOverlay) {
          try {
            el.__annotationOverlay.remove();
          } catch (e) {
            // ignore
          }
          try {
            delete el.__annotationOverlay;
          } catch (e) {}
        }
        if (el.__annotationLabel) {
          try {
            el.__annotationLabel.remove();
          } catch (e) {}
          try {
            delete el.__annotationLabel;
          } catch (e) {}
        }
        try {
          delete el.__a11yMarked;
        } catch (e) {}
        el.removeAttribute("data-a11y-marked");
      });
    } catch (err) {
      // If anything goes wrong, don't let it break the audit flow
      // We'll log at the caller level if needed
    }
  });
}

/**
 * Annotate an element and capture a screenshot.
 *
 * This is the primary helper for creating annotated screenshots in issue checks.
 * It handles:
 * - Finding the target element
 * - Clearing any previous annotations
 * - Creating overlay and label with centralized styles
 * - Capturing the screenshot
 * - Cleaning up annotations
 *
 * @param page The Playwright page
 * @param options Configuration for the annotation
 * @returns Screenshot buffer and element info, or null if element not found
 *
 * @example
 * ```typescript
 * const result = await annotateElement(page, {
 *   containerLocator: nav,
 *   selector: 'a, button',
 *   labelText: '⚠️ No visible focus indicator',
 *   annotationType: 'focus-indicator',
 *   filter: (el) => {
 *     const styles = window.getComputedStyle(el);
 *     return styles.outline === 'none';
 *   }
 * });
 *
 * if (result) {
 *   issues.push({
 *     ...issueData,
 *     screenshot: 'screenshot.png',
 *     rawData: { screenshotBuffer: result.screenshotBuffer }
 *   });
 * }
 * ```
 */
export async function annotateElement(
  page: Page,
  options: AnnotateElementOptions
): Promise<AnnotationResult | null> {
  const {
    containerLocator,
    selector,
    labelText,
    annotationType,
    filter,
    filterContext,
    customConfig,
    waitAfterAnnotation = 1500,
  } = options;

  // Clear any previous annotations
  await clearAnnotations(page);

  // Merge custom config with defaults
  const config = customConfig
    ? { ...defaultAnnotationConfig, ...customConfig }
    : defaultAnnotationConfig;

  // Find and annotate the element
  const locatorToUse = containerLocator || page.locator("body");

  const annotationResult: {
    error?: string;
    success?: boolean;
    elementInfo?: any;
  } = await locatorToUse.evaluate(
    (container, params) => {
      const {
        selector,
        labelText,
        labelTextFn,
        annotationType,
        config,
        filterFn,
        filterContext,
      } = params;

      // Find all matching elements
      const elements = Array.from(container.querySelectorAll(selector));

      // Apply custom filter if provided
      let targetElement: Element | undefined;
      if (filterFn) {
        // Deserialize and execute the filter function with optional context
        const filterFunc = new Function(
          "element",
          "context",
          `return (${filterFn})(element, context);`
        );
        targetElement = elements.find((el) => {
          try {
            return filterFunc(el, filterContext);
          } catch (err) {
            console.warn(
              "Annotation filter function threw an error, skipping element",
              err
            );
            return false;
          }
        });
      } else {
        // Default: find first visible element
        targetElement = elements.find((el) => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            styles.display !== "none" &&
            styles.visibility !== "hidden" &&
            parseFloat(styles.opacity || "1") > 0
          );
        });
      }

      if (!targetElement) {
        return { error: "No matching element found" };
      }

      const rect = targetElement.getBoundingClientRect();

      // Determine label text (static or computed from element)
      let finalLabelText: string;
      if (labelTextFn) {
        const labelFunc = new Function("element", "return " + labelTextFn)();
        finalLabelText = labelFunc(targetElement);
      } else {
        finalLabelText = labelText;
      }

      // Create overlay
      const overlay = document.createElement("div");
      overlay.setAttribute("data-a11y-annot", "true");
      overlay.setAttribute("data-a11y-annot-type", annotationType);

      const padding = config.spacing.overlayPadding;
      overlay.style.cssText = `
        position: fixed;
        left: ${rect.left - padding}px;
        top: ${rect.top - padding}px;
        width: ${rect.width + padding * 2}px;
        height: ${rect.height + padding * 2}px;
        border: ${config.overlay.borderWidth} ${config.overlay.borderStyle} ${
        config.overlay.borderColor
      };
        background-color: ${config.overlay.backgroundColor};
        z-index: ${config.overlay.zIndex};
        pointer-events: none;
        box-sizing: border-box;
      `;
      document.body.appendChild(overlay);

      // Create label
      const label = document.createElement("div");
      label.setAttribute("data-a11y-annot", "true");
      label.setAttribute("data-a11y-annot-type", annotationType);
      label.textContent = finalLabelText;
      label.style.cssText = `
        position: fixed;
        background: ${config.label.backgroundColor};
        color: ${config.label.color};
        padding: ${config.label.padding};
        border-radius: ${config.label.borderRadius};
        font-family: ${config.label.fontFamily};
        font-size: ${config.label.fontSize};
        font-weight: ${config.label.fontWeight};
        z-index: ${config.label.zIndex};
        pointer-events: none;
        box-shadow: ${config.label.boxShadow};
      `;

      // Position label
      const { labelGap, labelMinHeight } = config.spacing;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow >= labelMinHeight + labelGap) {
        label.style.top = `${rect.bottom + labelGap}px`;
        label.style.left = `${Math.max(10, rect.left)}px`;
      } else if (spaceAbove >= labelMinHeight + labelGap) {
        label.style.top = `${Math.max(
          10,
          rect.top - labelMinHeight - labelGap
        )}px`;
        label.style.left = `${Math.max(10, rect.left)}px`;
      } else {
        label.style.top = `${rect.top}px`;
        label.style.left = `${rect.left + 20}px`;
      }

      document.body.appendChild(label);

      // Mark the element
      (targetElement as any).__annotationOverlay = overlay;
      (targetElement as any).__annotationLabel = label;
      (targetElement as any).__a11yMarked = true;
      try {
        (targetElement as HTMLElement).setAttribute("data-a11y-marked", "true");
      } catch (e) {}

      // Scroll element into view so it's visible in screenshot
      targetElement.scrollIntoView({ behavior: "instant", block: "center" });

      // Wait a moment for scroll to complete, then update positions
      return new Promise((resolve) => {
        setTimeout(() => {
          // Recalculate rect after scroll
          const newRect = targetElement.getBoundingClientRect();

          // Update overlay position
          overlay.style.left = `${newRect.left - padding}px`;
          overlay.style.top = `${newRect.top - padding}px`;
          overlay.style.width = `${newRect.width + padding * 2}px`;
          overlay.style.height = `${newRect.height + padding * 2}px`;

          // Update label position
          const spaceBelow = window.innerHeight - newRect.bottom;
          const spaceAbove = newRect.top;

          if (spaceBelow >= labelMinHeight + labelGap) {
            label.style.top = `${newRect.bottom + labelGap}px`;
            label.style.left = `${Math.max(10, newRect.left)}px`;
          } else if (spaceAbove >= labelMinHeight + labelGap) {
            label.style.top = `${Math.max(
              10,
              newRect.top - labelMinHeight - labelGap
            )}px`;
            label.style.left = `${Math.max(10, newRect.left)}px`;
          } else {
            label.style.top = `${newRect.top}px`;
            label.style.left = `${newRect.left + 20}px`;
          }

          resolve({
            success: true,
            elementInfo: {
              tag: targetElement.tagName,
              text: (targetElement as HTMLElement).innerText?.substring(0, 50),
              src: (targetElement as HTMLImageElement).src?.substring(0, 100),
              rect: {
                x: newRect.left,
                y: newRect.top,
                width: newRect.width,
                height: newRect.height,
              },
            },
          });
        }, 300);
      });
    },
    {
      selector,
      labelText: typeof labelText === "string" ? labelText : "",
      labelTextFn:
        typeof labelText === "function" ? labelText.toString() : undefined,
      annotationType,
      config,
      filterFn: filter ? filter.toString() : undefined,
      filterContext,
    }
  );

  if (!annotationResult || annotationResult.error) {
    await clearAnnotations(page);
    return null;
  }

  if (!annotationResult.elementInfo) {
    await clearAnnotations(page);
    return null;
  }

  // Wait for annotation to render (but reduce wait time to minimize chance of page auto-scrolling)
  await page.waitForTimeout(500);

  // Re-scroll to element right before screenshot (in case page JS scrolled us away)
  await page.evaluate(() => {
    const marked = document.querySelector('[data-a11y-marked="true"]');
    if (marked) {
      marked.scrollIntoView({ behavior: "instant", block: "center" });
    }
  });

  // Minimal wait for scroll, then capture immediately
  await page.waitForTimeout(50);

  // Capture screenshot
  const screenshotBuffer = await page.screenshot({ fullPage: false });

  // Clean up
  await clearAnnotations(page);

  return {
    screenshotBuffer,
    elementInfo: annotationResult.elementInfo,
  };
}
