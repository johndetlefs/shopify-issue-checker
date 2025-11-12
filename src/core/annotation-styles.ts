/**
 * Centralized annotation styles for screenshot annotations
 *
 * Maintains consistency across all visual annotations in pitch pack screenshots
 */

export interface AnnotationStyles {
  overlay: string;
  label: string;
}

export interface AnnotationConfig {
  overlay: {
    borderWidth: string;
    borderStyle: string;
    borderColor: string;
    backgroundColor: string;
    zIndex: string;
    padding: string;
  };
  label: {
    backgroundColor: string;
    color: string;
    padding: string;
    borderRadius: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    zIndex: string;
    boxShadow: string;
  };
  spacing: {
    overlayPadding: number; // Extra space around element for border
    labelGap: number; // Gap between element and label
    labelMinHeight: number; // Minimum space needed for label
  };
}

/**
 * Default annotation configuration
 */
export const defaultAnnotationConfig: AnnotationConfig = {
  overlay: {
    borderWidth: "5px",
    borderStyle: "solid",
    borderColor: "red",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    zIndex: "999998",
    padding: "8px", // Space between element and border
  },
  label: {
    backgroundColor: "red",
    color: "white",
    padding: "8px 14px",
    borderRadius: "4px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: "14px",
    fontWeight: "700",
    zIndex: "999999",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  },
  spacing: {
    overlayPadding: 8,
    labelGap: 12,
    labelMinHeight: 40,
  },
};

/**
 * Generates CSS string for overlay element
 */
export function generateOverlayStyles(
  rect: { left: number; top: number; width: number; height: number },
  config: AnnotationConfig = defaultAnnotationConfig
): string {
  const padding = config.spacing.overlayPadding;
  return `
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
  `.trim();
}

/**
 * Generates CSS string for label element
 */
export function generateLabelStyles(
  config: AnnotationConfig = defaultAnnotationConfig
): string {
  return `
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
  `.trim();
}

/**
 * Calculates optimal label position (above or below element)
 */
export function calculateLabelPosition(
  elementRect: { left: number; top: number; bottom: number },
  viewportHeight: number,
  config: AnnotationConfig = defaultAnnotationConfig
): { top: string; left: string } {
  const { labelGap, labelMinHeight } = config.spacing;
  const spaceBelow = viewportHeight - elementRect.bottom;
  const spaceAbove = elementRect.top;

  if (spaceBelow >= labelMinHeight + labelGap) {
    // Place below
    return {
      top: `${elementRect.bottom + labelGap}px`,
      left: `${Math.max(10, elementRect.left)}px`,
    };
  } else if (spaceAbove >= labelMinHeight + labelGap) {
    // Place above
    return {
      top: `${Math.max(10, elementRect.top - labelMinHeight - labelGap)}px`,
      left: `${Math.max(10, elementRect.left)}px`,
    };
  } else {
    // Fallback: place to the right
    return {
      top: `${elementRect.top}px`,
      left: `${elementRect.left + 20}px`,
    };
  }
}
