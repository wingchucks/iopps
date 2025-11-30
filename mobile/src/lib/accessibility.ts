import { AccessibilityInfo, Platform, AccessibilityRole } from 'react-native';

/**
 * Accessibility utility functions for React Native
 */

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  return await AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Check if reduce motion is enabled
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  return await AccessibilityInfo.isReduceMotionEnabled();
}

/**
 * Announce a message to screen readers
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Create accessibility props for a button
 */
export function buttonAccessibilityProps(params: {
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return {
    accessible: true,
    accessibilityRole: 'button' as AccessibilityRole,
    accessibilityLabel: params.label,
    accessibilityHint: params.hint,
    accessibilityState: {
      disabled: params.disabled || false,
    },
  };
}

/**
 * Create accessibility props for a link
 */
export function linkAccessibilityProps(params: {
  label: string;
  hint?: string;
}) {
  return {
    accessible: true,
    accessibilityRole: 'link' as AccessibilityRole,
    accessibilityLabel: params.label,
    accessibilityHint: params.hint,
  };
}

/**
 * Create accessibility props for an image
 */
export function imageAccessibilityProps(params: {
  label: string;
  isDecorative?: boolean;
}) {
  if (params.isDecorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no' as const,
    };
  }

  return {
    accessible: true,
    accessibilityRole: 'image' as AccessibilityRole,
    accessibilityLabel: params.label,
  };
}

/**
 * Create accessibility props for a header
 */
export function headerAccessibilityProps(params: {
  label: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}) {
  return {
    accessible: true,
    accessibilityRole: 'header' as AccessibilityRole,
    accessibilityLabel: params.label,
  };
}

/**
 * Create accessibility props for a text input
 */
export function inputAccessibilityProps(params: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const label = params.required
    ? `${params.label}, required`
    : params.label;

  return {
    accessible: true,
    accessibilityLabel: params.error
      ? `${label}, error: ${params.error}`
      : label,
    accessibilityHint: params.hint,
  };
}

/**
 * Create accessibility props for a list
 */
export function listAccessibilityProps(params: {
  label: string;
  itemCount: number;
}) {
  return {
    accessible: true,
    accessibilityRole: 'list' as AccessibilityRole,
    accessibilityLabel: `${params.label}, ${params.itemCount} items`,
  };
}

/**
 * Create accessibility props for a list item
 */
export function listItemAccessibilityProps(params: {
  label: string;
  index: number;
  total: number;
  hint?: string;
}) {
  return {
    accessible: true,
    accessibilityLabel: `${params.label}, ${params.index + 1} of ${params.total}`,
    accessibilityHint: params.hint,
  };
}

/**
 * Create accessibility props for a tab
 */
export function tabAccessibilityProps(params: {
  label: string;
  selected: boolean;
  index: number;
  total: number;
}) {
  return {
    accessible: true,
    accessibilityRole: 'tab' as AccessibilityRole,
    accessibilityLabel: params.label,
    accessibilityState: {
      selected: params.selected,
    },
    accessibilityHint: `Tab ${params.index + 1} of ${params.total}`,
  };
}

/**
 * Create accessibility props for a checkbox
 */
export function checkboxAccessibilityProps(params: {
  label: string;
  checked: boolean;
  hint?: string;
}) {
  return {
    accessible: true,
    accessibilityRole: 'checkbox' as AccessibilityRole,
    accessibilityLabel: params.label,
    accessibilityState: {
      checked: params.checked,
    },
    accessibilityHint: params.hint,
  };
}

/**
 * Create accessibility props for a switch
 */
export function switchAccessibilityProps(params: {
  label: string;
  value: boolean;
  hint?: string;
}) {
  return {
    accessible: true,
    accessibilityRole: 'switch' as AccessibilityRole,
    accessibilityLabel: params.label,
    accessibilityState: {
      checked: params.value,
    },
    accessibilityHint: params.hint,
  };
}

/**
 * Create accessibility props for a loading indicator
 */
export function loadingAccessibilityProps(params: {
  label?: string;
}) {
  return {
    accessible: true,
    accessibilityRole: 'progressbar' as AccessibilityRole,
    accessibilityLabel: params.label || 'Loading',
    accessibilityState: {
      busy: true,
    },
  };
}

/**
 * Create accessibility props for an alert/notification
 */
export function alertAccessibilityProps(params: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}) {
  const typePrefix = params.type
    ? `${params.type.charAt(0).toUpperCase() + params.type.slice(1)}: `
    : '';

  return {
    accessible: true,
    accessibilityRole: 'alert' as AccessibilityRole,
    accessibilityLabel: `${typePrefix}${params.message}`,
    accessibilityLiveRegion: 'polite' as const,
  };
}

/**
 * Format a date for accessibility
 */
export function formatDateForAccessibility(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a currency value for accessibility
 */
export function formatCurrencyForAccessibility(
  value: number,
  currency: string = 'CAD'
): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Get platform-specific accessibility label
 */
export function getPlatformAccessibilityLabel(
  iosLabel: string,
  androidLabel: string
): string {
  return Platform.OS === 'ios' ? iosLabel : androidLabel;
}
