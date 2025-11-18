/**
 * Form select accessibility check
 *
 * Detects unlabeled <select> elements and hidden native selects that
 * have no accessible replacement. These issues frequently block shoppers
 * from choosing size/color options, directly hurting conversion.
 */

import { Check, CheckContext, Issue } from "../types";
import { logger } from "../core/logger";
import { annotateElement } from "../core/annotation-utils";

const MARK_ATTR = "data-a11y-select-marker";
const HIGHLIGHT_ATTR = "data-a11y-select-highlight";

interface SelectIssueSummary {
  marker: string;
  highlightMarker?: string;
  name?: string | null;
  id?: string;
  outerHTML: string;
  wrapperHtml?: string | null;
  accessibleName?: string;
}

interface SelectAuditResult {
  unlabeled: SelectIssueSummary[];
  hiddenWithoutReplacement: SelectIssueSummary[];
}

async function clearTempAttributes(page: CheckContext["page"]): Promise<void> {
  await page.evaluate(
    ({ markAttr, highlightAttr }) => {
      document
        .querySelectorAll(`[${markAttr}]`)
        .forEach((el) => el.removeAttribute(markAttr));
      document
        .querySelectorAll(`[${highlightAttr}]`)
        .forEach((el) => el.removeAttribute(highlightAttr));
    },
    { markAttr: MARK_ATTR, highlightAttr: HIGHLIGHT_ATTR }
  );
}

export const selectAccessibilityCheck: Check = {
  name: "select-accessibility",

  async run(context: CheckContext): Promise<Issue[]> {
    const { page, target } = context;
    const issues: Issue[] = [];

    let audit: SelectAuditResult | null = null;

    try {
      audit = await page.evaluate(
        ({ markAttr, highlightAttr }) => {
          const results: SelectAuditResult = {
            unlabeled: [],
            hiddenWithoutReplacement: [],
          };

          const isVisible = (el: Element | null): boolean => {
            if (!el) return false;
            const styles = window.getComputedStyle(el);
            return (
              styles.display !== "none" &&
              styles.visibility !== "hidden" &&
              styles.opacity !== "0" &&
              !(el as HTMLElement).hasAttribute("hidden") &&
              (el as HTMLElement).getAttribute("aria-hidden") !== "true"
            );
          };

          const getAccessibleName = (selectEl: HTMLSelectElement): string => {
            const ariaLabel = selectEl.getAttribute("aria-label")?.trim();
            if (ariaLabel) return ariaLabel;

            const labelledBy = selectEl
              .getAttribute("aria-labelledby")
              ?.split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent?.trim())
              .filter(Boolean)
              .join(" ");
            if (labelledBy) return labelledBy;

            if (selectEl.labels && selectEl.labels.length > 0) {
              const labelText = Array.from(selectEl.labels)
                .map((label) => label.textContent?.trim())
                .filter(Boolean)
                .join(" ");
              if (labelText) return labelText;
            }

            const title = selectEl.getAttribute("title")?.trim();
            if (title) return title;

            const placeholder = selectEl.getAttribute("placeholder")?.trim();
            if (placeholder) return placeholder;

            return "";
          };

          const hasAccessibleReplacement = (
            selectEl: HTMLSelectElement,
            wrapper: Element | null
          ): boolean => {
            if (!wrapper) return false;

            const visibleNativeAlternative = Array.from(
              wrapper.querySelectorAll("select")
            ).some(
              (candidate) => candidate !== selectEl && isVisible(candidate)
            );
            if (visibleNativeAlternative) {
              return true;
            }

            const replacement = wrapper.querySelector(
              '[role="combobox"], [role="listbox"], button[aria-haspopup="listbox"], button[aria-expanded][aria-controls], [aria-live][data-select], input[list]'
            );

            if (!replacement) return false;
            return isVisible(replacement);
          };

          const selects = Array.from(document.querySelectorAll("select"));

          selects.forEach((selectEl, index) => {
            const markerValue = `${index}`;
            selectEl.setAttribute(markAttr, markerValue);

            const accessibleName = getAccessibleName(selectEl);
            if (!accessibleName) {
              results.unlabeled.push({
                marker: markerValue,
                name: selectEl.getAttribute("name"),
                id: selectEl.id,
                outerHTML: selectEl.outerHTML.substring(0, 600),
              });
            }

            const styles = window.getComputedStyle(selectEl);
            const classNames = (selectEl.className || "").toLowerCase();
            const isVisuallyHidden =
              selectEl.hasAttribute("hidden") ||
              selectEl.getAttribute("aria-hidden") === "true" ||
              styles.display === "none" ||
              styles.visibility === "hidden" ||
              styles.opacity === "0" ||
              classNames.includes("visually-hidden") ||
              classNames.includes("sr-only") ||
              classNames.includes("hidden");

            if (!isVisuallyHidden) {
              return;
            }

            const wrapper =
              selectEl.closest(
                ".custom-select, .select-dropdown, .product, .product-card, form, section"
              ) || selectEl.parentElement;

            if (hasAccessibleReplacement(selectEl, wrapper)) {
              return;
            }

            let highlightMarker: string | undefined;
            if (wrapper) {
              highlightMarker = `wrap-${index}`;
              wrapper.setAttribute(highlightAttr, highlightMarker);
            }

            results.hiddenWithoutReplacement.push({
              marker: markerValue,
              highlightMarker,
              name: selectEl.getAttribute("name"),
              id: selectEl.id,
              outerHTML: selectEl.outerHTML.substring(0, 600),
              wrapperHtml: wrapper?.outerHTML.substring(0, 600) || null,
              accessibleName,
            });
          });

          return results;
        },
        { markAttr: MARK_ATTR, highlightAttr: HIGHLIGHT_ATTR }
      );
    } catch (error) {
      logger.warn("Failed to analyze select elements", error);
      await clearTempAttributes(page);
      return issues;
    }

    if (!audit) {
      await clearTempAttributes(page);
      return issues;
    }

    const unlabeledCount = audit.unlabeled.length;
    if (unlabeledCount > 0) {
      let screenshotBuffer: Buffer | undefined;
      try {
        const first = audit.unlabeled[0];
        const selector = `[${MARK_ATTR}="${first.marker}"]`;
        const annotation = await annotateElement(page, {
          selector,
          labelText: "Screen readers hear 'combo box' with no label",
          annotationType: "select-missing-label",
        });
        if (annotation) {
          screenshotBuffer = annotation.screenshotBuffer;
        }
      } catch (error) {
        logger.warn("Failed to capture screenshot for unlabeled select", error);
      }

      issues.push({
        id: `selects-missing-label-${Date.now()}`,
        title: "Product option selects missing accessible labels",
        description: `${unlabeledCount} select element${
          unlabeledCount === 1 ? "" : "s"
        } on ${
          target.label
        } have no programmatic label. Screen-reader shoppers just hear 'combo box' with no context, so they can't choose a size, color, or variant.`,
        severity: "serious",
        impact: "litigation",
        effort: "medium",
        wcagCriteria: ["1.3.1", "4.1.2"],
        path: target.url,
        pageLabel: target.label,
        screenshot: screenshotBuffer ? "screenshot.png" : undefined,
        solution:
          "Add <label for> elements, aria-label, or aria-labelledby to every <select>. If the visual design uses custom wrappers, keep the real select visible to assistive tech and sync the custom UI via JavaScript.",
        copilotPrompt: `You are fixing: Select controls missing accessible names (WCAG 1.3.1, 4.1.2)\nPage: ${
          target.label
        } (${target.url})\n\n${unlabeledCount} <select> element${
          unlabeledCount === 1 ? "" : "s"
        } render without a programmatic label. Screen readers announce “combo box” with no description, so shoppers can’t choose a size or finish.\n\nRequirements:\n1. Provide a descriptive label via <label for>, aria-label, or aria-labelledby.\n2. Keep labels visible for sighted users and programmatic for assistive tech.\n3. When using custom dropdowns, mirror the selection back to the real <select> so it stays accessible.\n\nExample fix (Liquid):\n<label class="select__label" for="ProductSelector">Choose a mattress size</label>\n<select id="ProductSelector" name="options[Size]" aria-describedby="ProductSelectorHint">\n  {% for option in product.options_by_name['Size'] %}\n    <option value="{{ option }}">{{ option }}</option>\n  {% endfor %}\n</select>\n<p id="ProductSelectorHint" class="visually-hidden">Required for checkout.</p>\n\nIf you must hide the native <select>, keep it visually hidden (not display:none) and expose a custom control with role=\"combobox\" plus aria-haspopup=\"listbox\" and aria-expanded state.`,
        rawData: {
          examples: audit.unlabeled.slice(0, 5),
          totalAffected: unlabeledCount,
          screenshotBuffer,
        },
      });
    }

    const hiddenCount = audit.hiddenWithoutReplacement.length;
    if (hiddenCount > 0) {
      let screenshotBuffer: Buffer | undefined;
      try {
        const first = audit.hiddenWithoutReplacement[0];
        const targetSelector = first.highlightMarker
          ? `[${HIGHLIGHT_ATTR}="${first.highlightMarker}"]`
          : `[${MARK_ATTR}="${first.marker}"]`;
        const annotation = await annotateElement(page, {
          selector: targetSelector,
          labelText: "Custom UI hides the real select",
          annotationType: "select-hidden-native",
        });
        if (annotation) {
          screenshotBuffer = annotation.screenshotBuffer;
        }
      } catch (error) {
        logger.warn(
          "Failed to capture screenshot for hidden select replacement",
          error
        );
      }

      issues.push({
        id: `selects-hidden-native-${Date.now()}`,
        title: "Custom dropdown hides the real form control",
        description: `${hiddenCount} select element${
          hiddenCount === 1 ? "" : "s"
        } are hidden with CSS (display:none/hidden attribute) while the replacement UI lacks combobox/listbox roles. Screen-reader shoppers can’t operate these product options, so they abandon the purchase.`,
        severity: "critical",
        impact: "conversion",
        effort: "medium",
        wcagCriteria: ["1.3.1", "4.1.2"],
        path: target.url,
        pageLabel: target.label,
        screenshot: screenshotBuffer ? "screenshot.png" : undefined,
        solution:
          'Keep the native <select> accessible (visually hidden but still focusable) or rebuild the custom dropdown with role="combobox", aria-expanded, aria-controls, and keyboard support. Never rely solely on aria-hidden selects to store the state.',
        copilotPrompt: `You are fixing: Hidden native select with no accessible replacement (WCAG 1.3.1, 4.1.2)\nPage: ${
          target.label
        } (${target.url})\n\n${hiddenCount} product option select${
          hiddenCount === 1 ? "" : "s"
        } are set to display:none/hidden while the visible buttons lack combobox/listbox roles. Screen readers have nothing to focus, so Shopify variants can’t be changed via assistive tech.\n\nRequirements:\n1. Either keep the real <select> visually hidden (e.g., .sr-only) but still focusable, or\n2. Build the custom UI as an ARIA combobox/listbox with keyboard interactions, aria-activedescendant, and aria-expanded state.\n3. Ensure every option exposes text (e.g., “Queen size”).\n4. Sync state changes back to Shopify variant JS.\n\nSuggested Liquid snippet for visually hidden select:\n<select class="sr-only" aria-label="Select mattress size">\n  {% for option in product.options_by_name['Size'] %}\n    <option value="{{ option }}">{{ option }}</option>\n  {% endfor %}\n</select>\n<button type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="SizeList">{{ current_variant.option1 }}</button>\n<ul id="SizeList" role="listbox">\n  {% for option in product.options_by_name['Size'] %}\n    <li role="option" data-value="{{ option }}">{{ option }}</li>\n  {% endfor %}\n</ul>\n\nOr keep the select visible but styled to match the design.`,
        rawData: {
          examples: audit.hiddenWithoutReplacement.slice(0, 5),
          totalAffected: hiddenCount,
          screenshotBuffer,
        },
      });
    }

    await clearTempAttributes(page);
    return issues;
  },
};
